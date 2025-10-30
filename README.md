# AWS Test Project

Test project with **professional modular architecture** for AWS serverless applications.

## Architecture

Professional modular structure:
- ✅ `config/environments.json` - Environment-based configuration
- ✅ `lib/utils/naming.ts` - Centralized resource naming
- ✅ `lib/constructs/` - Reusable CDK constructs
- ✅ `lib/stacks/` - Modular stack organization
- ✅ `src/shared/types.ts` - TypeScript type definitions
- ✅ `bin/utils.ts` - Configuration loading utilities

## Features

- **POST /phrases** - Add a new phrase (max 100 characters)
- **GET /phrases** - List all phrases
- **GET /phrases/{id}** - Get specific phrase by ID
- **GET /counter** - Get total number of phrases added

## Architecture

```
Web Browser
    ↓
AWS Amplify Hosting (UI)
    ↓
API Gateway (REST API)
    ↓
Lambda Function
    ↓
DynamoDB
├─ Phrases (id, phrase, createdAt, ttl)
└─ Counter (id=0, counter)
```

**Components:**
- **AWS Amplify** - Hosts static website with auto-deployment from GitHub
- **API Gateway** - REST API endpoints
- **Lambda** - Serverless compute
- **DynamoDB** - NoSQL database with atomic counter

## Setup

### Prerequisites

- Node.js 22+
- AWS CLI configured
- AWS CDK installed: `npm install -g aws-cdk`
- **GitHub account and repository** (for UI auto-deployment)

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Get your AWS account ID
aws sts get-caller-identity --query Account --output text
```

### GitHub Setup (Required for UI)

**Before deploying, set up GitHub integration:**

See detailed guide: **[docs/AMPLIFY_SETUP.md](docs/AMPLIFY_SETUP.md)**

Quick steps:
1. Create GitHub repository
2. Create GitHub Personal Access Token
3. Store token in AWS Secrets Manager
4. Update `config/environments.json` with your GitHub username/repo

### Bootstrap CDK (One-Time Setup)

**IMPORTANT:** Before first deployment, bootstrap AWS CDK in your account:

```powershell
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-central-1 --context environment=development --context awsRegion=eu-central-1 --context awsAccount=YOUR_ACCOUNT_ID
```

This creates required AWS resources for CDK deployments (S3 bucket, IAM roles, etc.). Only needed ONCE per account/region.

### Deployment

**Using PowerShell script (recommended):**
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**Or using CDK directly:**
```bash
npx cdk deploy \
  --context environment=development \
  --context awsRegion=eu-central-1 \
  --context awsAccount=YOUR_ACCOUNT_ID
```

## Usage

After deployment, you'll see both API and Website URLs in the output:

```
Outputs:
AwsTest-development.ApiUrl = https://abc123.execute-api.eu-central-1.amazonaws.com/prod/
AwsTest-development.AmplifyAppUrl = https://main.d1234567890.amplifyapp.com
```

### Option 1: Use Web UI (Recommended)

**Open the Website URL in your browser:**
```
https://main.d1234567890.amplifyapp.com
```

**Features:**
- ✅ Add phrases via form
- ✅ View real-time counter
- ✅ See all phrases
- ✅ Auto-refreshes every 30 seconds
- ✅ Responsive design

### Option 2: Use API Directly

### POST /phrases - Add Phrase

```bash
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d '{"phrase":"Hello World"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phrase": "Hello World",
    "message": "Phrase added successfully"
  }
}
```

### GET /phrases - List All Phrases

```bash
curl https://YOUR_API_URL/phrases
```

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "phrases": [
      { "id": 1, "phrase": "Hello World", "createdAt": "2025-10-29T10:00:00.000Z" },
      { "id": 2, "phrase": "Test phrase", "createdAt": "2025-10-29T10:01:00.000Z" },
      { "id": 3, "phrase": "Another one", "createdAt": "2025-10-29T10:02:00.000Z" }
    ]
  }
}
```

### GET /phrases/{id} - Get Specific Phrase

```bash
curl https://YOUR_API_URL/phrases/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phrase": "Hello World",
    "createdAt": "2025-10-29T10:00:00.000Z"
  }
}
```

### GET /counter - Get Counter

```bash
curl https://YOUR_API_URL/counter
```

**Response:**
```json
{
  "success": true,
  "data": {
    "counter": 3,
    "message": "Current counter value (total phrases added)"
  }
}
```

## Documentation

