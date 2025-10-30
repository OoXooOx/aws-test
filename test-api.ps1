# Test API after deployment
param(
    [string]$ApiUrl,
    [string]$Environment = "development",
    [string]$Region
)

Write-Host "🧪 Testing AWS Test API" -ForegroundColor Blue
Write-Host "=======================" -ForegroundColor Blue
Write-Host ""

# Get API URL if not provided
if (-not $ApiUrl) {
    if (-not $Region) {
        $Region = aws configure get region
        if (-not $Region) { $Region = "eu-central-1" }
    }
    
    Write-Host "📡 Getting API URL from stack outputs..." -ForegroundColor Cyan
    $StackName = "AwsTest-$Environment"
    $ApiUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
        --output text
    
    if (-not $ApiUrl) {
        Write-Host "❌ API URL not found. Is the stack deployed?" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🔗 API URL: $ApiUrl" -ForegroundColor Green
Write-Host ""

# Test 1: Add phrases
Write-Host "📝 Test 1: Adding phrases..." -ForegroundColor Cyan

$Phrases = @("Hello World", "This is a test", "AWS Lambda rocks!")

foreach ($Phrase in $Phrases) {
    $Body = @{ phrase = $Phrase } | ConvertTo-Json
    Write-Host "  Adding: $Phrase"
    
    $Response = Invoke-RestMethod -Uri "$ApiUrl/phrases" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $Body
    
    Write-Host "  ✅ Added with ID: $($Response.data.id)" -ForegroundColor Green
}

Write-Host ""

# Test 2: Get counter
Write-Host "📊 Test 2: Getting counter..." -ForegroundColor Cyan
$Counter = Invoke-RestMethod -Uri "$ApiUrl/counter" -Method GET
Write-Host "  Counter value: $($Counter.data.counter)" -ForegroundColor Green
Write-Host ""

# Test 3: List all phrases
Write-Host "📋 Test 3: Listing all phrases..." -ForegroundColor Cyan
$AllPhrases = Invoke-RestMethod -Uri "$ApiUrl/phrases" -Method GET
Write-Host "  Total phrases: $($AllPhrases.data.count)" -ForegroundColor Green

foreach ($Item in $AllPhrases.data.phrases) {
    Write-Host "  [$($Item.id)] $($Item.phrase)" -ForegroundColor White
}

Write-Host ""

# Test 4: Get specific phrase
Write-Host "🔍 Test 4: Getting phrase by ID..." -ForegroundColor Cyan
$SpecificPhrase = Invoke-RestMethod -Uri "$ApiUrl/phrases/1" -Method GET
Write-Host "  ID 1: $($SpecificPhrase.data.phrase)" -ForegroundColor Green

Write-Host ""

# Test 5: Validation - phrase too long
Write-Host "⚠️  Test 5: Testing validation (phrase too long)..." -ForegroundColor Cyan
$LongPhrase = "A" * 101  # 101 characters

try {
    $Body = @{ phrase = $LongPhrase } | ConvertTo-Json
    $Response = Invoke-RestMethod -Uri "$ApiUrl/phrases" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $Body
    
    Write-Host "  ❌ Validation failed - long phrase was accepted!" -ForegroundColor Red
} catch {
    Write-Host "  ✅ Validation working - phrase rejected (too long)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "  - Check DynamoDB console for stored data"
Write-Host "  - View Lambda logs in CloudWatch"
Write-Host "  - Try your own API requests"

