# Architecture Notes - Production Patterns

## Complete File Structure Match

### Production Architecture Files:

✅ **config/environments.json** - Environment-specific settings  
✅ **lib/utils/naming.ts** - Resource naming utilities  
✅ **lib/constructs/** - Reusable CDK components  
✅ **lib/stacks/** - Modular stack organization  
✅ **src/shared/types.ts** - TypeScript types  
✅ **bin/utils.ts** - Configuration loader  
✅ **env.example** - Environment variables template  
✅ **.gitignore** - Ignore .env files  

### Why Some Files Are Minimal

**env.example:**
- Included for architecture consistency
- Currently empty (no secrets needed)
- Ready for future extensions (API keys, etc.)
- Matches production best practices

**Current project needs NO secrets:**
- No AI API keys (unlike main project)
- No external services
- Just AWS resources (DynamoDB, Lambda)

### When You Extend the Project

If you add features requiring secrets:

**1. Add to env.example:**
```bash
# Example
EXTERNAL_API_KEY=your-key-here
```

**2. Create .env file:**
```bash
cp env.example .env
# Edit .env with real values
```

**3. Add Secrets Manager stack** (production pattern):
```typescript
const secrets = new SecretsStack(this, 'Secrets', {
  envConfig,
  naming,
});
```

**4. Load in Lambda:**
```typescript
const apiKey = await getSecret(process.env.API_KEY_SECRET_NAME);
```

## Architecture Principles (Production Best Practices)

### 1. Configuration Over Code

**Bad:**
```typescript
// Hardcoded in code
memorySize: 256,
timeout: 30,
```

**Good (production pattern):**
```typescript
// From config file
memorySize: functionConfig.memory,
timeout: functionConfig.timeout,
```

**Benefits:**
- Change settings without code changes
- Different configs for dev/prod
- Easy to review settings

### 2. Centralized Naming

**Bad:**
```typescript
// Scattered naming logic
tableName: `my-table-${env}`,
functionName: `my-func-${env}`,
apiName: `my-api-${env}`,
```

**Good (production pattern):**
```typescript
// Centralized in naming.ts
tableName: naming.dynamodb.phrasesTable,
functionName: naming.lambda.api,
apiName: naming.api.restApi,
```

**Benefits:**
- Consistent naming pattern
- Easy to change prefix
- Single source of truth

### 3. Reusable Constructs

**Bad:**
```typescript
// Repeat same code for each Lambda
new lambda.Function(this, 'Lambda1', {
  runtime: lambda.Runtime.NODEJS_22_X,
  memorySize: 256,
  timeout: Duration.seconds(30),
  bundling: { ... },
  // ...
});

new lambda.Function(this, 'Lambda2', {
  runtime: lambda.Runtime.NODEJS_22_X,
  memorySize: 512,
  timeout: Duration.seconds(60),
  bundling: { ... },  // Same config repeated!
  // ...
});
```

**Good (production pattern):**
```typescript
// Reusable construct with standard config
new StandardLambdaFunction(this, 'Lambda1', {
  entry: './src/lambda/api/index.ts',
  functionConfig: envConfig.lambda.api,
  // Common config applied automatically
});
```

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent configuration
- Easy to update all Lambdas at once

### 4. Modular Stacks

**Bad:**
```typescript
// One huge file (500+ lines)
export class MainStack {
  constructor() {
    // DynamoDB code (100 lines)
    // IAM code (100 lines)
    // Lambda code (150 lines)
    // API Gateway code (150 lines)
  }
}
```

**Good (production pattern):**
```typescript
// lib/aws-test-stack.ts (60 lines) - orchestrates
const database = new DatabaseStack(...);   // 50 lines
const iam = new IamStack(...);            // 40 lines
const lambda = new LambdaStack(...);      // 40 lines
const api = new ApiGatewayStack(...);     // 60 lines
```

**Benefits:**
- Easy to find code
- Each file has single responsibility
- Can test stacks independently
- Easy to extend

## Current vs Full Production Architecture

### Current aws-test Has:

✅ Modular architecture  
✅ Configuration files  
✅ Naming utilities  
✅ Reusable constructs  
✅ Separated stacks  

### Full Production Apps Also Have:

- Lambda layers (3 layers for shared code)
- Multiple Lambda functions (3 functions)
- SQS queue (async processing)
- Secrets Manager (API keys)
- Blue/Green deployment
- API key authentication
- Monitoring (X-Ray, Insights)
- Deployment scripts (bash/PowerShell)

**You can add these features** using the same patterns!

## File-by-File Comparison

| File | Production Apps | aws-test |
|------|-------------------------|----------|
| config/environments.json | ✅ Complex (many settings) | ✅ Simple (basic settings) |
| lib/utils/naming.ts | ✅ 470 lines | ✅ 160 lines (scaled down) |
| lib/constructs/*.ts | ✅ 6 constructs | ✅ 4 constructs |
| lib/stacks/*.ts | ✅ 6 stacks | ✅ 4 stacks |
| bin/utils.ts | ✅ Config validation | ✅ Config loading |
| env.example | ✅ 6 API keys | ✅ Ready for future |

**The pattern is identical** - just scaled to project needs!

## Summary

**env.example is now included!**

It's currently empty because this test project doesn't need secrets. But it's there for:
1. Architecture consistency with production patterns
2. Ready for future extensions
3. Follows same pattern

The project now **fully follows** production-ready architecture! 🎯

