# AWS Test Project - Deployment Script (PowerShell)
# Usage: .\deploy.ps1 [environment] [region] [account]


param(
    [string]$Environment = "development",
    [string]$Region,
    [string]$Account
)

Write-Host "AWS Test Project - Deployment" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""

# Load environment variables from .env file
if (Test-Path ".env") {
    Write-Host "Loading environment variables from .env file..." -ForegroundColor Blue
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.+?)\s*$') {
            $name = $matches[1]
            $value = $matches[2]
            Set-Item -Path "env:$name" -Value $value
            Write-Host "  Loaded: $name" -ForegroundColor Gray
        }
    }
    Write-Host "Environment variables loaded" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
    Write-Host "Create .env file from env.example for GitHub integration" -ForegroundColor Yellow
    Write-Host ""
}

# Validate required environment variables
Write-Host "Validating environment variables..." -ForegroundColor Blue
$MissingVars = @()

# Check AWS credentials
if (-not $env:AWS_ACCESS_KEY_ID) {
    $MissingVars += "AWS_ACCESS_KEY_ID"
}
if (-not $env:AWS_SECRET_ACCESS_KEY) {
    $MissingVars += "AWS_SECRET_ACCESS_KEY"
}

# Check GitHub configuration (required for Amplify)
if (-not $env:GITHUB_OWNER) {
    $MissingVars += "GITHUB_OWNER"
}
if (-not $env:GITHUB_REPOSITORY) {
    $MissingVars += "GITHUB_REPOSITORY"
}

# Display errors if any variables are missing
if ($MissingVars.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: Missing required environment variables!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Missing variables:" -ForegroundColor Yellow
    foreach ($var in $MissingVars) {
        Write-Host "  - $var" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please edit your .env file and add these variables:" -ForegroundColor Yellow
    Write-Host "  1. Copy env.example to .env (if not done yet)" -ForegroundColor Cyan
    Write-Host "  2. Edit .env and fill in all required values" -ForegroundColor Cyan
    Write-Host "  3. See docs/AMPLIFY_SETUP.md for detailed instructions" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "All required environment variables present" -ForegroundColor Green
Write-Host ""

# Get AWS region
if (-not $Region) {
    $Region = aws configure get region
    if (-not $Region) {
        $Region = "eu-central-1"
        Write-Host "Using default region: $Region" -ForegroundColor Yellow
    } else {
        Write-Host "Region: $Region" -ForegroundColor Green
    }
} else {
    Write-Host "Region: $Region" -ForegroundColor Green
}

# Get AWS account ID
if (-not $Account) {
    $AccountInfo = aws sts get-caller-identity --region $Region 2>&1 | ConvertFrom-Json
    if (-not $AccountInfo) {
        Write-Host "AWS credentials not configured" -ForegroundColor Red
        Write-Host "Please run: aws configure" -ForegroundColor Yellow
        exit 1
    }
    $Account = $AccountInfo.Account
}

Write-Host "Account: $Account" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Blue

$NodeVersion = node --version
if (-not $NodeVersion) {
    Write-Host "Node.js not installed" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $NodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green

# Build
Write-Host ""
Write-Host "Building TypeScript..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful" -ForegroundColor Green

# Bootstrap CDK (if needed)
Write-Host ""
Write-Host "Checking CDK bootstrap..." -ForegroundColor Blue
$BootstrapStack = aws cloudformation describe-stacks --stack-name CDKToolkit --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Bootstrapping CDK..." -ForegroundColor Yellow
    npx cdk bootstrap "aws://$Account/$Region"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "CDK bootstrap failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "CDK bootstrapped" -ForegroundColor Green
} else {
    Write-Host "CDK already bootstrapped" -ForegroundColor Green
}

# Deploy
Write-Host ""
Write-Host "Deploying stack..." -ForegroundColor Blue
Write-Host "Stack: AwsTest-$Environment" -ForegroundColor Cyan

npx cdk deploy `
    --context environment=$Environment `
    --context awsRegion=$Region `
    --context awsAccount=$Account `
    --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host ""

# Get stack outputs
Write-Host "Stack Outputs:" -ForegroundColor Blue
aws cloudformation describe-stacks `
    --stack-name "AwsTest-$Environment" `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
