import { RemovalPolicy } from 'aws-cdk-lib';
import { Environment } from '../../src/shared/types';

/**
 * Generate resource prefix for the given environment
 */
export function getResourcePrefix(environment: Environment): string {
    return `aws-test-${environment}`;
}

/**
 * Get removal policy based on environment
 */
export function getRemovalPolicyForEnvironment(environment: Environment): RemovalPolicy {
    return environment === 'production' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY;
}

/**
 * DynamoDB naming
 */
export class DynamoDBNaming {
    private readonly prefix: string;
    private readonly remvPolicy: RemovalPolicy;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
        this.remvPolicy = getRemovalPolicyForEnvironment(environment);
    }

    get phrasesTable(): string {
        return `${this.prefix}-phrases`;
    }

    get removalPolicy(): RemovalPolicy {
        return this.remvPolicy;
    }
}

/**
 * Lambda naming
 */
export class LambdaNaming {
    private readonly prefix: string;
    private readonly environment: Environment;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
        this.environment = environment;
    }

    get api(): string {
        return `${this.prefix}-api`;
    }

    get apiPath(): string {
        return './src/lambda/api/index.ts';
    }

    get stage(): Environment {
        return this.environment;
    }
}

/**
 * API Gateway naming
 */
export class ApiGatewayNaming {
    private readonly prefix: string;
    private readonly environment: Environment;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
        this.environment = environment;
    }

    get restApi(): string {
        return `${this.prefix}-api`;
    }

    get stageName(): string {
        return this.environment;
    }

    get apiDescription(): string {
        return `Phrase storage API - ${this.environment}`;
    }
}

/**
 * IAM naming
 */
export class IAMNaming {
    private readonly prefix: string;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
    }

    get lambdaRole(): string {
        return `${this.prefix}-lambda-role`;
    }
}

/**
 * Lambda Layer naming
 */
export class LayerNaming {
    private readonly prefix: string;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
    }

    get commonLayer(): string {
        return `${this.prefix}-common`;
    }

    get commonLayerPath(): string {
        return './src/layers/common';
    }
}

/**
 * Amplify naming
 */
export class AmplifyNaming {
    private readonly prefix: string;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
    }

    get appName(): string {
        return `${this.prefix}-ui`;
    }
}

/**
 * CloudFormation output naming
 */
export class OutputNaming {
    get apiUrl(): string {
        return 'ApiUrl';
    }

    get tableName(): string {
        return 'TableName';
    }
}

/**
 * Consolidated naming utility
 */
export class ResourceNaming {
    public readonly dynamodb: DynamoDBNaming;
    public readonly lambda: LambdaNaming;
    public readonly api: ApiGatewayNaming;
    public readonly iam: IAMNaming;
    public readonly layers: LayerNaming;
    public readonly amplify: AmplifyNaming;
    public readonly outputs: OutputNaming;
    public readonly prefix: string;

    constructor(environment: Environment) {
        this.prefix = getResourcePrefix(environment);
        this.dynamodb = new DynamoDBNaming(environment);
        this.lambda = new LambdaNaming(environment);
        this.api = new ApiGatewayNaming(environment);
        this.iam = new IAMNaming(environment);
        this.layers = new LayerNaming(environment);
        this.amplify = new AmplifyNaming(environment);
        this.outputs = new OutputNaming();
    }
}

/**
 * Generate common tags
 */
export function getCommonTags(environment: Environment): Record<string, string> {
    return {
        Project: 'aws-test',
        Environment: environment,
        ManagedBy: 'CDK',
    };
}

/**
 * Generate stack name
 */
export function getStackName(environment: Environment): string {
    return `AwsTest-${environment}`;
}

