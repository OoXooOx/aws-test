import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode, TableOptions } from 'aws-cdk-lib/aws-dynamodb';

export interface DynamoDbTableProps {
    tableName: string;
    partitionKey: {
        name: string;
        type: AttributeType;
    };
    billingMode?: BillingMode;
    ttlAttribute?: TableOptions['timeToLiveAttribute'];
    removalPolicy: RemovalPolicy;
}

/**
 * Reusable DynamoDB Table Construct
 */
export class DynamoDbTable extends Construct {
    public readonly table: Table;

    constructor(scope: Construct, id: string, props: DynamoDbTableProps) {
        super(scope, id);

        const { tableName, partitionKey, billingMode, ttlAttribute, removalPolicy } = props;

        this.table = new Table(this, 'Table', {
            tableName,
            partitionKey,
            billingMode,
            timeToLiveAttribute: ttlAttribute,
            removalPolicy,
        });
    }
}

