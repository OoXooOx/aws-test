import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { EnvironmentConfig } from '../../src/shared/types';
import { ResourceNaming } from '../utils/naming';
import { IamRole } from '../constructs/iam-role';

export interface IamStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
    phrasesTable: dynamodb.Table;
}

/**
 * IAM Stack
 * Contains IAM roles and policies
 */
export class IamStack extends Construct {
    public readonly lambdaRole: iam.Role;

    constructor(scope: Construct, id: string, props: IamStackProps) {
        super(scope, id);

        const { naming, phrasesTable } = props;

        const managedPolicies = [
            iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ];

        const lambdaRoleConstruct = new IamRole(this, 'LambdaRole', {
            roleName: naming.iam.lambdaRole,
            servicePrincipal: 'lambda.amazonaws.com',
            managedPolicies,
        });
        this.lambdaRole = lambdaRoleConstruct.role;

        // Grant DynamoDB permissions
        phrasesTable.grantReadWriteData(this.lambdaRole);

        Tags.of(this).add('Component', 'iam');
    }
}

