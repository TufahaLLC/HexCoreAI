# Phase 2: Infrastructure as Code (SAM Template) ✅

## Overview

This phase contains 10 tasks for defining the AWS infrastructure using SAM (Serverless Application Model).

## Tasks

1. [Task 2.1: Create Core SAM Template ✅](./task-21-create-core-sam-template.md) ✅
2. [Task 2.2: Define Parameters ✅](./task-22-define-parameters.md) ✅
3. [Task 2.3: Define DynamoDB Tables ✅](./task-23-define-dynamodb-tables.md) ✅
4. [Task 2.4: Define SQS Queues ✅](./task-24-define-sqs-queues.md) ✅
5. [Task 2.5: Define S3 Bucket ✅](./task-25-define-s3-bucket.md) ✅
6. [Task 2.6: Define API Gateway WebSocket](./task-26-define-api-gateway-websocket.md) 
7. [Task 2.7: Define Lambda Functions](./task-27-define-lambda-functions.md) 
8. [Task 2.8: Define EventBridge & Step Functions](./task-28-define-eventbridge-step-functions.md) 
9. [Task 2.9: Define CloudWatch Alarms](./task-29-define-cloudwatch-alarms.md) 
10. [Task 2.10: Define Outputs](./task-210-define-outputs.md) 

## Additional Tasks: AWS Lambda Powertools Integration

### Prerequisites for Phases 4, 5, 7, 8
Before implementing Lambda functions in later phases, complete these Powertools setup tasks:

11. [Task 2.11: Create Zod Schemas ✅](./task-211-create-zod-schemas.md) ✅ - Create shared schemas file for type-safe validation
12. [Task 2.12: Update SAM Template for Idempotency ✅](./task-212-update-sam-template-idempotency.md) ✅ - Add IdempotencyTable and IAM permissions
13. [Task 2.13: Install Powertools Dependencies ✅](./task-213-install-powertools-dependencies.md) ✅ - Install npm packages

### Reference Documentation
- **[Powertools Implementation Guide](./powertools-implementation-guide.md)** - Comprehensive guide for implementing Idempotency and Parser utilities
- **[Zod Schemas Reference](./zod-schemas-reference.md)** - Type-safe event validation schemas for all Lambda functions

These utilities provide:
- **Idempotency**: Prevents duplicate processing on retries (critical for Match Processor, Agent Orchestrators, Synthesizer)
- **Parser**: Type-safe validation using Zod schemas for all external inputs
- **Logger**: Structured JSON logging with correlation IDs
- **Tracer**: X-Ray distributed tracing
- **Metrics**: CloudWatch custom metrics

## Status

**Complete** ✅ (13/13 tasks completed)