- [Getting Started](docs/START_HERE.md) - Quick introduction
- [Installation Guide](docs/INSTALLATION.md) - Detailed setup steps
- [Quick Start](docs/QUICKSTART.md) - Fast deployment guide
- [Architecture](docs/COMPLETE_ARCHITECTURE.md) - Full architecture overview
- [Lambda Layers](docs/LAMBDA_LAYERS.md) - Layer architecture explained
- [API Examples](docs/EXAMPLES.md) - Usage examples
- [UI Deployment](docs/UI_DEPLOYMENT.md) - Web UI deployment guide
- [curl Commands](docs/test-curl.md) - Quick test commands

## DynamoDB Counter Implementation

The counter uses **atomic increment** operation:

```typescript
await docClient.send(new UpdateCommand({
  TableName: TABLE_NAME,
  Key: { id: 0 },  // Counter stored at id=0
  UpdateExpression: 'ADD #counter :inc',
  ExpressionAttributeNames: { '#counter': 'counter' },
  ExpressionAttributeValues: { ':inc': 1 },
  ReturnValues: 'UPDATED_NEW'
}));
```

**Benefits:**
- Thread-safe (no race conditions)
- Atomic operation (consistent even with concurrent requests)
- Returns new value after increment

## DynamoDB Table Structure

**Phrases Table:**
```
id (NUMBER, Partition Key) | phrase (STRING) | createdAt (STRING)
─────────────────────────────────────────────────────────────────
0                          | (counter only)  | -
1                          | "Hello World"   | "2025-10-29T10:00:00.000Z"
2                          | "Test phrase"   | "2025-10-29T10:01:00.000Z"
3                          | "Another one"   | "2025-10-29T10:02:00.000Z"
```

**Record at id=0:**
```json
{
  "id": 0,
  "counter": 3  // Auto-increments with each new phrase
}
```

## Testing

```bash
# Add some phrases
curl -X POST https://YOUR_API_URL/phrases -H "Content-Type: application/json" -d '{"phrase":"First"}'
curl -X POST https://YOUR_API_URL/phrases -H "Content-Type: application/json" -d '{"phrase":"Second"}'
curl -X POST https://YOUR_API_URL/phrases -H "Content-Type: application/json" -d '{"phrase":"Third"}'

# Check counter
curl https://YOUR_API_URL/counter
# Should return: {"success":true,"data":{"counter":3}}

# List all phrases
curl https://YOUR_API_URL/phrases

# Get specific phrase
curl https://YOUR_API_URL/phrases/1
```

## Cleanup

```bash
npx cdk destroy \
  --context environment=development \
  --context awsRegion=eu-central-1 \
  --context awsAccount=YOUR_ACCOUNT_ID
```

## Cost Estimation

**For 1000 requests/month:**
- Lambda: ~$0.0002 (256 MB, <1s duration)
- DynamoDB: ~$0.0025 (1000 reads + 1000 writes)
- API Gateway: ~$0.0035 (1000 requests)
- **Total: ~$0.006/month** (under free tier)

## Architecture Comparison

This project uses professional production-ready patterns:
- AWS CDK for infrastructure
- API Gateway REST API
- Lambda with NodejsFunction (esbuild bundling)
- DynamoDB with atomic operations
- TypeScript throughout

**Differences (simplified):**
- No SQS queue (direct Lambda invocation)
- No multiple Lambda functions (single handler with routing)
- No Lambda layers (all code in one function)
- No secrets management (no API keys needed)
- No Blue/Green deployment (development only)

## Troubleshooting

Having deployment issues? Check these common problems:

**1. CDK Not Bootstrapped:**
- Error: "SSM parameter /cdk-bootstrap/... not found"
- Solution: Run `npx cdk bootstrap` (see docs/TROUBLESHOOTING.md)

**2. Reserved Concurrency Limit:**
- Error: "decreases UnreservedConcurrentExecution below minimum"
- Solution: Set `reservedConcurrency: 0` in config/environments.json
- Cause: New AWS accounts often have only 10 concurrent execution limit

**3. Missing Environment Variables:**
- Error: "Missing required environment variables"
- Solution: Create `.env` file from `env.example` and fill all values

**4. GitHub Token Issues:**
- Error: "Access Denied" or "Repository Not Found"
- Solution: Check token in AWS Secrets Manager, verify repo name

**See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for detailed solutions.**

## Next Steps

To add more advanced features:
1. Add API key authentication
2. Split into multiple Lambda functions
3. Add SQS queue for async processing
4. Add environment-based configuration
5. Add Blue/Green deployment
6. Add Lambda layers for shared code

