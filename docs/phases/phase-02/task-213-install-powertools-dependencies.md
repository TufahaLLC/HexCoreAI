# Task 2.3: Install AWS Lambda Powertools Dependencies

Install and configure the required AWS Lambda Powertools packages and Zod for type-safe validation and idempotency support.

## Overview

This task installs the necessary npm packages for AWS Lambda Powertools utilities (Idempotency, Parser, Logger) and Zod schema validation library.

## Subtasks

### 2.3.1: Install Powertools Packages

- [ ] Install `@aws-lambda-powertools/logger` for structured logging
- [ ] Install `@aws-lambda-powertools/idempotency` for duplicate prevention
- [ ] Install `@aws-lambda-powertools/parser` for event validation
- [ ] Verify packages are added to `dependencies` (not `devDependencies`)

### 2.3.2: Install Zod and Supporting Libraries

- [ ] Install `zod` version ~3.23.0 for schema validation
- [ ] Install `@aws-sdk/client-dynamodb` (if not already installed)
- [ ] Install `@aws-sdk/lib-dynamodb` (if not already installed)
- [ ] Verify compatible versions

### 2.3.3: Update Package.json

- [ ] Add all dependencies with correct versions
- [ ] Verify no version conflicts with existing packages
- [ ] Update package-lock.json or pnpm-lock.yaml
- [ ] Document minimum Node.js version requirement (18.x or 20.x)

### 2.3.4: Configure TypeScript (if needed)

- [ ] Verify `tsconfig.json` has `strict: true` for Zod type inference
- [ ] Ensure `esModuleInterop: true` for Powertools imports
- [ ] Add `skipLibCheck: true` if type conflicts occur
- [ ] Verify `target` is ES2020 or higher

### 2.3.5: Verify Installation

- [ ] Run `npm install` or `pnpm install`
- [ ] Verify no installation errors
- [ ] Check that all packages are in `node_modules`
- [ ] Run `npm list` to verify dependency tree
- [ ] Test import statements in a sample file

## Implementation

### Install Commands

**Using npm:**
```bash
cd apps/aws

npm install @aws-lambda-powertools/logger@^2.10.0 \
            @aws-lambda-powertools/idempotency@^2.10.0 \
            @aws-lambda-powertools/parser@^2.10.0 \
            zod@^3.23.0 \
            @aws-sdk/client-dynamodb@^3.600.0 \
            @aws-sdk/lib-dynamodb@^3.600.0
```

**Using pnpm:**
```bash
cd apps/aws

pnpm add @aws-lambda-powertools/logger@^2.10.0 \
         @aws-lambda-powertools/idempotency@^2.10.0 \
         @aws-lambda-powertools/parser@^2.10.0 \
         zod@^3.23.0 \
         @aws-sdk/client-dynamodb@^3.600.0 \
         @aws-sdk/lib-dynamodb@^3.600.0
```

**Using yarn:**
```bash
cd apps/aws

yarn add @aws-lambda-powertools/logger@^2.10.0 \
         @aws-lambda-powertools/idempotency@^2.10.0 \
         @aws-lambda-powertools/parser@^2.10.0 \
         zod@^3.23.0 \
         @aws-sdk/client-dynamodb@^3.600.0 \
         @aws-sdk/lib-dynamodb@^3.600.0
```

### Updated package.json

**File:** `apps/aws/package.json`

```json
{
  "name": "hexcore-aws",
  "version": "1.0.0",
  "description": "HexCore AI AWS Lambda Functions",
  "type": "module",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": {
    "@aws-lambda-powertools/idempotency": "^2.10.0",
    "@aws-lambda-powertools/logger": "^2.10.0",
    "@aws-lambda-powertools/parser": "^2.10.0",
    "@aws-sdk/client-bedrock-agent-runtime": "^3.600.0",
    "@aws-sdk/client-dynamodb": "^3.600.0",
    "@aws-sdk/client-eventbridge": "^3.600.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/client-sqs": "^3.600.0",
    "@aws-sdk/lib-dynamodb": "^3.600.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.145",
    "@types/node": "^20.14.0",
    "@typescript-eslint/eslint-plugin": "^7.13.0",
    "@typescript-eslint/parser": "^7.13.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0",
    "vitest": "^1.6.0"
  }
}
```

### TypeScript Configuration

