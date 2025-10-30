import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface ApiGatewayProps {
    apiName: string;
    description: string;
    stageName: string;
    cors?: {
        allowOrigins?: string[];
        allowMethods?: string[];
        allowHeaders?: string[];
    };
    throttling?: {
        rateLimit: number;
        burstLimit: number;
    };
}

export interface RouteProps {
    path: string;
    method: string;
    handler: lambda.IFunction;
}

/**
 * Reusable API Gateway Construct
 */
export class ApiGatewayConstruct extends Construct {
    public readonly restApi: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: ApiGatewayProps) {
        super(scope, id);

        const { apiName, description, stageName, cors, throttling } = props;

        this.restApi = new apigateway.RestApi(this, 'RestApi', {
            restApiName: apiName,
            description,
            deployOptions: {
                stageName,
                ...(throttling && {
                    throttlingRateLimit: throttling.rateLimit,
                    throttlingBurstLimit: throttling.burstLimit,
                }),
            },
            defaultCorsPreflightOptions: {
                allowOrigins: cors?.allowOrigins || apigateway.Cors.ALL_ORIGINS,
                allowMethods: cors?.allowMethods || apigateway.Cors.ALL_METHODS,
                allowHeaders: cors?.allowHeaders || ['Content-Type'],
            },
        });
    }

    addRoute(props: RouteProps): apigateway.Resource {
        const { path, method, handler } = props;

        const pathParts = path.split('/').filter((p) => p.length > 0);
        let resource: apigateway.IResource = this.restApi.root;

        for (const part of pathParts) {
            const existingResource = resource.getResource(part);
            resource = existingResource || resource.addResource(part);
        }

        const integration = new apigateway.LambdaIntegration(handler);
        resource.addMethod(method, integration);

        return resource as apigateway.Resource;
    }
}

