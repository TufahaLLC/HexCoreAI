import https from "node:https";
import { Logger } from "@aws-lambda-powertools/logger";
import {
  BedrockAgentClient,
  CreateAgentActionGroupCommand,
  GetAgentVersionCommand,
  ListAgentActionGroupsCommand,
  ListAgentVersionsCommand,
  PrepareAgentCommand,
  UpdateAgentActionGroupCommand,
} from "@aws-sdk/client-bedrock-agent";
import type { CloudFormationCustomResourceEvent } from "aws-lambda";

const logger = new Logger({ serviceName: "agent-preparation" });
const bedrockAgent = new BedrockAgentClient();

// Constants for agent preparation polling
const MAX_PREPARATION_ATTEMPTS = 60; // 5 minutes with 5-second intervals
const PREPARATION_WAIT_TIME_MS = 5000; // 5 seconds
const HTTPS_PORT = 443;
const MILLISECONDS_TO_SECONDS = 1000;

type AgentConfig = {
  AgentId: string;
  AgentName: string;
  ActionGroupName: string;
  LambdaArn: string;
};

type AgentPreparationProperties = {
  AgentConfigs: AgentConfig[];
};

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
const sendResponse = (
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
    port: HTTPS_PORT,
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

// Helper: Wait for agent preparation to complete
const waitForAgentPreparation = async (
  agentId: string,
  agentVersion: string
): Promise<void> => {
  let attempts = 0;

  while (attempts < MAX_PREPARATION_ATTEMPTS) {
    await new Promise((resolve) =>
      setTimeout(resolve, PREPARATION_WAIT_TIME_MS)
    );

    try {
      const getAgentVersionResponse = (await bedrockAgent.send(
        new GetAgentVersionCommand({
          agentId,
          agentVersion,
        })
      )) as GetAgentVersionResponse;

      const status = getAgentVersionResponse.agentVersion?.status;

      logger.info("Checking agent preparation status", {
        agentId,
        agentVersion,
        status,
        attempt: attempts + 1,
        maxAttempts: MAX_PREPARATION_ATTEMPTS,
      });

      if (status === "PREPARED") {
        logger.info("Agent preparation completed", {
          agentId,
          agentVersion,
        });
        return;
      }

      if (status === "FAILED") {
        const reasons =
          getAgentVersionResponse.agentVersion?.failureReasons?.join(", ") ||
          "Unknown reason";
        throw new Error(`Agent preparation failed for ${agentId}: ${reasons}`);
      }

      if (status === "NOT_PREPARED") {
        throw new Error(
          `Agent ${agentId} is in NOT_PREPARED state. May need manual intervention.`
        );
      }

      attempts++;
    } catch (error) {
      logger.error("Error checking agent preparation status", {
        agentId,
        agentVersion,
        error,
        attempt: attempts + 1,
      });
      throw error;
    }
  }

  const timeoutSeconds =
    (MAX_PREPARATION_ATTEMPTS * PREPARATION_WAIT_TIME_MS) /
    MILLISECONDS_TO_SECONDS;
  throw new Error(
    `Agent preparation timed out for ${agentId} after ${MAX_PREPARATION_ATTEMPTS} attempts (${timeoutSeconds}s)`
  );
};

// Helper: Check if agent already has a prepared version
const checkExistingPreparedVersion = async (
  agentId: string
): Promise<boolean> => {
  try {
    const listVersionsResponse = (await bedrockAgent.send(
      new ListAgentVersionsCommand({ agentId })
    )) as ListAgentVersionsResponse;

    if (!listVersionsResponse.agentVersionSummaries) {
      logger.info("No agent versions found", { agentId });
      return false;
    }

    // Check for PREPARED version
    const preparedVersion = listVersionsResponse.agentVersionSummaries.find(
      (version) => version.status === "PREPARED"
    );

    if (preparedVersion) {
      logger.info("Agent already has prepared version", {
        agentId,
        versionId: preparedVersion.id,
        agentVersion: preparedVersion.agentVersion,
        status: preparedVersion.status,
      });
      return true;
    }

    // Check for PREPARING version and wait for it
    const preparingVersion = listVersionsResponse.agentVersionSummaries.find(
      (version) => version.status === "PREPARING"
    );

    if (preparingVersion?.agentVersion) {
      logger.info("Agent is already preparing, waiting for completion", {
        agentId,
        agentVersion: preparingVersion.agentVersion,
      });
      await waitForAgentPreparation(agentId, preparingVersion.agentVersion);
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Error checking existing prepared version", {
      agentId,
      error,
    });
    throw error;
  }
};

