import { Construct } from 'constructs';
import { CfnOutput, Tags } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { EnvironmentConfig } from '../../src/shared/types';
import { ResourceNaming } from '../utils/naming';
import { LambdaStack } from './lambda';
import { ApiGatewayConstruct } from '../constructs';

export interface ApiGatewayStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
    lambdaStack: LambdaStack;
}

/**
 * API Gateway Stack
 * Contains API Gateway and routes
 * 
 * Uses alias-aware Lambda references to support Blue/Green deployment.
 * In production (with Blue/Green enabled), routes connect to 'prod' alias.
 * In development, routes connect directly to Lambda function.
 */
export class ApiGatewayStack extends Construct {
    public readonly apiUrl: string;

    constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
        super(scope, id);

        const { envConfig, naming, lambdaStack } = props;

        const apiConstruct = new ApiGatewayConstruct(this, 'Api', {
            apiName: naming.api.restApi,
            description: naming.api.apiDescription,
            stageName: naming.api.stageName,
            throttling: {
                rateLimit: envConfig.apiGateway.throttleRateLimit,
                burstLimit: envConfig.apiGateway.throttleBurstLimit,
            },
        });

        // Get alias-aware Lambda reference (supports Blue/Green deployment)
        // Uses alias if available (production), otherwise uses function directly (development)
        const handler = lambdaStack.apiLambda.alias || lambdaStack.apiLambda.function;

        // POST /phrases
        apiConstruct.addRoute({
            path: 'phrases',
            method: 'POST',
            handler,
        });

        // GET /phrases
        apiConstruct.addRoute({
            path: 'phrases',
            method: 'GET',
            handler,
        });

        // GET /phrases/{id}
        const phrasesResource = apiConstruct.restApi.root.getResource('phrases');
        if (phrasesResource) {
            const idResource = phrasesResource.addResource('{id}');
            idResource.addMethod('GET', new apigateway.LambdaIntegration(handler));
        }

        // GET /counter
        apiConstruct.addRoute({
            path: 'counter',
            method: 'GET',
            handler,
        });

        // Store API URL for use by other stacks
        this.apiUrl = apiConstruct.restApi.url;

        // CloudFormation output
        new CfnOutput(this, naming.outputs.apiUrl, {
            value: this.apiUrl,
            description: 'API Gateway URL',
            exportName: `${naming.prefix}-ApiUrl`,
        });

        Tags.of(this).add('Component', 'api-gateway');
    }
}

