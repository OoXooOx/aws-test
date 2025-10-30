import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { EnvironmentConfig } from '../../src/shared/types';
import { ResourceNaming } from '../utils/naming';
import { LambdaLayer } from '../constructs/lambda-layer';

export interface LayersStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
}

/**
 * Lambda Layers Stack
 * Contains reusable Lambda layers
 */
export class LayersStack extends Construct {
    public readonly commonLayer: lambda.LayerVersion;

    constructor(scope: Construct, id: string, props: LayersStackProps) {
        super(scope, id);

        const { naming } = props;

        // Common Layer (AWS SDK, utilities)
        const commonLayerConstruct = new LambdaLayer(this, 'CommonLayer', {
            sourcePath: naming.layers.commonLayerPath,
            layerVersionName: naming.layers.commonLayer,
            description: 'Common utilities and AWS SDK',
        });
        this.commonLayer = commonLayerConstruct.layer;

        Tags.of(this).add('Component', 'layers');
    }
}

