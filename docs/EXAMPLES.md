# API Examples

Replace `YOUR_API_URL` with your actual API Gateway URL from deployment outputs.

## Add Phrases

```bash
# Add first phrase
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"Hello World\"}"

# Response:
# {"success":true,"data":{"id":1,"phrase":"Hello World","message":"Phrase added successfully"}}

# Add more phrases
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"AWS Lambda is awesome\"}"

curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"DynamoDB atomic counters work great\"}"
```

## Get Counter

```bash
curl https://YOUR_API_URL/counter

# Response:
# {"success":true,"data":{"counter":3,"message":"Current counter value (total phrases added)"}}
```

## List All Phrases

```bash
curl https://YOUR_API_URL/phrases

# Response:
# {
#   "success": true,
#   "data": {
#     "count": 3,
#     "phrases": [
#       {"id":1,"phrase":"Hello World","createdAt":"2025-10-29T10:00:00.000Z"},
#       {"id":2,"phrase":"AWS Lambda is awesome","createdAt":"2025-10-29T10:01:00.000Z"},
#       {"id":3,"phrase":"DynamoDB atomic counters work great","createdAt":"2025-10-29T10:02:00.000Z"}
#     ]
#   }
# }
```

## Get Specific Phrase

```bash
# Get phrase with ID 1
curl https://YOUR_API_URL/phrases/1

# Response:
# {"success":true,"data":{"id":1,"phrase":"Hello World","createdAt":"2025-10-29T10:00:00.000Z"}}

# Get phrase with ID 2
curl https://YOUR_API_URL/phrases/2

# Get non-existent phrase
curl https://YOUR_API_URL/phrases/999
# Response: {"success":false,"error":"Phrase not found"}
```

## Validation Tests

```bash
# Test: Empty phrase
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"\"}"

# Response: {"success":false,"error":"phrase is required (string)"}

# Test: Missing phrase field
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{}"

# Response: {"success":false,"error":"phrase is required (string)"}

# Test: Phrase too long (101 characters)
curl -X POST https://YOUR_API_URL/phrases \
  -H "Content-Type: application/json" \
  -d "{\"phrase\":\"AAAAAAAAAABBBBBBBBBBCCCCCCCCCCDDDDDDDDDDEEEEEEEEEEFFFFFFFFGGGGGGGGGGHHHHHHHHHHIIIIIIIIIIJJJJJJJJJJK\"}"

# Response: {"success":false,"error":"Phrase too long. Maximum: 100 characters, received: 101"}
```

## PowerShell Examples

```powershell
# Add phrase
$Body = @{ phrase = "Hello from PowerShell" } | ConvertTo-Json
Invoke-RestMethod -Uri "https://YOUR_API_URL/phrases" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $Body

# Get counter
Invoke-RestMethod -Uri "https://YOUR_API_URL/counter" -Method GET

# List phrases
$Result = Invoke-RestMethod -Uri "https://YOUR_API_URL/phrases" -Method GET
$Result.data.phrases | Format-Table id, phrase, createdAt

# Get specific phrase
Invoke-RestMethod -Uri "https://YOUR_API_URL/phrases/1" -Method GET
```

## Concurrent Requests Test

Test the atomic counter with concurrent requests:

```bash
# Send 10 requests simultaneously (bash)
for i in {1..10}; do
  curl -X POST https://YOUR_API_URL/phrases \
    -H "Content-Type: application/json" \
    -d "{\"phrase\":\"Concurrent request $i\"}" &
done
wait

# Check counter - should be exactly 10
curl https://YOUR_API_URL/counter
```

**Expected result:**
- Counter increases by exactly 10 (atomic increment prevents race conditions)
- All phrases get unique IDs (no duplicates)
- No missing IDs in sequence

## Architecture Notes

**Counter Implementation:**
- Uses DynamoDB atomic `ADD` operation
- Thread-safe (no race conditions)
- ID stored at `id=0` in same table
- Each phrase gets next sequential ID

**ID Assignment Flow:**
```
Request 1: Increment counter (0→1), store phrase with id=1
Request 2: Increment counter (1→2), store phrase with id=2
Request 3: Increment counter (2→3), store phrase with id=3
```

**Even with concurrent requests:**
- Counter increments atomically
- Each request gets unique ID
- No ID collisions

