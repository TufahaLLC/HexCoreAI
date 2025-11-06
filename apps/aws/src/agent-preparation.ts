import https from "node:https";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  BedrockAgentClient,
  GetAgentVersionCommand,
  ListAgentVersionsCommand,
  PrepareAgentCommand,
} from "@aws-sdk/client-bedrock-agent";
import type { CloudFormationCustomResourceEvent } from "aws-lambda";

const logger = new Logger({ serviceName: "agent-preparation" });
const bedrockAgent = new BedrockAgentClient();

type AgentPreparationProperties = {
  AgentIds: string[];
};

// AWS Bedrock Agent type definitions
type AgentVersionSummary = {
  id?: string;
  status?: "PREPARING" | "PREPARED" | "FAILED" | "VERSIONING" | "NOT_PREPARED";
  agentVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  failureReasons?: string[];
};

type AgentVersion = {
  id?: string;
  status?: "PREPARING" | "PREPARED" | "FAILED" | "VERSIONING" | "NOT_PREPARED";
  agentVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
  failureReasons?: string[];
};

type ListAgentVersionsResponse = {
  agentVersionSummaries?: AgentVersionSummary[];
};

type PrepareAgentResponse = {
  agentVersion?: AgentVersion;
};

type GetAgentVersionResponse = {
  agentVersion?: AgentVersion;
};

type CloudFormationEventWithPhysicalId = CloudFormationCustomResourceEvent & {
  PhysicalResourceId?: string;
};

// Function to send response to CloudFormation
const sendResponse = async (
  event: CloudFormationEventWithPhysicalId,
  status: "SUCCESS" | "FAILED",
  data?: Record<string, unknown>,
  reason?: string
): Promise<void> => {
  const responseBody = JSON.stringify({
    Status: status,
    Reason:
      reason ||
      (status === "SUCCESS"
        ? "Agent preparation completed successfully"
        : "Error during agent preparation"),
    PhysicalResourceId: event.PhysicalResourceId || "agent-preparation",
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data || {},
  });

  logger.info("Sending response to CloudFormation", {
    status,
    responseBody,
    responseURL: event.ResponseURL,
  });

  const parsedUrl = new URL(event.ResponseURL);

  const options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.pathname + parsedUrl.search,
    method: "PUT",
    headers: {
      "Content-Type": "",
      "Content-Length": responseBody.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      logger.info("CloudFormation response status", {
        statusCode: response.statusCode,
      });
      response.on("data", (chunk) => {
        logger.debug("CloudFormation response data", {
          chunk: chunk.toString(),
        });
      });
      response.on("end", () => {
        logger.info("CloudFormation response sent successfully");
        resolve(undefined);
      });
    });

    request.on("error", (error) => {
      logger.error("Failed to send response to CloudFormation", { error });
      reject(error);
    });

    request.write(responseBody);
    request.end();
  });
};

export const handler = async (
  event: CloudFormationEventWithPhysicalId
): Promise<void> => {
  logger.info("Received event", { event });

  const { RequestType, ResourceProperties } = event;
  const properties =
    ResourceProperties as unknown as AgentPreparationProperties;

  try {
    if (RequestType === "Delete") {
      // No cleanup needed for agent preparation
      await sendResponse(event, "SUCCESS");
      return;
    }

    if (RequestType === "Create" || RequestType === "Update") {
      const agentIds = properties.AgentIds || [];

      logger.info("Preparing agents", { agentCount: agentIds.length });

      // Prepare all agents and wait for completion
      for (const agentId of agentIds) {
        logger.info("Preparing agent", { agentId });

        try {
          // Check if agent already has a prepared version
          const listVersionsResponse = (await bedrockAgent.send(
            new ListAgentVersionsCommand({ agentId })
          )) as ListAgentVersionsResponse;

          if (
            listVersionsResponse.agentVersionSummaries &&
            listVersionsResponse.agentVersionSummaries.length > 0
          ) {
            const preparedVersion =
              listVersionsResponse.agentVersionSummaries.find(
                (version) => version.status === "PREPARED"
              );

            if (preparedVersion) {
              logger.info("Agent already has prepared version", {
                agentId,
                versionId: preparedVersion.id,
                status: preparedVersion.status,
              });
              continue;
            }
          }

          // Prepare the agent
          const prepareResponse = (await bedrockAgent.send(
            new PrepareAgentCommand({ agentId })
          )) as PrepareAgentResponse;

          if (prepareResponse.agentVersion) {
            const versionId = prepareResponse.agentVersion.id;
            logger.info("Agent preparation initiated", {
              agentId,
              versionId,
            });

            // Wait for the agent to be prepared (polling)
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes with 5-second intervals
            const waitTime = 5000; // 5 seconds

            while (attempts < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, waitTime));

              const getAgentVersionResponse = (await bedrockAgent.send(
                new GetAgentVersionCommand({
                  agentId,
                  agentVersion: versionId,
                })
              )) as GetAgentVersionResponse;

              if (getAgentVersionResponse.agentVersion?.status === "PREPARED") {
                logger.info("Agent preparation completed", {
                  agentId,
                  versionId,
                  status: getAgentVersionResponse.agentVersion.status,
                });
                break;
              }

              if (getAgentVersionResponse.agentVersion?.status === "FAILED") {
                throw new Error(
                  `Agent preparation failed for ${agentId}: ${getAgentVersionResponse.agentVersion.failureReasons?.join(", ")}`
                );
              }

              attempts++;
              logger.info("Waiting for agent preparation", {
                agentId,
                versionId,
                status: getAgentVersionResponse.agentVersion?.status,
                attempt: attempts,
                maxAttempts,
              });
            }

            if (attempts >= maxAttempts) {
              throw new Error(`Agent preparation timed out for ${agentId}`);
            }
          } else {
            throw new Error(
              `Failed to initiate preparation for agent ${agentId}`
            );
          }
        } catch (error) {
          logger.error("Failed to prepare agent", { agentId, error });
          throw error;
        }
      }

      logger.info("All agents prepared successfully");

      await sendResponse(event, "SUCCESS", {
        PreparedAgents: agentIds.length,
      });
      return;
    }

    await sendResponse(event, "SUCCESS");
  } catch (error) {
    logger.error("Agent preparation failed", { error });

    await sendResponse(
      event,
      "FAILED",
      undefined,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
};
