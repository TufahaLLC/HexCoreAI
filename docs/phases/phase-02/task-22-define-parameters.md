# Task 2.2: Define Parameters ✅

Add CloudFormation parameters for deployment configuration.

**Subtasks:**
- [x] Add `Stage` parameter with default value 'test'
- [x] Add `RiotApiKeySecretArn` parameter for Secrets Manager ARN
- [x] Add parameter descriptions

**Parameters Section:**
```yaml
Parameters:
  Stage:
    Type: String
    Default: test
    Description: API Gateway stage name
  RiotApiKeySecretArn:
    Type: String
    Description: ARN of Secrets Manager secret containing Riot API key
```
