import { Construct } from 'constructs';
import { Tags, CfnOutput } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { EnvironmentConfig } from '../../src/shared/types';
import { StandardLambdaFunction } from '../constructs/lambda-function';
import { ResourceNaming } from '../utils/naming';

export interface LambdaStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
    lambdaRole: iam.Role;
    commonLayer: lambda.LayerVersion;
    commonEnv: Record<string, string>;
}

/**
 * Lambda Stack
 * Manages Lambda functions
 */
export class LambdaStack extends Construct {
    public readonly apiLambda: StandardLambdaFunction;

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id);

        const { envConfig, naming, lambdaRole, commonLayer, commonEnv } = props;

        this.apiLambda = new StandardLambdaFunction(this, 'ApiLambda', {
            entry: naming.lambda.apiPath,
            functionName: naming.lambda.api,
            environment: naming.lambda.stage,
            functionConfig: envConfig.lambda.api,
            envConfig: envConfig,
            role: lambdaRole,
            layers: [commonLayer],
            environmentVariables: commonEnv,
        });

        Tags.of(this).add('Component', 'lambda');

        // Output function and alias ARNs
        this.createOutputs(naming);
    }

    /**
     * Create CloudFormation outputs for Lambda function ARNs
     * 
     * Outputs function ARNs, alias ARNs, deployment groups, and alarms.
     * These outputs are used by other stacks and for external integrations.
     */
    private createOutputs(naming: ResourceNaming): void {
        // API Lambda outputs
        new CfnOutput(this, 'ApiLambdaArn', {
            value: this.apiLambda.function.functionArn,
            description: 'API Lambda Function ARN',
            exportName: `${naming.lambda.stage}-ApiLambdaArn`,
        });

        // Alias outputs (Blue/Green deployment)
        if (this.apiLambda.alias) {
            new CfnOutput(this, 'ApiLambdaAliasArn', {
                value: this.apiLambda.alias.functionArn,
                description: 'API Lambda Alias ARN (Blue/Green deployment)',
                exportName: `${naming.lambda.stage}-ApiLambdaAliasArn`,
            });
        }

        // CodeDeploy deployment group outputs
        if (this.apiLambda.deploymentGroup) {
            new CfnOutput(this, 'ApiLambdaDeploymentGroup', {
                value: this.apiLambda.deploymentGroup.deploymentGroupName,
                description: 'API Lambda CodeDeploy Deployment Group',
                exportName: `${naming.lambda.stage}-ApiLambdaDeploymentGroup`,
            });
        }

        // CloudWatch alarm outputs
        if (this.apiLambda.errorAlarm) {
            new CfnOutput(this, 'ApiLambdaErrorAlarm', {
                value: this.apiLambda.errorAlarm.alarmArn,
                description: 'API Lambda Error Rate Alarm (triggers rollback)',
                exportName: `${naming.lambda.stage}-ApiLambdaErrorAlarm`,
            });
        }
    }
}

