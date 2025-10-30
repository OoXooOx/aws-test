# Lambda Layers Architecture

## Why Lambda Layers?

Following production best practices, dependencies can be organized in Lambda Layers instead of individual Lambda functions.

## Layer Structure

```
src/layers/common/
├── package.json              # AWS SDK dependencies
├── node_modules/             # Installed dependencies
├── nodejs/                   # Built layer (deployed to Lambda)
│   └── node_modules/         # Dependencies copied here
├── src/
│   ├── index.ts              # Exports
│   └── utilities.ts          # DynamoDB operations
└── tsconfig.json
```

## How It Works

### Development (Local)

**Lambda imports from alias:**
```typescript
// src/lambda/api/index.ts
import { incrementCounter, getCounter, createPhrase } 
  from '../../shared/common-layer-alias';
```

**Alias points to local code:**
```typescript
// src/shared/common-layer-alias.ts
export * from '../layers/common/src/index';
```

**TypeScript compiles** → finds dependencies in `src/layers/common/node_modules/`

### Runtime (AWS Lambda)

**Layer mounted at `/opt/nodejs`:**
```
/opt/nodejs/
└── node_modules/
    ├── @aws-sdk/
    └── utilities.js  (compiled from src/utilities.ts)

/var/task/
└── index.js  (your Lambda code)
```

**Lambda imports from layer:**
```javascript
// At runtime, imports resolve to /opt/nodejs
const { incrementCounter } = require('/opt/nodejs');
```

**CDK configuration handles the mapping:**
```typescript
bundling: {
  externalModules: [
    '@aws-sdk/*',      // Don't bundle (from layer)
    '/opt/nodejs',     // Don't bundle (from layer)
    '/opt/nodejs/*',   // Don't bundle (from layer)
  ],
}
```

## Benefits

### 1. Smaller Lambda Deployment Packages

**Without layers:**
```
Lambda package:
├── index.js (10 KB)
└── node_modules/ (15 MB)  ← Huge!
Total: 15.01 MB
```

**With layers:**
```
Lambda package:
└── index.js (10 KB)  ← Just your code!

Layer package (shared):
└── node_modules/ (15 MB)

Total deployed: 15.01 MB
But Lambda package: 0.01 MB ✅
```

### 2. Faster Deployments

**Without layers:**
- Every deploy uploads 15 MB
- Takes 30-60 seconds

**With layers:**
- First deploy: Upload layer (15 MB) + Lambda (10 KB)
- Subsequent deploys: Only upload Lambda (10 KB) ← **3000x faster!**
- Takes 3-5 seconds

### 3. Shared Dependencies

**Multiple Lambdas can share same layer:**
```
Common Layer (15 MB) ← Deployed once
    ↓       ↓       ↓
Lambda 1  Lambda 2  Lambda 3
(10 KB)   (12 KB)   (8 KB)

Total uploaded: 15 MB + 30 KB
Instead of: 45 MB (15 MB × 3)
```

### 4. Independent Versioning

**Update Lambda code** → Only redeploy Lambda (fast)  
**Update dependencies** → Only redeploy layer (shared across all Lambdas)

## Build Process

### 1. Install Layer Dependencies

```powershell
cd src/layers/common
npm install
```

### 2. Build Layer

```powershell
npm run build
```

**What happens:**
```
1. tsc compiles TypeScript → dist/
2. npm install --omit=dev → production dependencies only
3. Copy node_modules to nodejs/node_modules/
4. Result: nodejs/ folder ready for Lambda
```

### 3. Build Everything

```powershell
cd ../../../
npm run build
```

**Runs:**
1. `npm run build:layers` → Builds common layer
2. `tsc` → Compiles CDK and Lambda code

## Layer Contents After Build

```
src/layers/common/nodejs/
└── node_modules/
    ├── @aws-sdk/client-dynamodb/
    ├── @aws-sdk/lib-dynamodb/
    ├── @aws-sdk/client-secrets-manager/
    └── utilities.js (compiled from src/utilities.ts)
```

This `nodejs/` folder is what gets deployed to Lambda as a layer!

## Lambda Configuration

**CDK adds layer to Lambda:**
```typescript
new StandardLambdaFunction(this, 'ApiLambda', {
  entry: './src/lambda/api/index.ts',
  layers: [commonLayer],  ← Attaches layer
  bundling: {
    externalModules: [
      '@aws-sdk/*',    ← Don't bundle (from layer)
      '/opt/nodejs',
      '/opt/nodejs/*',
    ],
  },
});
```

**At runtime:**
- AWS mounts layer at `/opt/nodejs`
- Node.js automatically finds modules there
- Your code imports work seamlessly

## Comparison

| Aspect | Without Layer | With Layer (Production Pattern) |
|--------|---------------|-------------------------------------------|
| Lambda package size | 15 MB | 10 KB |
| Deployment time | 30-60s | 3-5s |
| Shared dependencies | No | Yes (across Lambdas) |
| Code organization | Mixed | Separated |
| Production-ready | No | ✅ Yes |

## File Organization

**Lambda function (minimal):**
```
src/lambda/api/
├── index.ts           # Business logic only
└── package.json       # No dependencies! (only devDependencies)
```

**Common layer (shared code):**
```
src/layers/common/
├── package.json       # Runtime dependencies (AWS SDK)
├── src/
│   ├── utilities.ts   # DynamoDB operations
│   └── index.ts       # Exports
└── nodejs/            # Built layer (gitignored)
```

**Alias (development convenience):**
```
src/shared/
└── common-layer-alias.ts  # Points to local code in dev, /opt/nodejs in Lambda
```

## Adding More Layers

### Example: Add OpenAI Layer

**1. Create layer:**
```
src/layers/openai/
├── package.json       # "openai": "^6.1.0"
├── src/
│   └── client.ts      # OpenAI client code
└── tsconfig.json
```

**2. Add to layers stack:**
```typescript
const openaiLayer = new LambdaLayer(this, 'OpenAILayer', {
  sourcePath: './src/layers/openai',
  layerVersionName: 'aws-test-dev-openai',
  description: 'OpenAI SDK',
});
```

**3. Attach to Lambda:**
```typescript
layers: [commonLayer, openaiLayer]
```

## Summary

✅ **Common layer created** (production pattern)  
✅ **AWS SDK in layer** (not in Lambda)  
✅ **DynamoDB utilities in layer** (reusable)  
✅ **Lambda function minimal** (just business logic)  
✅ **Faster deployments** (only deploy changed code)  
✅ **Production-ready pattern** (same as main project)  

**Now `aws-test` follows production-ready architecture!** 🎯

