# Troubleshooting Guide

Common deployment issues and solutions for the AWS Test project.

## Table of Contents

1. [CDK Bootstrap Issues](#cdk-bootstrap-issues)
2. [Lambda Concurrency Limits](#lambda-concurrency-limits)
3. [Environment Variables](#environment-variables)
4. [GitHub/Amplify Issues](#github-amplify-issues)
5. [AWS Credentials](#aws-credentials)
6. [Build Errors](#build-errors)

---

## CDK Bootstrap Issues

### Error: "SSM parameter not found. Has the environment been bootstrapped?"

**Full error message:**
```
AwsTest-development: SSM parameter /cdk-bootstrap/hnb659fds/version not found. 
Has the environment been bootstrapped? Please run 'cdk bootstrap'
(see https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html)
```

**Cause:**
AWS CDK requires a one-time setup called "bootstrapping" before you can deploy stacks. This creates:
- S3 bucket for deployment assets
- IAM roles for CloudFormation
- ECR repository for Docker images
- SSM parameters for version tracking

**Solution:**

**1. Run bootstrap command:**
```powershell
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/eu-central-1 --context environment=development --context awsRegion=eu-central-1 --context awsAccount=YOUR_ACCOUNT_ID
```

**Example:**
```powershell
npx cdk bootstrap aws://123456789012/eu-central-1 --context environment=development --context awsRegion=eu-central-1 --context awsAccount=123456789012
```

**2. Wait for completion (2-3 minutes):**
```
✅ Environment aws://123456789012/eu-central-1 bootstrapped.
```

**3. Try deployment again:**
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**Note:** This is a **ONE-TIME setup** per AWS account + region combination. If you deploy to multiple regions, bootstrap each one separately.

---

## Lambda Concurrency Limits

### Error: "ReservedConcurrentExecutions decreases UnreservedConcurrentExecution below minimum"

**Full error message:**
```
Resource handler returned message: "Specified ReservedConcurrentExecutions for function 
decreases account's UnreservedConcurrentExecution below its minimum value of [10]. 
(Service: Lambda, Status Code: 400)"
```

**Cause:**

New AWS accounts often start with a **reduced Lambda concurrent execution limit** (10 instead of the standard 1,000).

**Why this happens:**
- AWS account total limit: 10 concurrent executions
- Config tried to reserve: 100 or 200
- AWS requirement: Must leave 10 unreserved
- Result: 10 total - 100 reserved = impossible!

**Solution A - Set Reserved Concurrency to 0 (Recommended for Testing):**

**1. Edit `config/environments.json`:**

Find the Lambda configuration and change `reservedConcurrency` to `0`:

```json
"lambda": {
    "api": {
        "memory": 256,
        "timeout": 30,
        "reservedConcurrency": 0,  ← Change from 100 to 0
        "provisionedConcurrency": 0,
        ...
    }
}
```

**Do this for BOTH `development` and `production` environments.**

**2. Redeploy:**
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

**What `reservedConcurrency: 0` means:**
- No reservation (uses from unreserved pool)
- Still FREE (no extra cost)
- Works with any account limit
- Lambda shares available capacity with other functions

**Solution B - Request Limit Increase (For Production):**

If you want higher limits for production use:

**1. Check current limit:**
- AWS Console → Service Quotas
- Select region: **Frankfurt (eu-central-1)**
- Search: "Lambda"
- Click: "AWS Lambda"
- Find: "Concurrent executions"
- Current value: Likely shows 10

**2. Request increase:**
- Click "Request increase at account level"
- New quota value: **1,000** (standard)
- Reason: "Need higher concurrency for production workload"
- Submit request

**3. Wait for approval:**
- Usually approved within 24-48 hours
- Sometimes instant for standard increases
- Check email for confirmation

**4. After approval, update config:**
```json
"reservedConcurrency": 100  ← Can now use reservations
```

**Understanding the limits:**
- **Total limit:** Total concurrent executions for ALL Lambdas in the account
- **Reserved:** Dedicated capacity for specific Lambda (can't be used by others)
- **Unreserved:** Shared pool available to all Lambdas
- **AWS requires:** Minimum 10 unreserved must remain available

---

## Environment Variables

### Error: "Missing required environment variables for Amplify GitHub integration"

**Full error message:**
```
Error: Missing required environment variables for Amplify GitHub integration.
Please set GITHUB_OWNER and GITHUB_REPOSITORY in your .env file.
See docs/AMPLIFY_SETUP.md for details.
```

**Cause:**
The `.env` file is missing or doesn't have all required variables.

**Solution:**

**1. Check if `.env` file exists:**
```powershell
Test-Path .env
```

If it returns `False`, create it:
```powershell
Copy-Item env.example .env
```

**2. Edit `.env` file with your values:**

Open `.env` and fill in ALL of these (no empty values):

```bash
# AWS Credentials (REQUIRED)
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=eu-central-1
AWS_ACCOUNT_ID=123456789012

# GitHub Configuration (REQUIRED for Amplify)
GITHUB_OWNER=your-github-username
GITHUB_REPOSITORY=aws-test
GITHUB_TOKEN_SECRET_NAME=github/personal-access-token
```

**3. Verify no variables are empty:**

Each line should have a value after `=`:
- ✅ `GITHUB_OWNER=john-doe`
- ❌ `GITHUB_OWNER=` (empty - will fail!)

**4. Redeploy:**
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

The deploy script will:
- Load `.env` file
- Validate all required variables
- Show specific error if any are missing

---

## GitHub/Amplify Issues

### Error: "Access Denied" or "Repository Not Found"

**Cause:** Amplify can't access your GitHub repository.

**Solutions:**

**1. Check GitHub token permissions:**
- Token needs `repo` scope (full control of private repositories)
- Token needs `admin:repo_hook` scope (for webhooks)
- Token must not be expired

**2. Verify token in AWS Secrets Manager:**
- Go to: AWS Console → Secrets Manager
- Region: **eu-central-1** (Frankfurt)
- Find: `github/personal-access-token`
- Click "Retrieve secret value"
- Verify it's the correct token

**3. Update token if expired:**
- Generate new token on GitHub
- Update in Secrets Manager:
```powershell
# Via AWS Console:
# Secrets Manager → github/personal-access-token → Edit → Update value

# Or recreate secret:
# Delete old secret first, then create new one
```

**4. Verify repository name in `.env`:**
```bash
GITHUB_OWNER=correct-username  ← Check spelling
GITHUB_REPOSITORY=correct-repo-name  ← Must match exactly
```

**5. Check repository exists:**
- Go to: https://github.com/YOUR_USERNAME/YOUR_REPO
- Make sure repository exists and is accessible
- Check repository visibility (public or private both work)

---

## AWS Credentials

### Error: "AWS credentials not configured" or "Unable to locate credentials"

**Cause:** CDK can't find your AWS credentials.

**Solution:**

**Option 1 - Use .env file:**

Add to your `.env` file:
```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=eu-central-1
```

**Option 2 - Install AWS CLI and configure:**

```powershell
# Install AWS CLI from: https://aws.amazon.com/cli/

# Configure credentials
aws configure
```

You'll be prompted for:
- Access Key ID
- Secret Access Key
- Default region: `eu-central-1`
- Output format: `json`

**Get AWS credentials:**
1. AWS Console → IAM
2. Users → Create user (or use existing)
3. Security credentials → Create access key
4. Select use case: "Command Line Interface (CLI)"
5. Download credentials

---

## Build Errors

### Error: "Lock file at src\lambda\api\package-lock.json doesn't exist"

**Cause:** Lambda construct looking for `package-lock.json` in wrong location.

**Solution:** Already fixed in latest version. If you encounter this:
- Make sure `lib/constructs/lambda-function.ts` uses `depsLockFilePath: './package-lock.json'`
- Run `npm run build` to rebuild
- Try deployment again

### Error: "Cannot find module '@aws-cdk/aws-amplify-alpha'"

**Cause:** Missing dependency.

**Solution:**
```powershell
npm install
```

This installs the `@aws-cdk/aws-amplify-alpha` package required for Amplify hosting.

### TypeScript compilation errors

**Solution:**
```powershell
# Clean build
npm run clean
npm install
npm run build
```

---

## Deployment Script Errors

### PowerShell: "Missing closing '}' in statement block"

**Cause:** File encoding issue with special characters (emojis).

**Solution:**
- The deploy.ps1 has been updated to use ASCII characters only
- If you still see this, re-download or recreate the file

### PowerShell: "aws: command not found"

**This is NOT an error!** The deploy script tries to use AWS CLI to check bootstrap status, but if AWS CLI isn't installed, it safely continues.

**You can ignore this warning:**
```
aws : The term 'aws' is not recognized...
```

The script will continue and use CDK commands which work with .env credentials.

---

## Checking Your Configuration

### Verify .env file is loaded:

Run the deploy script and check the output:
```
Loading environment variables from .env file...
  Loaded: GITHUB_OWNER
  Loaded: GITHUB_REPOSITORY
  Loaded: AWS_REGION
  Loaded: AWS_ACCOUNT_ID
  Loaded: AWS_ACCESS_KEY_ID
  Loaded: AWS_SECRET_ACCESS_KEY
Environment variables loaded
```

If you see **"Warning: .env file not found"**, create it from `env.example`.

### Verify AWS credentials work:

```powershell
npx cdk doctor
```

This checks if CDK can access AWS with your credentials.

### Check Lambda limits:

1. AWS Console → Service Quotas
2. Region: **eu-central-1**
3. AWS Lambda → Concurrent executions
4. Check "Applied account-level quota value"

If it shows **10** (not 1,000), you have a new account with reduced limits.

---

## Stack Rollback/Cleanup

### Failed deployment left resources

If deployment fails, CloudFormation automatically rolls back and deletes created resources.

**To manually clean up:**

1. AWS Console → CloudFormation
2. Find stack: `AwsTest-development`
3. If status is `ROLLBACK_COMPLETE`:
   - Select the stack
   - Click "Delete"
4. Wait for deletion to complete
5. Try deployment again

### Delete everything

To completely remove all resources:

```powershell
npx cdk destroy --context environment=development --context awsRegion=eu-central-1 --context awsAccount=YOUR_ACCOUNT_ID
```

---

## Getting Help

**Check these resources:**

1. **AWS CDK Documentation:** https://docs.aws.amazon.com/cdk/
2. **AWS Lambda Limits:** https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
3. **AWS Amplify Docs:** https://docs.aws.amazon.com/amplify/
4. **Project README:** [../README.md](../README.md)
5. **Setup Guide:** [AMPLIFY_SETUP.md](AMPLIFY_SETUP.md)

**Still having issues?**

Check you have:
- ✅ `.env` file with all required values filled
- ✅ GitHub repository created and code pushed
- ✅ GitHub token stored in AWS Secrets Manager
- ✅ CDK bootstrapped in your account/region
- ✅ `reservedConcurrency: 0` in config (if account has low limits)
- ✅ Node.js 22+ installed
- ✅ AWS credentials configured (in .env or via AWS CLI)

---

## Quick Deployment Checklist

Run through this checklist before deploying:

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] GitHub Personal Access Token created (with `repo` and `admin:repo_hook` scopes)
- [ ] Token stored in AWS Secrets Manager (name: `github/personal-access-token`)
- [ ] `.env` file created (copy from `env.example`)
- [ ] `.env` file filled with ALL required values (no empty values)
- [ ] AWS CDK bootstrapped (`npx cdk bootstrap aws://ACCOUNT/REGION...`)
- [ ] `npm install` completed
- [ ] `npm run build` completed successfully
- [ ] Region set to Frankfurt (eu-central-1) in AWS Console
- [ ] Reserved concurrency set to 0 (if account limit is low)

**Ready to deploy!**
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

