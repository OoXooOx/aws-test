# Quick Start Guide

## 1. Install Dependencies

```powershell
cd C:\New\WagmiV3\aws-test
npm install
```

## 2. Build Project

```powershell
npm run build
```

## 3. Get AWS Account ID

```powershell
aws sts get-caller-identity --query Account --output text
```

**Copy the account ID** (e.g., `123456789012`)

## 4. Deploy to AWS

**Option A: Using PowerShell script (Recommended)**

```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**Option B: Using npm script**

First, edit `package.json` and replace `YOUR_ACCOUNT_ID` with your actual account ID, then:

```powershell
npm run deploy
```

**Option C: Manual CDK deploy**

```powershell
npx cdk deploy `
  --context environment=development `
  --context awsRegion=eu-central-1 `
  --context awsAccount=YOUR_ACCOUNT_ID
```

## 5. Get API URL

After deployment, copy the API URL from outputs:

```
Outputs:
AwsTest-development.ApiUrl = https://abc123xyz.execute-api.eu-central-1.amazonaws.com/prod/
```

## 6. Test API

**Option A: Using PowerShell test script**

```powershell
.\test-api.ps1 -ApiUrl "https://YOUR_API_URL/"
```

**Option B: Manual curl commands**

```powershell
# Add phrase
curl -X POST https://YOUR_API_URL/phrases `
  -H "Content-Type: application/json" `
  -d '{\"phrase\":\"Hello World\"}'

# Get counter
curl https://YOUR_API_URL/counter

# List phrases
curl https://YOUR_API_URL/phrases

# Get phrase by ID
curl https://YOUR_API_URL/phrases/1
```

## 7. View Logs

```powershell
# Get Lambda function name
aws lambda list-functions `
  --query "Functions[?starts_with(FunctionName, 'aws-test-api')].FunctionName" `
  --output text

# Tail logs (replace FUNCTION_NAME)
aws logs tail /aws/lambda/FUNCTION_NAME --follow
```

## 8. Cleanup (Delete Stack)

```powershell
npx cdk destroy `
  --context environment=development `
  --context awsRegion=eu-central-1 `
  --context awsAccount=YOUR_ACCOUNT_ID
```

## Troubleshooting

### "AWS credentials not configured"

```powershell
aws configure
```

Enter your AWS Access Key ID, Secret Access Key, and region.

### "CDK not bootstrapped"

The deploy script handles this automatically. If manual bootstrap needed:

```powershell
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-central-1
```

### "Build failed"

Check TypeScript errors:

```powershell
npm run build
```

### "API returns 500 error"

Check Lambda logs:

```powershell
aws logs tail /aws/lambda/aws-test-api-AwsTest-development --follow
```

## Expected Costs

**Free tier covers:**
- 1 million Lambda requests/month
- 25 GB DynamoDB storage
- 400,000 GB-seconds Lambda compute

**For 1000 requests/month:**
- Lambda: $0.0002
- DynamoDB: $0.0025
- API Gateway: $0.0035
- **Total: $0.006/month** (basically free)

## What This Project Demonstrates

✅ AWS CDK infrastructure as code
✅ API Gateway REST API
✅ Lambda function with TypeScript
✅ DynamoDB with atomic counter
✅ CORS enabled for browser access
✅ Request validation
✅ Error handling
✅ CloudFormation outputs

## Architecture Overview

**Similar:**
- AWS CDK for infrastructure
- TypeScript throughout
- API Gateway + Lambda + DynamoDB
- Atomic DynamoDB operations

**Simplified:**
- Single Lambda function (vs 3 functions)
- No SQS queue
- No Lambda layers
- No secrets management
- No environment configuration files
- No Blue/Green deployment

This is a **minimal working example** you can expand with additional features as needed.

