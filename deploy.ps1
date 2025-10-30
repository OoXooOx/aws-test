# AWS Test Project - Deployment Script (PowerShell)
# Usage: .\deploy.ps1 [environment] [region] [account]

param(
    [string]$Environment = "development",
    [string]$Region,
    [string]$Account
)

Write-Host "🚀 AWS Test Project - Deployment" -ForegroundColor Blue
Write-Host "=================================" -ForegroundColor Blue
Write-Host ""

# Get AWS region
if (-not $Region) {
    $Region = aws configure get region
    if (-not $Region) {
        $Region = "eu-central-1"
        Write-Host "⚠️  Using default region: $Region" -ForegroundColor Yellow
    } else {
        Write-Host "📍 Region: $Region" -ForegroundColor Green
    }
} else {
    Write-Host "📍 Region: $Region" -ForegroundColor Green
}

# Get AWS account ID
if (-not $Account) {
    $AccountInfo = aws sts get-caller-identity --region $Region 2>&1 | ConvertFrom-Json
    if (-not $AccountInfo) {
        Write-Host "❌ AWS credentials not configured" -ForegroundColor Red
        Write-Host "Please run: aws configure" -ForegroundColor Yellow
        exit 1
    }
    $Account = $AccountInfo.Account
}

Write-Host "🏦 Account: $Account" -ForegroundColor Green
Write-Host "🏗️  Environment: $Environment" -ForegroundColor Green
Write-Host ""

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Blue

$NodeVersion = node --version
if (-not $NodeVersion) {
    Write-Host "❌ Node.js not installed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $NodeVersion" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Build
Write-Host ""
Write-Host "🔨 Building TypeScript..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green

# Bootstrap CDK (if needed)
Write-Host ""
Write-Host "🏗️  Checking CDK bootstrap..." -ForegroundColor Blue
$BootstrapStack = aws cloudformation describe-stacks --stack-name CDKToolkit --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚡ Bootstrapping CDK..." -ForegroundColor Yellow
    npx cdk bootstrap "aws://$Account/$Region"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ CDK bootstrap failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ CDK bootstrapped" -ForegroundColor Green
} else {
    Write-Host "✅ CDK already bootstrapped" -ForegroundColor Green
}

# Deploy
Write-Host ""
Write-Host "🚀 Deploying stack..." -ForegroundColor Blue
Write-Host "Stack: AwsTest-$Environment" -ForegroundColor Cyan

npx cdk deploy `
    --context environment=$Environment `
    --context awsRegion=$Region `
    --context awsAccount=$Account `
    --require-approval never

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""

# Get stack outputs
Write-Host "📋 Stack Outputs:" -ForegroundColor Blue
aws cloudformation describe-stacks `
    --stack-name "AwsTest-$Environment" `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output table

Write-Host ""
Write-Host "🎉 Deployment completed!" -ForegroundColor Green

