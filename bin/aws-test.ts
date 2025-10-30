#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsTestStack } from '../lib/aws-test-stack';
import { Environment, EnvironmentConfig } from '../src/shared/types';
import { loadEnvironmentConfig } from './utils';
import { getStackName, getCommonTags } from '../lib/utils/naming';

const app = new cdk.App();

// Get context parameters
function getRequiredContext(key: string): string {
    const value = app.node.tryGetContext(key);
    if (!value) {
        throw new Error(`Missing required context: ${key}. Use: --context ${key}=<value>`);
    }
    return value;
}

const environment = getRequiredContext('environment') as Environment;
const awsRegion = getRequiredContext('awsRegion');
const awsAccount = getRequiredContext('awsAccount');

// Validate environment
const supportedEnvironments: Environment[] = ['development', 'production'];
if (!supportedEnvironments.includes(environment)) {
    throw new Error(`Invalid environment: ${environment}. Supported: ${supportedEnvironments.join(', ')}`);
}

// Load configuration
let envConfig: EnvironmentConfig;

try {
    envConfig = loadEnvironmentConfig(environment);
} catch (error) {
    console.error('❌ Failed to load environment configuration:', (error as Error).message);
    process.exit(1);
}

const stackName = getStackName(environment);

new AwsTestStack(app, stackName, {
    environment,
    envConfig,
    env: {
        account: awsAccount,
        region: awsRegion,
    },
    stackName,
    description: `Phrase storage API for ${environment} environment`,
    tags: getCommonTags(environment),
});

console.log(`
🚀 Deploying AWS Test Stack
📋 Environment: ${environment}
🌍 Region: ${awsRegion}
🏦 Account: ${awsAccount}
🏗️  Stack Name: ${stackName}

🔧 Lambda Configuration:
   • Memory: ${envConfig.lambda.api.memory} MB
   • Timeout: ${envConfig.lambda.api.timeout}s
   • Reserved Concurrency: ${envConfig.lambda.api.reservedConcurrency}

💾 DynamoDB:
   • TTL: ${envConfig.dynamodb.ttlSeconds}s (${Math.floor(envConfig.dynamodb.ttlSeconds / 3600)}h)

🌐 API Gateway:
   • Throttle Rate: ${envConfig.apiGateway.throttleRateLimit}/sec
   • Burst Limit: ${envConfig.apiGateway.throttleBurstLimit}
`);

