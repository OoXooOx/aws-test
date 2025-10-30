# 🚀 AWS Test Project - START HERE

## What Was Created

A **full-stack serverless web application** using **professional production-ready architecture**:

**Architecture:**
✅ **config/environments.json** - Environment-based configuration  
✅ **lib/utils/naming.ts** - Centralized resource naming  
✅ **lib/constructs/** - Reusable CDK components  
✅ **lib/stacks/** - Modular stack organization  
✅ **src/shared/types.ts** - TypeScript type definitions  

**Functionality:**
✅ **Web UI** - S3-hosted static website  
✅ **POST /phrases** - Store phrase (max 100 chars)  
✅ **GET /phrases** - List all phrases  
✅ **GET /phrases/{id}** - Get specific phrase  
✅ **GET /counter** - Get auto-increment counter  
✅ **Atomic Counter** - DynamoDB ADD (no race conditions)  

## Architecture Highlights

### Modular Stacks

```typescript
// lib/aws-test-stack.ts - Main orchestrator
const database = new DatabaseStack(this, 'Database', { envConfig, naming });
const iam = new IamStack(this, 'Iam', { envConfig, naming, phrasesTable });
const lambda = new LambdaStack(this, 'Lambda', { envConfig, naming, lambdaRole });
const apiGateway = new ApiGatewayStack(this, 'ApiGateway', { envConfig, naming, lambdaStack });
```

**Each stack manages one concern:**
- DatabaseStack → DynamoDB only
- IamStack → Permissions only  
- LambdaStack → Functions only
- ApiGatewayStack → Routes only

### Configuration-Driven

```json
// config/environments.json
"development": {
  "lambda": {
    "api": {
      "memory": 256,           ← Change this
      "timeout": 30,
      "reservedConcurrency": 100
    }
  }
}
```

**Redeploy** → settings applied automatically!

### Resource Naming

```typescript
// lib/utils/naming.ts
class ResourceNaming {
  lambda: { api: "aws-test-dev-api" }
  dynamodb: { phrasesTable: "aws-test-dev-phrases" }
  api: { restApi: "aws-test-dev-api" }
}
```

All resource names follow consistent pattern.

## Quick Deployment

### 1. Install

```powershell
cd C:\New\WagmiV3\aws-test
npm install
npm run build
```

### 2. Get AWS Account

```powershell
aws sts get-caller-identity --query Account --output text
```

### 3. Deploy

```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

### 4. Test

```powershell
.\test-api.ps1 -ApiUrl "https://YOUR_API_URL/"
```

## Key Features

### Atomic Counter (DynamoDB ADD Operation)

**Solves the race condition problem we discussed:**

```typescript
// Even with 1000 concurrent requests, counter increments correctly!
await UpdateCommand({
  Key: { id: 0 },
  UpdateExpression: 'ADD #counter :inc',  // Atomic operation
  ReturnValues: 'UPDATED_NEW'
});
```

**No MongoDB-style lock needed** - DynamoDB `ADD` is atomic by default!

### Request Validation

```typescript
if (body.phrase.length > 100) {
  return { error: "Phrase too long. Maximum: 100 characters" };
}
```

### TTL (Auto-Delete Old Records)

```json
// config/environments.json
"dynamodb": {
  "ttlSeconds": 86400  // Delete after 24 hours
}
```

## File Guide

**Essential reading:**

1. **ARCHITECTURE.md** ← Detailed architecture patterns
2. **INSTALLATION.md** - Detailed deployment steps
3. **EXAMPLES.md** - API usage examples

**Code to study:**

4. **lib/aws-test-stack.ts** - Main orchestration
5. **lib/stacks/** - Modular stack components
6. **lib/constructs/** - Reusable CDK constructs
7. **src/lambda/api/index.ts** - Lambda handler with atomic counter

## Why This Architecture?

**Why This Architecture?**

✅ **Production-ready** - Used in real projects  
✅ **Maintainable** - Easy to modify  
✅ **Scalable** - Add features without breaking existing code  
✅ **Testable** - Each component can be tested independently  
✅ **Configurable** - Change settings in JSON, not code  

**Not a simplified tutorial** - this is how you build real AWS applications!

## Next Steps

1. **Deploy the project** (follow INSTALLATION.md)
2. **Test the API** (use test-api.ps1)
3. **Study the code** (learn the patterns)
4. **Extend it** (add advanced features):
   - Add API key authentication
   - Add more Lambda functions
   - Add SQS for async processing
   - Add Lambda layers
   - Add Blue/Green deployment

## Architecture Benefits

**Compared to flat structure:**

❌ **Flat (everything in one file):**
```
lib/aws-test-stack.ts (500 lines)
  ├─ DynamoDB code
  ├─ IAM code
  ├─ Lambda code
  └─ API Gateway code
```

✅ **Modular (professional structure):**
```
lib/stacks/database.ts (50 lines)
lib/stacks/iam.ts (40 lines)
lib/stacks/lambda.ts (40 lines)
lib/stacks/api-gateway.ts (60 lines)
lib/constructs/*.ts (reusable!)
```

**Result:**
- Easier to find code
- Easier to modify
- Easier to test
- Easier to extend

This is the **professional way** to structure AWS CDK projects!

---

**Ready to deploy?** → Run `.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID`

