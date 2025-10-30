import { Duration, Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as codedeploy from 'aws-cdk-lib/aws-codedeploy';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { Environment, LambdaFunctionConfig, EnvironmentConfig } from '../../src/shared/types';
import * as path from 'path';

export interface StandardLambdaFunctionProps {
    entry: string;
    functionName: string;
    handler?: string;
    runtime?: lambda.Runtime;
    environment: Environment;
    functionConfig: LambdaFunctionConfig;
    envConfig: EnvironmentConfig;
    environmentVariables?: Record<string, string>;
    layers?: lambda.ILayerVersion[];
    role: iam.IRole;
}

/**
 * Standard Lambda Function Construct
 * 
 * Features:
 * - Lambda versioning and aliases
 * - Blue/Green deployment support with CodeDeploy
 * - Gradual traffic shifting (LINEAR/CANARY)
 * - Automatic rollback on errors
 * - Provisioned concurrency
 * - Auto-scaling for provisioned concurrency
 */
export class StandardLambdaFunction extends Construct {
    public readonly function: nodejs.NodejsFunction;
    public alias?: lambda.Alias;
    public version?: lambda.Version;
    public deploymentGroup?: codedeploy.LambdaDeploymentGroup;
    public errorAlarm?: cloudwatch.Alarm;

    constructor(scope: Construct, id: string, props: StandardLambdaFunctionProps) {
        super(scope, id);

        const { functionConfig } = props;

        this.function = new nodejs.NodejsFunction(this, 'Function', {
            entry: props.entry,
            handler: props.handler || 'handler',
            runtime: props.runtime || lambda.Runtime.NODEJS_22_X,
            functionName: props.functionName,
            memorySize: functionConfig.memory,
            timeout: Duration.seconds(functionConfig.timeout),
            role: props.role,
            environment: props.environmentVariables || {},
            layers: props.layers || [],
            reservedConcurrentExecutions:
                functionConfig.reservedConcurrency > 0 ? functionConfig.reservedConcurrency : undefined,
            bundling: {
                target: 'node22',
                platform: 'node',
                format: OutputFormat.CJS,
                mainFields: ['module', 'main'],
                sourceMap: props.environment !== 'production',
                minify: props.environment === 'production',
                tsconfig: './tsconfig.json',
                externalModules: [
                    '@aws-sdk/*',
                    '@smithy/*',
                    '/opt/nodejs',
                    '/opt/nodejs/*',
                ],
            },
            depsLockFilePath: './package-lock.json',
        });

        // Setup alias with provisioned concurrency and auto-scaling
        // Note: Alias is created ONLY when provisioned concurrency is needed
        const provisionedConcurrency = functionConfig.provisionedConcurrency || 0;
        if (provisionedConcurrency > 0) {
            this.setupAliasWithProvisioning(props);
        }

        // Add Blue/Green deployment tags if enabled
        if (props.envConfig.features.blueGreenEnabled && this.version && this.alias) {
            this.addBlueGreenTags();
        }

        // Setup CodeDeploy for gradual traffic shifting
        if (functionConfig.codeDeploy.enabled && this.alias) {
            this.setupCodeDeploy(props);
        }
    }

    /**
     * Setup alias with provisioned concurrency and auto-scaling
     * 
     * Creates a Lambda alias with optional provisioned concurrency and auto-scaling.
     * 
     * Why?
     * Provisioned concurrency and auto-scaling require an alias (AWS limitation).
     * The alias can be used for:
     * 1. Blue/Green deployment (production)
     * 2. Traffic shifting between versions
     * 3. Provisioned concurrency optimization
     * 
     * @private
     */
    private setupAliasWithProvisioning(props: StandardLambdaFunctionProps): void {
        const { functionConfig } = props;

        // Create Lambda version for this deployment
        this.version = this.function.currentVersion;

        // Create alias pointing to current version
        // Note: Alias name is always the environment name for consistency
        // Blue/Green deployment is indicated by tags, not alias name
        const provisionedCount = functionConfig.provisionedConcurrency || 0;
        const aliasProps: lambda.AliasProps =
            provisionedCount > 0
                ? {
                    aliasName: props.environment,
                    version: this.version,
                    description: `Lambda alias with ${provisionedCount} provisioned instances`,
                    provisionedConcurrentExecutions: provisionedCount,
                }
                : {
                    aliasName: props.environment,
                    version: this.version,
                    description: `Lambda alias with ${provisionedCount} provisioned instances`,
                };

        this.alias = new lambda.Alias(this, 'Alias', aliasProps);

        // Configure auto-scaling for provisioned concurrency if enabled
        // Note: Auto-scaling only works when provisioned concurrency > 0
        if (functionConfig.autoScaling.enabled && provisionedCount > 0 && this.alias) {
            const autoScaling = this.alias.addAutoScaling({
                minCapacity: functionConfig.autoScaling.minCapacity,
                maxCapacity: functionConfig.autoScaling.maxCapacity,
            });

            autoScaling.scaleOnUtilization({
                utilizationTarget: functionConfig.autoScaling.utilizationTarget,
            });
        }
    }

    /**
     * Add Blue/Green deployment tags for tracking and cost allocation
     * 
     * Only called when Blue/Green deployment feature is enabled.
     * These tags distinguish Blue/Green deployments from standard alias usage.
     * 
     * Note: Lambda Versions don't support tags in CloudFormation (AWS limitation).
     * Tags are only added to the alias.
     * 
     * Tags help with:
     * - Identifying deployment strategy in AWS Console
     * - Cost allocation and analysis
     * - Differentiating Blue/Green from standard provisioned concurrency
     * 
     * @private
     */
    private addBlueGreenTags(): void {
        if (this.alias) {
            Tags.of(this.alias).add('DeploymentStrategy', 'BlueGreen');
            Tags.of(this.alias).add('AliasType', 'Production');
        }
    }

    /**
     * Setup CodeDeploy for gradual traffic shifting
     * 
     * Creates:
     * 1. CloudWatch alarm for error monitoring (if enabled)
     * 2. CodeDeploy deployment group with traffic shifting configuration
     * 
     * How it works:
     * - Deploy new version → CodeDeploy gradually shifts traffic
     * - If error alarm triggers → Automatic rollback to previous version
     * - No manual intervention needed
     * 
     * Example: LINEAR_10PERCENT_EVERY_1MINUTE
     * - Minute 0: 0% new version, 100% old version
     * - Minute 1: 10% new version, 90% old version
     * - Minute 2: 20% new version, 80% old version
     * - ...
     * - Minute 10: 100% new version, 0% old version
     * 
     * @private
     */
    private setupCodeDeploy(props: StandardLambdaFunctionProps): void {
        if (!this.alias) {
            throw new Error('Alias must be created before setting up CodeDeploy');
        }

        const { functionConfig, functionName } = props;
        const alarms: cloudwatch.IAlarm[] = [];

        // Create CloudWatch alarm for error monitoring (if enabled)
        if (functionConfig.codeDeploy.alarms.enabled) {
            this.errorAlarm = this.createErrorAlarm(props);
            alarms.push(this.errorAlarm);
        }

        // Map deployment preference string to CodeDeploy config
        const deploymentConfig = this.getDeploymentConfig(functionConfig.codeDeploy.deploymentPreference);

        // Create CodeDeploy deployment group
        this.deploymentGroup = new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
            alias: this.alias,
            deploymentConfig: deploymentConfig,
            alarms: alarms.length > 0 ? alarms : undefined,
            autoRollback: {
                failedDeployment: true,
                stoppedDeployment: true,
                deploymentInAlarm: functionConfig.codeDeploy.alarms.enabled,
            },
            ignorePollAlarmsFailure: false,
        });

        // Add tags to deployment group
        Tags.of(this.deploymentGroup).add('DeploymentType', 'BlueGreen');
        Tags.of(this.deploymentGroup).add('TrafficShifting', functionConfig.codeDeploy.deploymentPreference);
    }

    /**
     * Create CloudWatch alarm for Lambda errors
     * 
     * Monitors error rate and triggers automatic rollback if threshold is exceeded.
     * 
     * Metrics monitored:
     * - Lambda Errors (all invocation errors)
     * 
     * Threshold calculation:
     * - If error rate > threshold for evaluation periods → Alarm triggers → Rollback
     * 
     * Example:
     * - errorRateThreshold: 0.05 (5%)
     * - evaluationPeriods: 2
     * - If errors exceed 5% for 2 consecutive minutes → Rollback
     * 
     * @private
     */
    private createErrorAlarm(props: StandardLambdaFunctionProps): cloudwatch.Alarm {
        const { functionConfig, functionName } = props;
        const config = functionConfig.codeDeploy.alarms;

        // Create metric for Lambda errors
        const errorMetric = new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: {
                FunctionName: this.alias?.functionName || functionName,
            },
            statistic: 'Sum',
            period: Duration.minutes(1),
        });

        // Create metric for Lambda invocations
        const invocationMetric = new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: {
                FunctionName: this.alias?.functionName || functionName,
            },
            statistic: 'Sum',
            period: Duration.minutes(1),
        });

        // Calculate error rate as percentage
        const errorRate = new cloudwatch.MathExpression({
            expression: '(errors / MAX([errors, invocations])) * 100',
            usingMetrics: {
                errors: errorMetric,
                invocations: invocationMetric,
            },
            period: Duration.minutes(1),
        });

        // Create alarm
        return new cloudwatch.Alarm(this, 'ErrorAlarm', {
            metric: errorRate,
            threshold: config.errorRateThreshold * 100, // Convert to percentage
            evaluationPeriods: config.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            alarmDescription: `Error rate alarm for ${functionName}. Triggers rollback if error rate exceeds ${config.errorRateThreshold * 100}%`,
            alarmName: `${functionName}-ErrorRate`,
        });
    }

    /**
     * Get CodeDeploy deployment configuration
     * 
     * Maps deployment preference string to AWS CodeDeploy configuration.
     * 
     * @private
     */
    private getDeploymentConfig(preference: string): codedeploy.ILambdaDeploymentConfig {
        const configs: Record<string, codedeploy.ILambdaDeploymentConfig> = {
            LINEAR_10PERCENT_EVERY_1MINUTE: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE,
            LINEAR_10PERCENT_EVERY_2MINUTES: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_2MINUTES,
            LINEAR_10PERCENT_EVERY_3MINUTES: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_3MINUTES,
            LINEAR_10PERCENT_EVERY_10MINUTES: codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_10MINUTES,
            CANARY_10PERCENT_5MINUTES: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
            CANARY_10PERCENT_10MINUTES: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_10MINUTES,
            CANARY_10PERCENT_15MINUTES: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_15MINUTES,
            CANARY_10PERCENT_30MINUTES: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_30MINUTES,
            ALL_AT_ONCE: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
        };

        return configs[preference] || codedeploy.LambdaDeploymentConfig.LINEAR_10PERCENT_EVERY_1MINUTE;
    }

    /**
     * Get function ARN (alias or function)
     * 
     * Returns alias ARN if Blue/Green deployment is enabled (production),
     * otherwise returns function ARN.
     * 
     * This is used by API Gateway to route traffic to the correct target.
     * 
     * Why?
     * - Production (Blue/Green): Routes to alias for gradual traffic shifting
     * - Development: Routes directly to function for faster deployment
     * 
     * @returns Function or alias ARN depending on deployment strategy
     */
    public getFunctionArn(): string {
        return this.alias?.functionArn || this.function.functionArn;
    }

    /**
     * Get function name (alias or function)
     * 
     * Returns alias name if Blue/Green deployment is enabled (production),
     * otherwise returns function name.
     * 
     * This is used for CloudWatch metrics and logs.
     * 
     * Why?
     * - Production (Blue/Green): Tracks metrics per alias version
     * - Development: Tracks metrics per function
     * 
     * @returns Function or alias name depending on deployment strategy
     */
    public getFunctionName(): string {
        return this.alias?.functionName || this.function.functionName;
    }
}

