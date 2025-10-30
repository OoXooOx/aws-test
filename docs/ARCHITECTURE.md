# Architecture - Professional Modular Patterns

This project uses **professional modular architecture** for production-ready serverless applications.

## Modular Structure

### 1. Configuration Management

**config/environments.json:**
```json
{
  "development": {
    "lambda": { "api": { "memory": 256, ... } },
    "dynamodb": { "ttlSeconds": 86400 },
    "apiGateway": { "throttleRateLimit": 100, ... }
  },
  "production": { ... }
}
```

**Benefits:**
- Environment-specific settings (dev vs prod)
- Easy to modify without code changes
- Same pattern as main project

### 2. Resource Naming (`lib/utils/naming.ts`)

**Centralized naming utilities:**
```typescript
const naming = new ResourceNaming('development');

naming.lambda.api              // aws-test-development-api
naming.dynamodb.phrasesTable   // aws-test-development-phrases
naming.api.restApi             // aws-test-development-api
```

**Benefits:**
- Consistent naming across all resources
- Environment-aware prefixes
- Single source of truth

### 3. Reusable Constructs (`lib/constructs/`)

**Reusable components:**
- `StandardLambdaFunction` - Lambda with standard config
- `DynamoDbTable` - DynamoDB table wrapper
- `IamRole` - IAM role wrapper
- `ApiGatewayConstruct` - API Gateway with routes

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent configuration
- Easy to extend

### 4. Modular Stacks (`lib/stacks/`)

**Separated concerns:**
```typescript
// Main stack orchestrates sub-stacks
const database = new DatabaseStack(...)
const iam = new IamStack(...)
const lambda = new LambdaStack(...)
const apiGateway = new ApiGatewayStack(...)
```

**Benefits:**
- Clear separation of concerns
- Easy to understand
- Easy to modify individual components

## Architecture Components

| Component | Status | Description |
|-----------|--------|-------------|
| **Config loading** | ✅ bin/utils.ts | Environment-based configuration loading |
| **Environment config** | ✅ config/environments.json | Development and production settings |
| **Resource naming** | ✅ lib/utils/naming.ts | Centralized naming conventions |
| **Modular stacks** | ✅ lib/stacks/ | Separated concerns by stack |
| **Reusable constructs** | ✅ lib/constructs/ | Shared infrastructure patterns |
| **Type definitions** | ✅ src/shared/types.ts | ✅ src/shared/types.ts |
| **Lambda layers** | ✅ 3 layers | ❌ Not needed (simple project) |
| **Multiple Lambdas** | ✅ 3 functions | ✅ 1 function (can expand) |
| **SQS Queue** | ✅ For async processing | ❌ Not needed (direct invocation) |
| **Secrets Manager** | ✅ For API keys | ❌ Not needed (no secrets) |

## Stack Organization

### Database Stack (`lib/stacks/database.ts`)

- Creates DynamoDB table
- Configures TTL
- Uses DynamoDbTable construct
- Outputs table name

### IAM Stack (`lib/stacks/iam.ts`)

- Creates Lambda execution role
- Grants DynamoDB permissions
- Uses IamRole construct

### Lambda Stack (`lib/stacks/lambda.ts`)

- Creates Lambda function
- Configures memory, timeout, concurrency from config
- Uses StandardLambdaFunction construct

### API Gateway Stack (`lib/stacks/api-gateway.ts`)

- Creates REST API
- Adds routes
- Configures throttling from config
- Uses ApiGatewayConstruct
- Outputs API URL

## Resource Naming Pattern

**Format:** `aws-test-{environment}-{resource}`

**Examples:**
```
Lambda:   aws-test-development-api
DynamoDB: aws-test-development-phrases
API:      aws-test-development-api
Role:     aws-test-development-lambda-role
```

## Configuration Flow

```
1. bin/aws-test.ts
   ├─ Loads environment from context
   ├─ Calls loadEnvironmentConfig(environment)
   └─ Reads config/environments.json

2. lib/aws-test-stack.ts
   ├─ Creates ResourceNaming(environment)
   ├─ Creates DatabaseStack(envConfig, naming)
   ├─ Creates IamStack(envConfig, naming)
   ├─ Creates LambdaStack(envConfig, naming)
   └─ Creates ApiGatewayStack(envConfig, naming)

3. Each stack uses:
   ├─ envConfig for settings (memory, timeout, etc.)
   └─ naming for resource names
```

## Benefits of This Architecture

### 1. Separation of Concerns

Each stack manages one aspect:
- Database stack → only DynamoDB
- IAM stack → only permissions
- Lambda stack → only functions
- API stack → only routes

### 2. Reusability

Constructs can be reused:
```typescript
// Add another Lambda easily
new StandardLambdaFunction(this, 'AnotherLambda', {
  entry: './src/lambda/another/index.ts',
  functionName: naming.lambda.another,
  ...
});
```

### 3. Environment Management

Change config without touching code:
```json
// config/environments.json
"production": {
  "lambda": {
    "api": {
      "memory": 512,  // Change this, redeploy
      ...
    }
  }
}
```

### 4. Testability

Each construct and stack can be tested independently.

## How to Extend

### Add New Lambda Function

**1. Add to config:**
```json
"lambda": {
  "api": { ... },
  "worker": {  // New function
    "memory": 512,
    "timeout": 60,
    "reservedConcurrency": 50
  }
}
```

**2. Add to naming:**
```typescript
// lib/utils/naming.ts
get worker(): string {
  return `${this.prefix}-worker`;
}

get workerPath(): string {
  return './src/lambda/worker/index.ts';
}
```

**3. Add to Lambda stack:**
```typescript
// lib/stacks/lambda.ts
this.workerLambda = new StandardLambdaFunction(this, 'WorkerLambda', {
  entry: naming.lambda.workerPath,
  functionName: naming.lambda.worker,
  functionConfig: envConfig.lambda.worker,
  ...
});
```

### Add SQS Queue

**1. Create construct** (`lib/constructs/sqs-queue.ts`)

**2. Create queue stack** (`lib/stacks/queue.ts`)

**3. Wire in main stack:**
```typescript
const queue = new QueueStack(...)
const lambda = new LambdaStack(..., queue.processingQueue)
```

### Add Lambda Layers

**1. Create layer construct** (`lib/constructs/lambda-layer.ts`)

**2. Create layers stack** (`lib/stacks/layers.ts`)

**3. Pass layers to Lambda stack:**
```typescript
const layers = new LayersStack(...)
const lambda = new LambdaStack(..., layers.commonLayer)
```

## Why This Architecture?

**Benefits of This Architecture:**

✅ **Maintainability** - Easy to find and modify components  
✅ **Scalability** - Add resources without changing existing code  
✅ **Testability** - Test each component independently  
✅ **Reusability** - Constructs work across projects  
✅ **Configuration** - Change settings without code changes  
✅ **Best Practices** - Follows AWS CDK patterns  

This is the **production-ready architecture** used in real projects, not a simplified tutorial version.

