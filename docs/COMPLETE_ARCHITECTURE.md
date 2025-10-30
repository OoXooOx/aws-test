# Complete Architecture with UI

## Full Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              S3 Static Website (Public)                      │
│  Files: index.html, styles.css, app.js, config.js           │
│  URL: http://aws-test-dev-ui.s3-website.eu-central-1...     │
└─────────────────────────────────────────────────────────────┘
                              ↓ (CORS enabled)
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (REST API)                    │
│  Routes: POST/GET /phrases, GET /phrases/{id}, GET /counter │
│  Throttling: 100 req/sec (dev), 1000 req/sec (prod)         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Lambda Function (Node.js 22)                │
│  Memory: 256 MB (dev), 512 MB (prod)                        │
│  Timeout: 30s                                                │
│  Reserved Concurrency: 100 (dev), 200 (prod)                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   DynamoDB Table (PAY_PER_REQUEST)           │
│  Phrases: { id, phrase, createdAt, ttl }                    │
│  Counter: { id: 0, counter: N } (atomic increment)          │
│  TTL: 24h (dev), 7 days (prod) - auto-delete old records    │
└─────────────────────────────────────────────────────────────┘
```

## Modular Stack Architecture

Following production-ready patterns:

```
AwsTestStack (Main Orchestrator)
├── DatabaseStack
│   └── DynamoDbTable construct
│       └── phrasesTable (AWS::DynamoDB::Table)
│
├── IamStack
│   └── IamRole construct
│       └── lambdaRole (AWS::IAM::Role)
│           └── DynamoDB read/write permissions
│
├── LambdaStack
│   └── StandardLambdaFunction construct
│       └── apiLambda (AWS::Lambda::Function)
│           ├── Config from environments.json
│           └── Uses lambdaRole
│
├── ApiGatewayStack
│   └── ApiGatewayConstruct
│       └── restApi (AWS::ApiGateway::RestApi)
│           ├── POST /phrases
│           ├── GET /phrases
│           ├── GET /phrases/{id}
│           └── GET /counter
│
└── AmplifyStack (Website)
    └── websiteBucket (AWS::S3::Bucket)
        ├── Static website hosting enabled
        ├── Public read access
        └── BucketDeployment
            ├── Uploads: index.html, styles.css, app.js
            └── Generates: config.js (with API URL)
```

## Configuration-Driven Architecture

### config/environments.json

```json
{
  "development": {
    "lambda": {
      "api": {
        "memory": 256,
        "timeout": 30,
        "reservedConcurrency": 100
      }
    },
    "dynamodb": {
      "ttlSeconds": 86400  // 24 hours
    },
    "apiGateway": {
      "throttleRateLimit": 100,
      "throttleBurstLimit": 200
    }
  },
  "production": {
    // Higher limits for production
  }
}
```

**Change settings** → redeploy → applied automatically!

### Resource Naming (lib/utils/naming.ts)

```typescript
ResourceNaming
├── dynamodb.phrasesTable     → "aws-test-dev-phrases"
├── lambda.api                 → "aws-test-dev-api"
├── api.restApi                → "aws-test-dev-api"
├── iam.lambdaRole             → "aws-test-dev-lambda-role"
└── amplify.appName            → "aws-test-dev-ui"
```

**Consistent naming** across all AWS resources!

## Request Flow Examples

### Add Phrase Flow:

```
1. User types in UI form: "Hello World"
   ↓
2. Browser: POST /phrases { phrase: "Hello World" }
   ↓
3. API Gateway: Validates, throttles, routes
   ↓
4. Lambda: Receives request
   ├─ Validates phrase length (≤100 chars)
   ├─ Atomically increments counter (ADD operation)
   │  DynamoDB: id=0, counter: 5 → 6
   ├─ Stores phrase with new ID
   │  DynamoDB: id=6, phrase="Hello World", createdAt=...
   └─ Returns: { success: true, data: { id: 6, ... } }
   ↓
5. Browser: Receives response
   ├─ Shows success message
   ├─ Clears form
   ├─ Refreshes counter (GET /counter)
   └─ Refreshes phrase list (GET /phrases)
```

### Concurrent Requests (Atomic Counter):

```
User A: POST /phrases { phrase: "A" }
User B: POST /phrases { phrase: "B" }
User C: POST /phrases { phrase: "C" }

