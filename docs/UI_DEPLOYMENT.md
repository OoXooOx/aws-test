# UI Deployment Guide

## Overview

The UI is automatically deployed to S3 static website hosting during stack deployment.

## Deployment Process

### 1. Deploy Stack (Includes UI)

```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**What happens:**
1. CDK creates S3 bucket for website hosting
2. UI files (HTML, CSS, JS) are uploaded to S3
3. `config.js` is generated with API endpoint URL
4. S3 bucket is configured for public website access
5. Website URL is output in CloudFormation outputs

### 2. Get Website URL

```powershell
aws cloudformation describe-stacks `
  --stack-name AwsTest-development `
  --query "Stacks[0].Outputs[?OutputKey=='WebsiteUrl'].OutputValue" `
  --output text
```

**Example output:**
```
http://aws-test-development-ui.s3-website.eu-central-1.amazonaws.com
```

### 3. Open in Browser

```powershell
# Open URL in browser
start http://YOUR_WEBSITE_URL
```

## UI Architecture

### Static Files Deployed to S3:

```
S3 Bucket: aws-test-development-ui
├── index.html       (UI structure)
├── styles.css       (styling)
├── app.js           (JavaScript logic)
└── config.js        (auto-generated with API URL)
```

### Configuration Injection

**During deployment, CDK generates:**
```javascript
// config.js
window.CONFIG = { 
  API_ENDPOINT: "https://abc123.execute-api.eu-central-1.amazonaws.com/prod/" 
};
```

**app.js loads it:**
```javascript
let API_URL = window.CONFIG.API_ENDPOINT;
```

**Result:** UI automatically connects to the correct API! ✅

## How S3 Website Hosting Works

### Request Flow:

```
User types URL in browser
    ↓
http://aws-test-development-ui.s3-website.eu-central-1.amazonaws.com
    ↓
S3 serves index.html
    ↓
Browser loads styles.css, config.js, app.js
    ↓
app.js makes API calls
    ↓
https://YOUR_API.execute-api.eu-central-1.amazonaws.com/prod/phrases
    ↓
API Gateway → Lambda → DynamoDB
    ↓
Response to browser
    ↓
UI updates
```

### CORS Configuration

**S3 bucket CORS:**
```typescript
cors: [{
  allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
  allowedOrigins: ['*'],
  allowedHeaders: ['*'],
}]
```

**API Gateway CORS:**
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: ['*'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}
```

**Both configured** → browser can call API from S3-hosted website!

## Update UI After Deployment

### Option 1: Redeploy Entire Stack

```powershell
# Make changes to ui/ files
# Then redeploy
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**CDK will:**
- Detect UI file changes
- Re-upload to S3
- Update config.js if API URL changed

### Option 2: Manual S3 Upload

```powershell
# Get bucket name
$BucketName = aws cloudformation describe-stacks `
  --stack-name AwsTest-development `
  --query "Stacks[0].Outputs[?OutputKey=='TableName'].OutputValue" `
  --output text | ForEach-Object { $_.Replace('phrases', 'ui') }

# Upload changed files
aws s3 cp ui/app.js s3://$BucketName/app.js
aws s3 cp ui/styles.css s3://$BucketName/styles.css
aws s3 cp ui/index.html s3://$BucketName/index.html
```

## Local Development

### 1. Create config.js Manually

```javascript
// ui/config.js
window.CONFIG = { 
  API_ENDPOINT: "https://YOUR_API_URL/" 
};
```

### 2. Serve Locally

```powershell
cd ui
python -m http.server 8000
```

### 3. Test in Browser

```
http://localhost:8000
```

### 4. Make Changes

- Edit HTML/CSS/JS
- Refresh browser
- Test functionality

### 5. Deploy Changes

```powershell
cd ..
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

## Why S3 Instead of AWS Amplify?

**AWS Amplify:**
- ❌ Requires Git repository
- ❌ Needs CI/CD pipeline
- ❌ More complex setup
- ❌ Higher cost ($0.01 per build minute)

**S3 Static Website:**
- ✅ Direct file upload
- ✅ No Git required
- ✅ Simple deployment
- ✅ Very cheap (~$0.005/month)

**For simple static sites like this, S3 is perfect!**

## Alternative: Amplify Console (Manual)

If you want to use Amplify Console for Git-based deployments:

### 1. Push UI to Git

```powershell
git init
git add ui/
git commit -m "Add UI"
git push origin main
```

### 2. Create Amplify App in Console

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Connect Git repository
4. Select branch: main
5. Set build settings:
   - Build command: (none)
   - Root directory: ui/
6. Add environment variable: `API_ENDPOINT=YOUR_API_URL`
7. Deploy

### 3. Update app.js

```javascript
const API_URL = process.env.API_ENDPOINT || window.CONFIG.API_ENDPOINT;
```

**But for this test project, S3 is simpler!**

## Cost Comparison

**S3 Static Website (Current):**
- ~$0.005/month

**AWS Amplify Console:**
- Build minutes: $0.01/minute
- Hosting: $0.15/GB/month
- Data transfer: $0.15/GB
- **Total: ~$0.50-1/month**

**S3 is 100x cheaper for static sites!**

## Summary

✅ **UI automatically deployed** with `.\deploy.ps1`  
✅ **Configuration injected** during deployment  
✅ **Publicly accessible** via S3 website URL  
✅ **CORS configured** - API calls work from browser  
✅ **Auto-refresh** - Updates every 30 seconds  
✅ **Cost effective** - ~$0.005/month  

**Open the Website URL from deployment outputs and start using the UI!** 🚀

