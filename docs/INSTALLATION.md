# Installation & Deployment Guide

## Step-by-Step Instructions

### 1. Navigate to Project

```powershell
cd C:\New\WagmiV3\aws-test
```

### 2. Install Dependencies

```powershell
npm install
```

**This installs:**
- AWS CDK (infrastructure)
- TypeScript compiler
- AWS SDK v3
- esbuild (bundler)

**Expected output:**
```
added 234 packages in 45s
```

### 3. Build TypeScript

```powershell
npm run build
```

**This compiles:**
- `bin/aws-test.ts` → `dist/bin/aws-test.js`
- `lib/aws-test-stack.ts` → `dist/lib/aws-test-stack.js`

### 4. Get Your AWS Account ID

```powershell
aws sts get-caller-identity
```

**Copy the Account ID from output:**
```json
{
  "UserId": "...",
  "Account": "123456789012",  ← Copy this
  "Arn": "..."
}
```

### 5. Deploy Using PowerShell Script

```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**Replace `YOUR_ACCOUNT_ID`** with the ID from step 4.

**What the script does:**
1. ✅ Checks AWS credentials
2. ✅ Installs dependencies
3. ✅ Builds TypeScript
4. ✅ Bootstraps CDK (first time only)
5. ✅ Deploys stack to AWS
6. ✅ Shows outputs (API URL)

**Expected output:**
```
🚀 AWS Test Project - Deployment
=================================

📍 Region: eu-central-1
🏦 Account: 123456789012
🏗️  Environment: development

🔍 Checking prerequisites...
✅ Node.js: v22.0.0

📦 Installing dependencies...
✅ Dependencies installed

🔨 Building TypeScript...
✅ Build successful

🏗️  Checking CDK bootstrap...
✅ CDK already bootstrapped

🚀 Deploying stack...
Stack: AwsTest-development

AwsTest-development: deploying...
AwsTest-development: creating CloudFormation changeset...
...
✅ AwsTest-development

Outputs:
AwsTest-development.ApiUrl = https://abc123xyz.execute-api.eu-central-1.amazonaws.com/prod/
AwsTest-development.TableName = aws-test-phrases-AwsTest-development

✅ Deployment successful!
```

### 6. Copy API URL

From the outputs above, copy the **ApiUrl** value:
```
https://abc123xyz.execute-api.eu-central-1.amazonaws.com/prod/
```

### 7. Test API

**Option A: Using PowerShell test script**

```powershell
.\test-api.ps1 -ApiUrl "https://YOUR_API_URL/"
```

**Option B: Manual curl test**

```powershell
# Add phrase
curl -X POST https://YOUR_API_URL/phrases `
  -H "Content-Type: application/json" `
  -d '{\"phrase\":\"Hello World\"}'

# Get counter
curl https://YOUR_API_URL/counter

# List phrases
curl https://YOUR_API_URL/phrases
```

## Verification

### Check Lambda Function

```powershell
aws lambda list-functions `
  --query "Functions[?starts_with(FunctionName, 'aws-test-api')].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}" `
  --output table
```

**Expected:**
```
FunctionName: aws-test-api-AwsTest-development
Runtime: nodejs22.x
Memory: 256 MB
```

### Check DynamoDB Table

```powershell
aws dynamodb describe-table `
  --table-name aws-test-phrases-AwsTest-development `
  --query "Table.{Name:TableName,Status:TableStatus,Items:ItemCount}" `
  --output table
```

### View Lambda Logs

```powershell
# Get function name
$FunctionName = aws lambda list-functions `
  --query "Functions[?starts_with(FunctionName, 'aws-test-api')].FunctionName" `
  --output text

# Tail logs
aws logs tail "/aws/lambda/$FunctionName" --follow
```

## Cleanup (Delete Everything)

```powershell
npx cdk destroy `
  --context environment=development `
  --context awsRegion=eu-central-1 `
  --context awsAccount=YOUR_ACCOUNT_ID
```

**This deletes:**
- Lambda function
- API Gateway
- DynamoDB table (and all data!)
- IAM roles

## Troubleshooting

### Error: "AWS credentials not configured"

```powershell
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: `eu-central-1`
- Default output format: `json`

### Error: "CDK not bootstrapped"

```powershell
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-central-1
```

### Error: "Module not found"

```powershell
# Clean and reinstall
Remove-Item node_modules -Recurse -Force
npm install
npm run build
```

### Error: "API returns 500"

Check Lambda logs:

```powershell
aws logs tail /aws/lambda/aws-test-api-AwsTest-development --since 5m
```

### Error: "Cannot find TypeScript"

```powershell
npm install -g typescript
# Or use npx:
npx tsc --version
```

## Cost Information

**AWS Free Tier (first 12 months):**
- Lambda: 1M requests/month + 400,000 GB-seconds
- DynamoDB: 25 GB storage + 200M requests
- API Gateway: 1M requests/month (first 12 months)

**After free tier (for 1000 requests/month):**
- Lambda: $0.0002
- DynamoDB: $0.0025
- API Gateway: $0.0035
- **Total: ~$0.006/month**

## Next Steps

After successful deployment:

1. **Read API documentation:**
   - `README.md` - Full documentation
   - `EXAMPLES.md` - API usage examples
   - `test-curl.md` - Quick curl commands

2. **Understand the code:**
   - `src/lambda/api/index.ts` - Lambda handler
   - `lib/aws-test-stack.ts` - Infrastructure definition

3. **Extend the project:**
   - Add authentication (API keys)
   - Add more routes
   - Add Lambda layers
   - Add SQS for async processing
   - Add environment configurations

4. **Next Steps:**
   - See `PROJECT_STRUCTURE.md` for comparison
   - Learn production patterns from the main project

