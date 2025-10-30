import { Construct } from 'constructs';
import { Tags, CfnOutput, SecretValue } from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import { EnvironmentConfig } from '../../src/shared/types';
import { ResourceNaming } from '../utils/naming';

export interface AmplifyStackProps {
    envConfig: EnvironmentConfig;
    naming: ResourceNaming;
    apiUrl: string;
}

/**
 * AWS Amplify Hosting Stack
 * 
 * Hosts UI for the phrase manager with automatic deployments from GitHub.
 * 
 * Features:
 * - Automatic deployments on git push
 * - Branch-based deployments (main, dev, feature branches)
 * - Built-in CDN (CloudFront)
 * - Free SSL certificate
 * - Environment variables injection
 * - Rollback capability
 * 
 * Setup Required:
 * 1. Create GitHub repository
 * 2. Push code to GitHub
 * 3. Create GitHub Personal Access Token with 'repo' scope
 * 4. Store token in AWS Secrets Manager (see docs/AMPLIFY_SETUP.md)
 * 5. Deploy this stack
 * 
 * The app will auto-deploy on every push to connected branches.
 */
export class AmplifyStack extends Construct {
    public readonly amplifyApp: amplify.App;
    public readonly mainBranch: amplify.Branch;

    constructor(scope: Construct, id: string, props: AmplifyStackProps) {
        super(scope, id);

        const { naming, apiUrl, envConfig } = props;
        const amplifyConfig = envConfig.amplify;

        // Read GitHub configuration from environment variables (not committed to Git)
        const githubOwner = process.env.GITHUB_OWNER;
        const githubRepository = process.env.GITHUB_REPOSITORY;
        const githubTokenSecretName = process.env.GITHUB_TOKEN_SECRET_NAME || 'github/personal-access-token';

        // Validate required environment variables
        if (!githubOwner || !githubRepository) {
            throw new Error(
                'Missing required environment variables for Amplify GitHub integration.\n' +
                'Please set GITHUB_OWNER and GITHUB_REPOSITORY in your .env file.\n' +
                'See docs/AMPLIFY_SETUP.md for details.'
            );
        }

        // Create Amplify App connected to GitHub
        this.amplifyApp = new amplify.App(this, 'AmplifyApp', {
            appName: naming.amplify.appName,
            description: 'Phrase Manager UI - Auto-deployed from GitHub',

            // GitHub source configuration (from environment variables)
            sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
                owner: githubOwner,
                repository: githubRepository,
                oauthToken: SecretValue.secretsManager(githubTokenSecretName),
            }),

            // Environment variables (injected at build time)
            environmentVariables: {
                API_ENDPOINT: apiUrl,
                ENVIRONMENT: naming.lambda.stage,
            },

            // Custom build spec for static UI deployment
            // NOTE: This only builds the UI, not the backend (Lambda layers use Windows commands)
            customRules: [
                {
                    source: '/<*>',
                    target: '/index.html',
                    status: amplify.RedirectStatus.NOT_FOUND_REWRITE,
                },
            ],

            // Auto-delete on stack destruction
            autoBranchDeletion: true,
        });

        // Create main branch
        this.mainBranch = this.amplifyApp.addBranch('main', {
            branchName: 'main',
            stage: naming.lambda.stage === 'production' ? 'PRODUCTION' : 'DEVELOPMENT',
            autoBuild: true,
        });

        // Enable automatic branch creation for pull requests (optional)
        if (amplifyConfig.enablePRPreviews) {
            this.amplifyApp.addCustomRule({
                source: '/<*>',
                target: '/index.html',
                status: amplify.RedirectStatus.NOT_FOUND_REWRITE,
            });
        }

        // CloudFormation outputs
        new CfnOutput(this, 'AmplifyAppId', {
            value: this.amplifyApp.appId,
            description: 'Amplify App ID',
            exportName: `${naming.prefix}-AmplifyAppId`,
        });

        new CfnOutput(this, 'AmplifyAppUrl', {
            value: `https://main.${this.amplifyApp.defaultDomain}`,
            description: 'Amplify App URL (auto-deployed from GitHub)',
            exportName: `${naming.prefix}-AmplifyAppUrl`,
        });

        new CfnOutput(this, 'AmplifyConsoleUrl', {
            value: `https://console.aws.amazon.com/amplify/home?region=${process.env.CDK_DEFAULT_REGION || 'us-east-1'}#/${this.amplifyApp.appId}`,
            description: 'Amplify Console URL',
            exportName: `${naming.prefix}-AmplifyConsoleUrl`,
        });

        Tags.of(this).add('Component', 'ui');
        Tags.of(this).add('DeploymentType', 'GitHubAutoDeploy');
    }
}


