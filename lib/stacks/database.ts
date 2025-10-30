import { Construct } from 'constructs';
import { Tags, CfnOutput } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { EnvironmentConfig } from '../../src/shared/types';
import { ResourceNaming } from '../utils/naming';
import { DynamoDbTable } from '../constructs/dynamodb-table';

export interface DatabaseStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
}

/**
 * Database Stack
 * Contains DynamoDB table for phrases
 */
export class DatabaseStack extends Construct {
    public readonly phrasesTable: Table;

    constructor(scope: Construct, id: string, props: DatabaseStackProps) {
        super(scope, id);

        const { naming } = props;

        // Phrases Table
        const phrasesTableConstruct = new DynamoDbTable(this, 'PhrasesTable', {
            tableName: naming.dynamodb.phrasesTable,
            partitionKey: { name: 'id', type: AttributeType.NUMBER },
            billingMode: BillingMode.PAY_PER_REQUEST,
            ttlAttribute: 'ttl',
            removalPolicy: naming.dynamodb.removalPolicy,
        });
        this.phrasesTable = phrasesTableConstruct.table;

        // CloudFormation output
        new CfnOutput(this, naming.outputs.tableName, {
            value: this.phrasesTable.tableName,
            description: 'DynamoDB phrases table name',
        });

        Tags.of(this).add('Component', 'database');
    }
}

