# Project Structure (Modular Architecture)

Professional modular architecture with reusable components.

```
aws-test/
├── bin/
│   ├── aws-test.ts              # CDK app entry point
│   └── utils.ts                 # Config loading utilities
│
├── config/
│   └── environments.json        # Environment-based configuration (dev, prod)
│
├── lib/
│   ├── aws-test-stack.ts        # Main orchestration stack
│   │
│   ├── utils/
│   │   ├── naming.ts            # Resource naming utilities
│   │   └── index.ts             # Exports
│   │
│   ├── constructs/              # Reusable CDK constructs
│   │   ├── lambda-function.ts   # StandardLambdaFunction
│   │   ├── dynamodb-table.ts    # DynamoDbTable
│   │   ├── iam-role.ts          # IamRole
│   │   ├── api-gateway.ts       # ApiGatewayConstruct
│   │   └── index.ts             # Exports
│   │
│   └── stacks/                  # Modular stack components
│       ├── database.ts          # DatabaseStack (DynamoDB)
│       ├── iam.ts               # IamStack (roles & policies)
│       ├── lambda.ts            # LambdaStack (functions)
│       ├── api-gateway.ts       # ApiGatewayStack (API routes)
│       └── index.ts             # Exports
│
├── src/
│   ├── shared/
│   │   └── types.ts             # TypeScript type definitions
│   │
│   └── lambda/
│       └── api/
│           ├── index.ts         # Lambda handler
│           └── package.json     # Lambda dependencies
│
├── package.json                 # Root dependencies
├── tsconfig.json                # TypeScript configuration
├── cdk.json                     # CDK configuration
├── .gitignore                   # Git ignore rules
│
├── deploy.ps1                   # PowerShell deployment script
├── test-api.ps1                 # PowerShell API testing script
│
└── docs/
    ├── README.md                # Main documentation
    ├── QUICKSTART.md            # Quick start guide
    ├── EXAMPLES.md              # API usage examples
    ├── INSTALLATION.md          # Detailed setup
    └── START_HERE.md            # Getting started
```

## Component Descriptions

### Infrastructure (CDK)

**bin/aws-test.ts:**
- CDK application entry point
- Loads context parameters (environment, region, account)
- Creates main stack

**lib/aws-test-stack.ts:**
- Defines AWS resources:
  - DynamoDB table (phrases + counter)
  - Lambda function (API handler)
  - IAM role (Lambda permissions)
  - API Gateway (REST API with routes)
- CloudFormation outputs (API URL, table name)

### Application Code

**src/lambda/api/index.ts:**
- Single Lambda handler for all routes
- Route logic:
  - `POST /phrases` → Add new phrase (increments counter)
  - `GET /phrases` → List all phrases
  - `GET /phrases/{id}` → Get phrase by ID
  - `GET /counter` → Get current counter value
- Uses AWS SDK v3 for DynamoDB operations
- Implements atomic counter increment

### Scripts

**deploy.ps1:**
- PowerShell deployment script for Windows
- Checks prerequisites (Node.js, AWS CLI)
- Installs dependencies
- Builds TypeScript
- Bootstraps CDK (first-time setup)
- Deploys stack to AWS
- Shows outputs

**test-api.ps1:**
- PowerShell API testing script
- Automatically gets API URL from stack outputs
- Tests all endpoints:
  - Adds test phrases
  - Gets counter
  - Lists phrases
  - Gets specific phrase
  - Tests validation (phrase too long)

### Documentation

**README.md:**
- Project overview
- Feature list
- Architecture diagram
- Setup instructions
- API usage examples
- Cost estimation

**QUICKSTART.md:**
- Step-by-step deployment guide
- Testing instructions
- Troubleshooting tips

**EXAMPLES.md:**
- curl examples for all endpoints
- PowerShell examples
- Concurrent requests test
- Architecture notes

## Key Features Demonstrated

### 1. Atomic Counter (DynamoDB)

**Counter storage:**
```
DynamoDB record at id=0:
{
  "id": 0,
  "counter": 3  // Auto-increments
}
```

**Atomic increment:**
```typescript
UpdateCommand({
  Key: { id: 0 },
  UpdateExpression: 'ADD #counter :inc',
  ExpressionAttributeValues: { ':inc': 1 },
  ReturnValues: 'UPDATED_NEW'
})
```

**Benefits:**
- Thread-safe (no race conditions)
- Works with concurrent requests
- Returns new value after increment

### 2. API Gateway Routes

```
POST /phrases        → Add new phrase (returns ID)
GET  /phrases        → List all phrases
GET  /phrases/{id}   → Get specific phrase
GET  /counter        → Get current counter
```

### 3. Request Validation

- Phrase required (string type)
- Max length: 100 characters
- Returns 400 error for invalid requests

### 4. AWS Best Practices

- Pay-per-request DynamoDB (no capacity planning)
- Minimal Lambda memory (256 MB)
- CORS enabled for browser access
- CloudFormation outputs for easy access
- Removal policy: DESTROY (dev environment)

## Feature Comparison

| Feature | Production Apps | aws-test |
|---------|-------------------------|----------|
| **Lambda functions** | 3 (mainApi, webhook, processor) | 1 (single handler) |
| **Routing** | Separate functions per route | Single function with if/else |
| **Lambda layers** | 3 layers (common, openai, preliminary-ai) | None (all code in handler) |
| **Queue** | SQS FIFO for async processing | None (direct invocation) |
| **Secrets** | AWS Secrets Manager | None (no API keys) |
| **Authentication** | API Key + webhook signature | None (public API) |
| **Configuration** | environments.json with UI | Hardcoded |
| **Blue/Green** | Supported with aliases | Not implemented |
| **Monitoring** | X-Ray, Insights, CloudWatch | Basic CloudWatch only |
| **Deployment scripts** | Bash scripts | PowerShell script |
| **Complexity** | Production-ready | Learning/testing |

## Next Steps to Make It Production-Like

To evolve this into a full production system:

1. **Add authentication:**
   - API Gateway API Keys
   - Usage Plans with quotas

2. **Split Lambda functions:**
   - One for POST routes
   - One for GET routes

3. **Add Lambda layers:**
   - Common utilities
   - AWS SDK

4. **Add environment config:**
   - config/environments.json
   - Development vs production settings

5. **Add async processing:**
   - SQS queue for long-running tasks
   - Separate processor Lambda

6. **Add monitoring:**
   - X-Ray tracing
   - CloudWatch Insights
   - Custom metrics

7. **Add Blue/Green deployment:**
   - Provisioned concurrency
   - Lambda aliases
   - Gradual traffic shifting

8. **Add deployment scripts:**
   - Bash scripts for Linux/Mac
   - Admin console for management
   - Health checks

