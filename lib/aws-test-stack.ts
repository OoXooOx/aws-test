import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Environment, EnvironmentConfig } from '../src/shared/types';
import { ResourceNaming } from './utils/naming';
import { LayersStack, DatabaseStack, IamStack, LambdaStack, ApiGatewayStack, AmplifyStack } from './stacks';

export interface AwsTestStackProps extends cdk.StackProps {
    environment: Environment;
    envConfig: EnvironmentConfig;
}

/**
 * Main Stack
 * Orchestrates all infrastructure stacks using modular architecture patterns
 */
export class AwsTestStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AwsTestStackProps) {
        super(scope, id, props);

        const { environment, envConfig } = props;
        const naming = new ResourceNaming(environment);

        // Lambda Layers
        const layers = new LayersStack(this, 'Layers', {
            envConfig,
            naming,
        });

        // Database
        const database = new DatabaseStack(this, 'Database', {
            envConfig,
            naming,
        });

        // IAM Roles
        const iam = new IamStack(this, 'Iam', {
            envConfig,
            naming,
            phrasesTable: database.phrasesTable,
        });

        // Common environment variables for Lambda
        const commonEnv = {
            NODE_ENV: environment,
            TABLE_NAME: database.phrasesTable.tableName,
            TASK_TTL_SECONDS: envConfig.dynamodb.ttlSeconds.toString(),
        };

        // Lambda Functions
        const lambda = new LambdaStack(this, 'Lambda', {
            envConfig,
            naming,
            lambdaRole: iam.lambdaRole,
            commonLayer: layers.commonLayer,
            commonEnv,
        });

        // API Gateway
        const apiGateway = new ApiGatewayStack(this, 'ApiGateway', {
            envConfig,
            naming,
            lambdaStack: lambda,
        });

        // Static Website Hosting (S3)
        // Note: Using S3 static website hosting instead of AWS Amplify
        // Amplify requires Git repository - S3 is simpler for this use case
        new AmplifyStack(this, 'Website', {
            envConfig,
            naming,
            apiUrl: apiGateway.apiUrl,
        });
    }
}

