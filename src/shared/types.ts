/**
 * Shared Type Definitions
 */

// Environment configuration
export type Environment = 'development' | 'production';

/**
 * Auto-scaling configuration for provisioned concurrency
 */
export interface AutoScalingConfig {
    enabled: boolean;
    minCapacity: number;
    maxCapacity: number;
    utilizationTarget: number;
}

/**
 * CodeDeploy deployment configuration
 * 
 * Controls gradual traffic shifting between Lambda versions
 */
export interface CodeDeployConfig {
    enabled: boolean;
    /** Deployment strategy: LINEAR_10PERCENT_EVERY_1MINUTE, CANARY_10PERCENT_5MINUTES, ALL_AT_ONCE */
    deploymentPreference: 'LINEAR_10PERCENT_EVERY_1MINUTE' | 'LINEAR_10PERCENT_EVERY_2MINUTES' | 'LINEAR_10PERCENT_EVERY_3MINUTES' | 'LINEAR_10PERCENT_EVERY_10MINUTES' | 'CANARY_10PERCENT_5MINUTES' | 'CANARY_10PERCENT_10MINUTES' | 'CANARY_10PERCENT_15MINUTES' | 'CANARY_10PERCENT_30MINUTES' | 'ALL_AT_ONCE';
    /** CloudWatch alarms for automatic rollback */
    alarms: {
        enabled: boolean;
        /** Error rate threshold (e.g., 0.05 = 5% errors triggers rollback) */
        errorRateThreshold: number;
        /** Evaluation periods for alarm */
        evaluationPeriods: number;
    };
}

/**
 * Lambda function configuration
 */
export interface LambdaFunctionConfig {
    memory: number;
    timeout: number;
    reservedConcurrency: number;
    provisionedConcurrency: number;
    autoScaling: AutoScalingConfig;
    codeDeploy: CodeDeployConfig;
}

/**
 * AWS Amplify configuration
 * 
 * GitHub credentials (owner, repository, token) are read from environment variables
 * for security and to avoid committing personal information to the repository.
 */
export interface AmplifyConfig {
    /** Enable automatic PR preview deployments */
    enablePRPreviews: boolean;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
    features: {
        blueGreenEnabled: boolean;
    };
    lambda: {
        api: LambdaFunctionConfig;
    };
    dynamodb: {
        ttlSeconds: number;
    };
    apiGateway: {
        throttleRateLimit: number;
        throttleBurstLimit: number;
    };
    amplify: AmplifyConfig;
}

/**
 * API Request/Response types
 */
export interface AddPhraseRequest {
    phrase: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * DynamoDB Phrase record
 */
export interface Phrase {
    id: number;
    phrase: string;
    createdAt: string;
    ttl?: number;
}

