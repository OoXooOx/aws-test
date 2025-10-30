# AWS Amplify Hosting Setup Guide

This guide explains how to set up AWS Amplify Hosting with GitHub integration for automatic UI deployments.

## Overview

AWS Amplify Hosting provides:
- ✅ **Automatic deployments** on git push
- ✅ **Branch previews** (main, dev, feature branches)
- ✅ **Built-in CDN** (CloudFront) for global delivery
- ✅ **Free SSL certificate** (HTTPS automatically)
- ✅ **Environment variables** injected at build time
- ✅ **Rollback capability** to previous deployments
- ✅ **Custom domains** support

## Prerequisites

1. **GitHub Account** - Free account at https://github.com
2. **AWS Account** - With appropriate permissions
3. **Git installed** - On your local machine
4. **AWS CLI configured** - For secrets management

## Step-by-Step Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `aws-test` (or your preferred name)
3. Visibility: **Public** or **Private** (both work)
4. Click "Create repository"

### Step 2: Push Your Code to GitHub

```powershell
# Initialize git (if not already done)
cd C:\New\WagmiV3\aws-test
git init

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/aws-test.git

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Push to GitHub
git push -u origin main
```

### Step 3: Create GitHub Personal Access Token

Amplify needs a token to access your repository.

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Token name: `aws-amplify-access`
4. Expiration: **No expiration** (or 90 days, your choice)
5. Select scopes:
   - ✅ **repo** (Full control of private repositories)
   - ✅ **admin:repo_hook** (if you want webhooks)
6. Click **"Generate token"**
7. **COPY THE TOKEN** - You won't see it again!

Example token: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 4: Store Token in AWS Secrets Manager

```powershell
# Store GitHub token in AWS Secrets Manager
aws secretsmanager create-secret `
    --name github/personal-access-token `
    --description "GitHub Personal Access Token for Amplify" `
    --secret-string "ghp_your_token_here" `
    --region eu-central-1
```

**Important:** Replace `ghp_your_token_here` with your actual token!

### Step 5: Configure Environment Variables

GitHub credentials are stored in `.env` file (not committed to Git) for security.

**1. Copy the example file:**
```powershell
cp env.example .env
```

**2. Edit `.env` file and add your GitHub information:**
```bash
# .env file (NOT committed to Git)
GITHUB_OWNER=your-github-username
GITHUB_REPOSITORY=aws-test
GITHUB_TOKEN_SECRET_NAME=github/personal-access-token
```

**Example:**
```bash
GITHUB_OWNER=john-doe
GITHUB_REPOSITORY=aws-test
GITHUB_TOKEN_SECRET_NAME=github/personal-access-token
```

**Important:** The `.env` file is already in `.gitignore` and will NOT be committed to your repository. This keeps your personal information private.

### Step 6: Deploy the Stack

```powershell
# Deploy infrastructure (includes Amplify)
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

This will:
1. Create the Amplify app
2. Connect it to your GitHub repository
3. Trigger the first deployment automatically
4. Output the Amplify URL

### Step 7: Access Your Deployed UI

After deployment completes, you'll see outputs:

```
Outputs:
AwsTestStack.AmplifyAppUrl = https://main.d1234567890.amplifyapp.com
AwsTestStack.AmplifyConsoleUrl = https://console.aws.amazon.com/amplify/...
AwsTestStack.ApiUrl = https://abc123.execute-api.eu-central-1.amazonaws.com/prod/
```

**Your UI is now live!** Visit the `AmplifyAppUrl`.

## How It Works

### Automatic Deployments

```
You: git push origin main
         ↓
GitHub: Webhook triggers
         ↓
Amplify: Detects change
         ↓
Amplify: Runs build
         ↓
Amplify: Deploys to CDN
         ↓
