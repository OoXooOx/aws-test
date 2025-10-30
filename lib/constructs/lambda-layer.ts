import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface LambdaLayerProps {
    sourcePath: string;
    layerVersionName: string;
    description: string;
    compatibleRuntimes?: lambda.Runtime[];
}

/**
 * Reusable Lambda Layer Construct
 */
export class LambdaLayer extends Construct {
    public readonly layer: lambda.LayerVersion;

    constructor(scope: Construct, id: string, props: LambdaLayerProps) {
        super(scope, id);

        const { sourcePath, layerVersionName, description, compatibleRuntimes = [lambda.Runtime.NODEJS_22_X] } = props;

        this.layer = new lambda.LayerVersion(this, 'Layer', {
            code: lambda.Code.fromAsset(sourcePath),
            compatibleRuntimes,
            description,
            layerVersionName,
        });
    }
}