// Helper: Create or update action group for an agent
const createOrUpdateActionGroup = async (
  config: AgentConfig
): Promise<void> => {
  const { AgentId, AgentName, ActionGroupName, LambdaArn } = config;

  logger.info("Creating/updating action group", {
    agentId: AgentId,
    actionGroupName: ActionGroupName,
  });

  // Define OpenAPI schema for the action group
  const apiSchema = {
    openapi: "3.0.0",
    info: {
      title: `${AgentName} Tools`,
      version: "1.0.0",
      description: `API for ${AgentName} agent tools`,
    },
    paths: {
      [`/get${AgentName}Data`]: {
        post: {
          summary: `Retrieve ${AgentName.toLowerCase()} data for a match`,
          description: `Retrieves ${AgentName.toLowerCase()} data for a specific match`,
          operationId: `get${AgentName}Data`,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    matchId: {
                      type: "string",
                      description: "The match identifier",
                    },
                    puuid: {
                      type: "string",
                      description: "Player unique identifier",
                    },
                  },
                  required: ["matchId", "puuid"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: `${AgentName} data retrieved successfully`,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        description: "The retrieved data",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  try {
    // Check if action group already exists
    const listResponse = await bedrockAgent.send(
      new ListAgentActionGroupsCommand({
        agentId: AgentId,
        agentVersion: "DRAFT",
      })
    );

    const existingActionGroup = listResponse.actionGroupSummaries?.find(
      (ag) => ag.actionGroupName === ActionGroupName
    );

    if (existingActionGroup?.actionGroupId) {
      // Update existing action group
      logger.info("Updating existing action group", {
        agentId: AgentId,
        actionGroupId: existingActionGroup.actionGroupId,
      });

      await bedrockAgent.send(
        new UpdateAgentActionGroupCommand({
          agentId: AgentId,
          agentVersion: "DRAFT",
          actionGroupId: existingActionGroup.actionGroupId,
          actionGroupName: ActionGroupName,
          actionGroupState: "ENABLED",
          actionGroupExecutor: {
            lambda: LambdaArn,
          },
          apiSchema: {
            payload: JSON.stringify(apiSchema),
          },
        })
      );

      logger.info("Action group updated successfully", {
        agentId: AgentId,
        actionGroupName: ActionGroupName,
      });
    } else {
      // Create new action group
      logger.info("Creating new action group", {
        agentId: AgentId,
        actionGroupName: ActionGroupName,
      });

      await bedrockAgent.send(
        new CreateAgentActionGroupCommand({
          agentId: AgentId,
          agentVersion: "DRAFT",
          actionGroupName: ActionGroupName,
          actionGroupState: "ENABLED",
          actionGroupExecutor: {
            lambda: LambdaArn,
          },
          apiSchema: {
            payload: JSON.stringify(apiSchema),
          },
        })
      );

      logger.info("Action group created successfully", {
        agentId: AgentId,
        actionGroupName: ActionGroupName,
      });
    }
  } catch (error) {
    logger.error("Failed to create/update action group", {
      agentId: AgentId,
      actionGroupName: ActionGroupName,
      error,
    });
    throw error;
  }
};

// Helper: Prepare a single agent
const prepareSingleAgent = async (agentId: string): Promise<void> => {
  logger.info("Preparing agent", { agentId });

  try {
    // Check if agent already has a prepared version
    const alreadyPrepared = await checkExistingPreparedVersion(agentId);
    if (alreadyPrepared) {
      logger.info("Agent already prepared, skipping", { agentId });
      return;
    }

    // Prepare the agent
    logger.info("Initiating agent preparation", { agentId });
    const prepareResponse = (await bedrockAgent.send(
      new PrepareAgentCommand({ agentId })
    )) as PrepareAgentResponse;

    if (!prepareResponse.agentVersion) {
      throw new Error(
        `PrepareAgent response missing agentVersion for agent ${agentId}`
      );
    }

    const agentVersion = prepareResponse.agentVersion.agentVersion || "DRAFT";

    logger.info("Agent preparation initiated", {
      agentId,
      agentVersion,
      preparedVersionId: prepareResponse.agentVersion.id,
    });

    // Wait for the agent to be prepared
    await waitForAgentPreparation(agentId, agentVersion);

    logger.info("Agent preparation completed successfully", { agentId });
  } catch (error) {
    logger.error("Failed to prepare agent", {
      agentId,
      error,
    });
    throw error;
  }
};

const createActionGroups = async (
  agentConfigs: AgentConfig[]
): Promise<void> => {
  logger.info("Creating action groups for all agents", {
    agentCount: agentConfigs.length,
  });

  const errors: Array<{ agentId: string; error: unknown }> = [];

  for (const config of agentConfigs) {
    try {
      await createOrUpdateActionGroup(config);
    } catch (error) {
      logger.error("Failed to create action group", {
        agentId: config.AgentId,
        actionGroupName: config.ActionGroupName,
        error,
      });
      errors.push({ agentId: config.AgentId, error });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to create action groups for ${errors.length} agent(s): ${errors.map((e) => e.agentId).join(", ")}`
    );
  }

  logger.info("All action groups created successfully");
};

const prepareAgents = async (agentConfigs: AgentConfig[]): Promise<void> => {
  logger.info("Preparing all agents", {
    agentCount: agentConfigs.length,
  });

  const errors: Array<{ agentId: string; error: unknown }> = [];

  for (const config of agentConfigs) {
    try {
      await prepareSingleAgent(config.AgentId);
    } catch (error) {
      logger.error("Failed to prepare agent", {
        agentId: config.AgentId,
        error,
      });
      errors.push({ agentId: config.AgentId, error });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Failed to prepare ${errors.length} agent(s): ${errors.map((e) => e.agentId).join(", ")}`
    );
  }

  logger.info("All agents prepared successfully");
};

const validateAgentConfigs = (agentConfigs: AgentConfig[]): void => {
  for (const config of agentConfigs) {
    if (
      !(
        config.AgentId &&
        config.AgentName &&
        config.ActionGroupName &&
        config.LambdaArn
      )
    ) {
      throw new Error(`Invalid agent config: ${JSON.stringify(config)}`);
    }
  }
};

const handleCreateOrUpdate = async (
  properties: AgentPreparationProperties
): Promise<{ PreparedAgents: number; AgentIds: string[] }> => {
  const agentConfigs = properties.AgentConfigs;

  if (!agentConfigs || agentConfigs.length === 0) {
    logger.warn("No agent configs provided");
    return { PreparedAgents: 0, AgentIds: [] };
  }

  logger.info("Processing agents", { agentCount: agentConfigs.length });

  // Validate configs
  validateAgentConfigs(agentConfigs);

  await createActionGroups(agentConfigs);
  await prepareAgents(agentConfigs);

  logger.info("All agents prepared successfully");

  return {
    PreparedAgents: agentConfigs.length,
    AgentIds: agentConfigs.map((c) => c.AgentId),
  };
};

export const handler = async (
  event: CloudFormationEventWithPhysicalId
): Promise<void> => {
  logger.info("Received event", {
    requestType: event.RequestType,
    stackId: event.StackId,
    requestId: event.RequestId,
  });

  const { RequestType, ResourceProperties } = event;

  try {
    if (RequestType === "Delete") {
      logger.info("Delete request - no cleanup needed");
      await sendResponse(event, "SUCCESS");
      return;
    }

    if (RequestType === "Create" || RequestType === "Update") {
      const properties =
        ResourceProperties as unknown as AgentPreparationProperties;
      const result = await handleCreateOrUpdate(properties);
      await sendResponse(event, "SUCCESS", result);
      return;
    }

    logger.info("Unhandled request type, sending success");
    await sendResponse(event, "SUCCESS");
  } catch (error) {
    logger.error("Agent preparation failed", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    await sendResponse(
      event,
      "FAILED",
      undefined,
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
};
