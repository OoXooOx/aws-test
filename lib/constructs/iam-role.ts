import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface IamRoleProps {
    roleName: string;
    servicePrincipal: string;
    managedPolicies?: iam.IManagedPolicy[];
    inlinePolicies?: Record<string, iam.PolicyDocument>;
    description?: string;
}

/**
 * Reusable IAM Role Construct
 */
export class IamRole extends Construct {
    public readonly role: iam.Role;

    constructor(scope: Construct, id: string, props: IamRoleProps) {
        super(scope, id);

        const { roleName, servicePrincipal, managedPolicies = [], inlinePolicies = {}, description } = props;

        this.role = new iam.Role(this, 'Role', {
            roleName,
            assumedBy: new iam.ServicePrincipal(servicePrincipal),
            managedPolicies,
            inlinePolicies,
            description,
        });
    }
}