All arrive simultaneously at Lambda:

Lambda A:
├─ Counter: 5 → 6 (atomic ADD)
└─ Stores: id=6, phrase="A"

Lambda B:
├─ Counter: 6 → 7 (atomic ADD)
└─ Stores: id=7, phrase="B"

Lambda C:
├─ Counter: 7 → 8 (atomic ADD)
└─ Stores: id=8, phrase="C"

Result: No race conditions! ✅
- Counter: 8 (correct)
- IDs: 6, 7, 8 (no duplicates, no gaps)
```

**DynamoDB ADD operation is thread-safe** - this is why no MongoDB-style locks are needed!

## Deployment Dependencies

```
Graph TD
  Database → IAM (needs table ARN for permissions)
  IAM → Lambda (needs role)
  Lambda → ApiGateway (needs function)
  ApiGateway → Website (needs API URL)
```

**CDK resolves dependencies automatically!**

## File Organization

### Configuration & Types:

```
config/environments.json         Environment settings
src/shared/types.ts             TypeScript type definitions
bin/utils.ts                    Config loader
lib/utils/naming.ts             Resource naming
```

### Reusable Constructs:

```
lib/constructs/lambda-function.ts    StandardLambdaFunction
lib/constructs/dynamodb-table.ts     DynamoDbTable
lib/constructs/iam-role.ts           IamRole
lib/constructs/api-gateway.ts        ApiGatewayConstruct
```

### Modular Stacks:

```
lib/stacks/database.ts          DatabaseStack
lib/stacks/iam.ts               IamStack
lib/stacks/lambda.ts            LambdaStack
lib/stacks/api-gateway.ts       ApiGatewayStack
lib/stacks/amplify.ts           AmplifyStack (S3 hosting)
```

### Application Code:

```
src/lambda/api/index.ts         Lambda handler
ui/index.html                   UI structure
ui/styles.css                   UI styling
ui/app.js                       UI logic
```

## Cost Breakdown

**For 1000 requests/month:**

| Component | Cost/Month |
|-----------|------------|
| Lambda | $0.0002 |
| DynamoDB | $0.0025 |
| API Gateway | $0.0035 |
| S3 Website | $0.0050 |
| **Total** | **~$0.011** |

**Under free tier: $0/month**

## Production Architecture Comparison

### Same Patterns:

✅ config/environments.json  
✅ lib/utils/naming.ts  
✅ lib/constructs/ (reusable)  
✅ lib/stacks/ (modular)  
✅ src/shared/types.ts  
✅ bin/utils.ts  

### Simplified (For Learning):

❌ No Lambda layers (simple dependencies)  
❌ No SQS queue (direct invocation)  
❌ No Secrets Manager (no API keys)  
❌ No Blue/Green deployment (dev only)  
❌ Single Lambda function (vs 3)  

### Added (UI):

✅ S3 static website hosting  
✅ Automatic UI deployment  
✅ Config injection during deployment  

## Architecture Benefits

**Modular:**
- Each stack has single responsibility
- Easy to understand
- Easy to modify

**Configurable:**
- Settings in JSON, not code
- Different configs for dev/prod
- No code changes to adjust settings

**Reusable:**
- Constructs work across stacks
- Can copy constructs to other projects
- Follow AWS best practices

**Scalable:**
- Add stacks without changing existing code
- Add resources using same patterns
- Easy to extend

**Professional:**
- Production-ready patterns
- Same architecture as real projects
- Not a tutorial simplification

## Next Steps

After deployment:

1. **Open Website URL** - Use the web UI
2. **Test API** - Use curl or PowerShell
3. **Monitor** - Check CloudWatch logs
4. **Extend** - Add production features:
   - API key authentication
   - More Lambda functions
   - SQS for async processing
   - Lambda layers for shared code
   - Blue/Green deployment

## Summary

**Complete architecture:**
- ✅ S3 static website (UI)
- ✅ API Gateway (REST API)
- ✅ Lambda (serverless compute)
- ✅ DynamoDB (atomic counter)
- ✅ Modular stacks
- ✅ Configuration files
- ✅ Resource naming
- ✅ Reusable constructs

**Follows production-ready patterns** scaled for learning and testing! 🎯

