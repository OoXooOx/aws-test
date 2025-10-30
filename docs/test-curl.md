# Quick Curl Test Commands

After deployment, replace `YOUR_API_URL` with the actual API Gateway URL.

## Get API URL

```powershell
aws cloudformation describe-stacks `
  --stack-name AwsTest-development `
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
  --output text
```

## Test Commands

```bash
# 1. Add first phrase
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"Hello World\"}"

# Expected: {"success":true,"data":{"id":1,"phrase":"Hello World","message":"Phrase added successfully"}}

# 2. Add second phrase  
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"AWS Lambda\"}"

# Expected: {"success":true,"data":{"id":2,"phrase":"AWS Lambda","message":"Phrase added successfully"}}

# 3. Get counter (should be 2)
curl https://YOUR_API_URL/counter

# Expected: {"success":true,"data":{"counter":2,"message":"Current counter value (total phrases added)"}}

# 4. List all phrases
curl https://YOUR_API_URL/phrases

# Expected: {"success":true,"data":{"count":2,"phrases":[...]}}

# 5. Get phrase by ID
curl https://YOUR_API_URL/phrases/1

# Expected: {"success":true,"data":{"id":1,"phrase":"Hello World","createdAt":"..."}}

# 6. Test validation - phrase too long (101 chars)
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEEFFFFFFFFGGGGGGGGGGHHHHHHHHHHIIIIIIIIIIJJJJJJJJJJK\"}"

# Expected: {"success":false,"error":"Phrase too long. Maximum: 100 characters, received: 101"}

# 7. Test validation - empty phrase
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"\"}"

# Expected: {"success":false,"error":"phrase is required (string)"}
```

## PowerShell Commands

```powershell
# Set API URL (replace with yours)
$ApiUrl = "https://YOUR_API_URL/"

# Add phrase
$Body = @{ phrase = "Hello from PowerShell" } | ConvertTo-Json
$Response = Invoke-RestMethod -Uri "$ApiUrl/phrases" -Method POST -Headers @{"Content-Type"="application/json"} -Body $Body
Write-Host "Added phrase with ID: $($Response.data.id)"

# Get counter
$Counter = Invoke-RestMethod -Uri "$ApiUrl/counter" -Method GET
Write-Host "Counter: $($Counter.data.counter)"

# List phrases
$Phrases = Invoke-RestMethod -Uri "$ApiUrl/phrases" -Method GET
$Phrases.data.phrases | Format-Table id, phrase, createdAt

# Get specific phrase
$Phrase = Invoke-RestMethod -Uri "$ApiUrl/phrases/1" -Method GET
Write-Host "Phrase 1: $($Phrase.data.phrase)"
```

## Testing Atomic Counter

Test that counter increments correctly with concurrent requests:

```powershell
# PowerShell - send 10 concurrent requests
1..10 | ForEach-Object -Parallel {
    $Body = @{ phrase = "Concurrent request $_" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$using:ApiUrl/phrases" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $Body
} -ThrottleLimit 10

# Check counter - should be exactly 10
Invoke-RestMethod -Uri "$ApiUrl/counter" -Method GET
```

**Expected result:**
- Counter = 10 (no duplicates, no missing IDs)
- All 10 phrases stored with unique sequential IDs
- Proves atomic increment works correctly

## How Counter Works

**Data flow:**

```
1. Client → POST /phrases {"phrase":"Hello"}
   ↓
2. Lambda → DynamoDB: ADD counter :1 (atomic)
   ← Returns: counter = 1
   ↓
3. Lambda → DynamoDB: PUT phrase with id=1
   ↓
4. Lambda → Client: {"id":1, "phrase":"Hello"}
```

**DynamoDB operations:**

```typescript
// Step 1: Atomically increment and get new value
const newId = await incrementCounter();  // Returns 1, 2, 3, ...

// Step 2: Store phrase with that ID
await PutCommand({
  Item: {
    id: newId,       // 1, 2, 3, ...
    phrase: "Hello",
    createdAt: "2025-10-29T..."
  }
});
```

**Atomic ADD operation guarantees:**
- Even with 1000 concurrent requests
- Counter increments correctly: 0→1→2→3...→1000
- No duplicate IDs
- No race conditions
- No missing IDs in sequence

This is the DynamoDB equivalent of MongoDB's `findOneAndUpdate` with atomic operations!