**File:** `apps/aws/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "rootDir": "./",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "@types/aws-lambda"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Verification Test File

Create a test file to verify imports work correctly:

**File:** `apps/aws/src/shared/__tests__/dependencies.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Dependency Imports', () => {
  it('should import Logger from Powertools', async () => {
    const { Logger } = await import('@aws-lambda-powertools/logger');
    expect(Logger).toBeDefined();
    
    const logger = new Logger({ serviceName: 'test' });
    expect(logger).toBeDefined();
  });

  it('should import Idempotency utilities', async () => {
    const { makeIdempotent } = await import('@aws-lambda-powertools/idempotency');
    const { DynamoDBPersistenceLayer } = await import('@aws-lambda-powertools/idempotency/dynamodb');
    
    expect(makeIdempotent).toBeDefined();
    expect(DynamoDBPersistenceLayer).toBeDefined();
  });

  it('should import Parser utilities', async () => {
    const { parser } = await import('@aws-lambda-powertools/parser');
    expect(parser).toBeDefined();
  });

  it('should import Zod', async () => {
    const { z } = await import('zod');
    expect(z).toBeDefined();
    
    // Test basic schema
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    
    const result = schema.safeParse({ name: 'Test', age: 25 });
    expect(result.success).toBe(true);
  });

  it('should import AWS SDK DynamoDB clients', async () => {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');
    
    expect(DynamoDBClient).toBeDefined();
    expect(DynamoDBDocumentClient).toBeDefined();
  });
});
```

Run the test:
```bash
npm test src/shared/__tests__/dependencies.test.ts
```

## Package Versions and Compatibility

### Powertools Versions

| Package | Version | Notes |
|---------|---------|-------|
| `@aws-lambda-powertools/logger` | ^2.10.0 | Structured logging with correlation IDs |
| `@aws-lambda-powertools/idempotency` | ^2.10.0 | Requires DynamoDB table |
| `@aws-lambda-powertools/parser` | ^2.10.0 | Works with Zod schemas |

### Zod Version

| Package | Version | Notes |
|---------|---------|-------|
| `zod` | ^3.23.0 | Latest stable, full TypeScript support |

### AWS SDK Versions

| Package | Version | Notes |
|---------|---------|-------|
| `@aws-sdk/client-dynamodb` | ^3.600.0 | Required for idempotency persistence |
| `@aws-sdk/lib-dynamodb` | ^3.600.0 | Document client for easier DynamoDB operations |

### Compatibility Matrix

| Node.js | Powertools | Zod | AWS SDK v3 |
|---------|------------|-----|------------|
| 18.x | ✅ 2.10.0 | ✅ 3.23.0 | ✅ 3.600.0 |
| 20.x | ✅ 2.10.0 | ✅ 3.23.0 | ✅ 3.600.0 |
| 22.x | ✅ 2.10.0 | ✅ 3.23.0 | ✅ 3.600.0 |

**Recommended**: Node.js 20.x (AWS Lambda runtime: `nodejs20.x`)

## Validation

### Installation Checks

```bash
# Verify packages are installed
npm list @aws-lambda-powertools/logger
npm list @aws-lambda-powertools/idempotency
npm list @aws-lambda-powertools/parser
npm list zod

# Check for vulnerabilities
npm audit

# Verify TypeScript compilation
npm run build

# Run tests
npm test
```

### Import Verification

Create a simple test file:

**File:** `apps/aws/src/test-imports.ts`

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import { parser } from '@aws-lambda-powertools/parser';
import { z } from 'zod';

console.log('✅ All imports successful');

const logger = new Logger({ serviceName: 'test' });
logger.info('Logger initialized');

const schema = z.object({ test: z.string() });
console.log('✅ Zod schema created');

console.log('✅ All dependencies working correctly');
```

Run it:
```bash
npx tsx src/test-imports.ts
```

Expected output:
```
✅ All imports successful
✅ Zod schema created
✅ All dependencies working correctly
```

### Build Verification

```bash
# Clean build
rm -rf dist/
npm run build

# Verify output
ls -la dist/

# Check for any TypeScript errors
npx tsc --noEmit
```

## Troubleshooting

### Common Issues

**Issue 1: Module not found errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Issue 2: TypeScript compilation errors**
```bash
# Verify tsconfig.json settings
# Ensure "strict": true and "esModuleInterop": true
# Add "skipLibCheck": true if needed
```

**Issue 3: Version conflicts**
```bash
# Check for conflicting versions
npm ls @aws-sdk/client-dynamodb

# Update all AWS SDK packages to same version
npm update @aws-sdk/*
```

**Issue 4: Zod type inference not working**
```typescript
// Ensure you're using z.infer<>
import { z } from 'zod';

const schema = z.object({ name: z.string() });
type MyType = z.infer<typeof schema>; // Correct

// Not: type MyType = typeof schema; // Wrong
```

### Lambda Layer Alternative (Optional)

If bundle size is a concern, consider using Lambda Layers:

```bash
# Create layer directory
mkdir -p layers/powertools/nodejs

# Install dependencies in layer
cd layers/powertools/nodejs
npm init -y
npm install @aws-lambda-powertools/logger \
            @aws-lambda-powertools/idempotency \
            @aws-lambda-powertools/parser \
            zod

# Package layer
cd ..
zip -r powertools-layer.zip nodejs/

# Upload to AWS Lambda Layer
aws lambda publish-layer-version \
  --layer-name hexcore-powertools \
  --zip-file fileb://powertools-layer.zip \
  --compatible-runtimes nodejs20.x
```

Then reference in SAM template:
```yaml
Globals:
  Function:
    Layers:
      - !Ref PowertoolsLayer
```

## Post-Installation Steps

After successful installation:

1. ✅ Proceed to [Task 2.1: Create Zod Schemas](./task-21-create-zod-schemas.md)
2. ✅ Implement schemas in `apps/aws/src/shared/schemas.ts`
3. ✅ Update Lambda functions to use Powertools utilities
4. ✅ Test locally with SAM CLI
5. ✅ Deploy to AWS

## References

- [AWS Lambda Powertools TypeScript](https://docs.powertools.aws.dev/lambda/typescript/latest/)
- [Zod Documentation](https://zod.dev/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Powertools Implementation Guide](./powertools-implementation-guide.md)
