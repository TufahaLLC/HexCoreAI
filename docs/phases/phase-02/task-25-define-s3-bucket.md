# Task 2.5: Define S3 Bucket ✅

Create S3 bucket for storing analysis results with lifecycle policies.

**Subtasks:**
- [x] Define `ResultsBucket` resource
  - [x] Set dynamic bucket name using AWS::AccountId
  - [x] Enable server-side encryption (AES256)
  - [x] Add lifecycle rule to delete objects after 90 days

**S3 Configuration:**
```yaml
  # ==================== S3 Bucket ====================
  ResultsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub hexcore-results-${AWS::AccountId}
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldResults
            Status: Enabled
            ExpirationInDays: 90
```