Live: ~2 minutes later
```

### Build Process

Amplify runs these commands (defined in `lib/stacks/amplify.ts`):

```bash
# Generate config.js with environment variables
echo "// Auto-generated configuration" > config.js
echo "window.CONFIG = { API_ENDPOINT: \"$API_ENDPOINT\" };" >> config.js
```

The `API_ENDPOINT` is automatically injected from your API Gateway URL.

### Environment Variables

Amplify automatically injects:
- `API_ENDPOINT` - Your API Gateway URL
- `ENVIRONMENT` - `development` or `production`

These are available during the build and in your `config.js` file.

## Branch Deployments

### Main Branch
```
main branch → https://main.d1234.amplifyapp.com (production)
```

### Development Branch
```
dev branch → https://dev.d1234.amplifyapp.com (testing)
```

### Feature Branches (if enablePRPreviews: true)
```
feature/new-ui → https://pr-5.d1234.amplifyapp.com (preview)
```

**To enable:**
```powershell
git checkout -b dev
git push origin dev
```

Amplify will automatically create a new deployment for the `dev` branch!

## Monitoring Deployments

### Amplify Console
Visit the `AmplifyConsoleUrl` to:
- View deployment status
- See build logs
- Check deployed branches
- Configure settings
- View traffic analytics

### CloudWatch Logs
Amplify build logs are also in CloudWatch:
```
/aws/amplify/aws-test-dev-ui
```

## Troubleshooting

### Build Fails with "Access Denied"

**Problem:** Amplify can't access your GitHub repository.

**Solution:**
1. Check token permissions (needs `repo` scope)
2. Verify token is not expired
3. Update token in Secrets Manager:
   ```powershell
   aws secretsmanager update-secret `
       --secret-id github/personal-access-token `
       --secret-string "ghp_new_token_here"
   ```

### Build Succeeds but API Calls Fail

**Problem:** UI deployed but can't call API.

**Solution:**
1. Check CORS settings in API Gateway
2. Verify `API_ENDPOINT` in Amplify Console → Environment Variables
3. Check browser console for errors

### "Repository Not Found"

**Problem:** Wrong repository name or owner in `.env` file.

**Solution:**
Update your `.env` file:
```bash
GITHUB_OWNER=correct-username
GITHUB_REPOSITORY=correct-repo-name
```

Then redeploy:
```powershell
.\deploy.ps1 development eu-central-1 YOUR_ACCOUNT_ID
```

### "Missing required environment variables"

**Problem:** `.env` file not created or variables not set.

**Solution:**
1. Make sure you copied `env.example` to `.env`
2. Fill in all required values:
   ```bash
   GITHUB_OWNER=your-username
   GITHUB_REPOSITORY=your-repo
   ```
3. Redeploy

## Updating Your UI

### Method 1: Push to GitHub (Automatic)
```powershell
# Edit files in ui/ folder
# Commit and push
git add ui/
git commit -m "Update UI"
git push origin main

# Amplify auto-deploys in ~2 minutes
```

### Method 2: Manual Trigger
1. Go to Amplify Console
2. Select your app
3. Click "Redeploy this version"

## Rollback

If deployment introduces bugs:

1. Go to Amplify Console
2. Click "Deployments" tab
3. Find previous working version
4. Click "..." → "Promote to main"

**Instant rollback!**

## Custom Domain (Optional)

To use your own domain (e.g., `app.example.com`):

1. Go to Amplify Console
2. Click "Domain management"
3. Add domain
4. Follow DNS configuration steps
5. SSL certificate auto-generated

## Cost Estimate

**Amplify Hosting:**
- First 1000 build minutes/month: **Free**
- First 15 GB data served/month: **Free**
- Additional build minutes: $0.01/minute
- Additional data: $0.15/GB

**Typical monthly cost for this app:** **$0** (under free tier)

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Create GitHub token
3. ✅ Store token in Secrets Manager
4. ✅ Update config
5. ✅ Deploy stack
6. 🎉 Enjoy automatic deployments!

## Comparison: S3 vs Amplify

| Feature | S3 Static Website | Amplify Hosting |
|---------|-------------------|-----------------|
| **Deployment** | Manual upload | Auto on git push |
| **CDN** | No (or separate CloudFront) | Built-in |
| **SSL** | Manual setup | Automatic |
| **Rollback** | Manual | One click |
| **Branch previews** | No | Yes |
| **Environment variables** | No | Yes |
| **Build process** | None | Customizable |
| **Cost (typical)** | $0.50/month | $0/month (free tier) |

**Amplify is better for:**
- Teams using Git workflow
- Multiple environments (dev/staging/prod)
- Automatic deployments
- Preview deployments

**S3 is better for:**
- Very simple static sites
- No Git integration needed
- Cost sensitivity (large traffic)

---

**Questions?** Check the [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/)

