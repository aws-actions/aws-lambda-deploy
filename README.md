# AWS Lambda Deploy GitHub Action

Updates the code and configuration of AWS Lambda functions as part of GitHub Actions workflow steps.

**Table of Contents**

<!-- toc -->

- [Usage](#usage)
  * [Update Function Configuration](#update-function-configuration)
  * [Using S3 Deployment Method](#using-s3-deployment-method)
  * [Dry Run Mode](#dry-run-mode)
- [Build from Source](#build-from-source)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [Credentials and Region](#credentials-and-region)
- [Permissions](#permissions)
- [License Summary](#license-summary)
- [Security Disclosures](#security-disclosures)

<!-- tocstop -->

## Usage

```yaml
name: Deploy to AWS Lambda

on:
  push:
    branches: [ "main" ]

permissions:
  id-token: write   # This is required for OIDC authentication
  contents: read    # This is required to checkout the repository

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production

    steps:
    - name: Checkout
      uses: actions/checkout@v5

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
        aws-region: ${{ env.AWS_REGION }}
        # The role-to-assume should be the ARN of the IAM role you created for GitHub Actions OIDC

    - name: Deploy Lambda Function
      uses: aws-actions/aws-lambda-deploy@v1
      with:
        function-name: my-function-name
        code-artifacts-dir: my-code-artifacts-dir
        handler: index.handler
        runtime: nodejs22.x
        # Add any additional inputs this action supports
```

The required parameters to deploy are `function-name`, `code-artifacts-dir`, `handler`, and `runtime`. If the function does not exist yet, the `role` parameter is also required to specify the function's IAM execution role.

If a function with the name specified by `function-name` does not exist, it will be created with the provided code within `code-artifacts-dir` and configuration parameters using the [CreateFunction](https://docs.aws.amazon.com/lambda/latest/api/API_CreateFunction.html) API.

For the full list of inputs this GitHub Action supports, see [Inputs](#inputs).

### Update Function Configuration
Function configuration will be updated using the [UpdateFunctionConfiguration](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionConfiguration.html) API if configuration values differ from the deployed Lambda function's configuration.

As a first step, [GetFunctionConfiguration](https://docs.aws.amazon.com/lambda/latest/api/API_GetFunctionConfiguration.html) is called to perform a diff between the provided configuration parameters and the configuration of the currently deployed function. If there is no change, UpdateFunctionConfiguration will not be called.
```yaml
      - name: Update Lambda configuration
        uses: aws-actions/aws-lambda-deploy@v1
        with:
          function-name: my-function-name
          code-artifacts-dir: my-code-artifacts-dir
          memory-size: 512
          timeout: 60
          environment: '{"ENV":"production","DEBUG":"true"}'
```

### Using S3 Deployment Method
Optionally store code artifacts in S3 instead of direct `.zip` file upload.
```yaml
      - name: Deploy Lambda function via S3
        uses: aws-actions/aws-lambda-deploy@v1
        with:
          function-name: my-function-name
          code-artifacts-dir: my-code-artifacts-dir
          s3-bucket: my-s3-bucket
          # s3-key is optional - a key will be auto-generated if not specified
```

### Dry Run Mode
Validate parameters and permissions without any function code or configuration modifications.
```yaml
      - name: Deploy on dry run mode
        uses: aws-actions/aws-lambda-deploy@v1
        with:
          function-name: my-function-name
          code-artifacts-dir: my-code-artifacts-dir
          dry-run: true
```
 **Note**: Dry run will still call `GetFunctionConfiguration` to check if the function exists and perform configuration diffs against what's currently deployed.
## Build from Source

To automate building your source code, add a build step based on your runtime and build process. This build step should be performed before the AWS Lambda Deploy step, and AWS Lambda Deploy's `code-artifacts-dir` parameter will typically be set to the build step's code artifact output directory.

Below are two commonly used Build examples for Node.js and Python:

### Node.js

```yaml
      - name: Build source code
        run: |
          # Install dependencies
          npm ci

          # Build
          npm run build
```
### Python

```yaml
      - name: Build source code using setup tools
        run: |
          # Install dependencies
          pip install -r requirement.txt

          # Build
          python -m build
```

## Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `function-name` | Name of the Lambda function | Yes | |
| `code-artifacts-dir` | Path to a directory of code artifacts to zip and deploy | Yes | |
| `handler` | Name of the function handler method | Yes | `index.handler` |
| `runtime` | Function runtime identifier | Yes | `nodejs20.x` |
| `s3-bucket` | S3 bucket name for Lambda deployment package. Uses S3 deployment method if provided | No | |
| `s3-key` | S3 key (path) for the Lambda deployment package | No | Auto-generated |
| `publish` | Publish a new version of the function after updating | No | `true` |
| `dry-run` | Validate parameters and permissions without modifications | No | `false` |
| `revision-id` | Update only if the revision ID matches the specified ID | No | |
| `architectures` | Function instruction set architecture | No | `x86_64` |
| `source-kms-key-arn` | ARN of the KMS key for encrypting deployment package | No | |
| `role` | ARN of the function's execution role (required for new functions) | No | |
| `function-description` | Description of the function | No | |
| `memory-size` | Amount of memory available to the function at runtime | No | |
| `timeout` | Function timeout in seconds | No | `3` |
| `vpc-config` | VPC configuration for network connectivity | No | |
| `environment` | Environment variables as JSON string | No | |
| `dead-letter-config` | Dead letter queue or topic for failed events | No | |
| `kms-key-arn` | ARN of KMS customer managed key | No | |
| `tracing-config` | X-Ray tracing configuration | No | |
| `layers` | Function layers to add to execution environment | No | |
| `file-system-configs` | Amazon EFS connection settings | No | |
| `image-config` | Container image configuration | No | |
| `ephemeral-storage` | Size of function's /tmp directory in MB | No | `512` |
| `snap-start` | Function's SnapStart setting | No | |
| `logging-config` | CloudWatch Logs configuration | No | |
| `code-signing-config-arn` | ARN of code-signing configuration | No | |
| `tags` | Tags to apply to the function as JSON string | No | |

## Outputs

| Name | Description |
|------|-------------|
| `function-arn` | The ARN of the updated Lambda function |
| `version` | The function version if a new version was published |

## Credentials and Region

This action relies on the [default behavior of the AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html) to determine AWS credentials and region. Use the [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) action to configure the GitHub Actions environment for AWS authentication.

### OpenID Connect (OIDC)

We **highly recommend** using OpenID Connect (OIDC) to authenticate with AWS. OIDC allows your GitHub Actions workflows to access AWS resources without storing AWS credentials as long-lived GitHub secrets.

Here's an example of using OIDC with the aws-actions/configure-aws-credentials action:

```yaml
      - name: Configure AWS credentials with OIDC
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: my-role
          aws-region: my-region
```

To use OIDC authentication, you must configure a trust policy in AWS IAM that allows GitHub Actions to assume an IAM role. Here's an example trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/your-repo:*"
        }
      }
    }
  ]
}
```

For more information on setting up OIDC with AWS, see [Configuring OpenID Connect in Amazon Web Services](https://github.com/aws-actions/configure-aws-credentials/tree/main?tab=readme-ov-file#quick-start-oidc-recommended).

## Permissions

This action requires the following minimum set of permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LambdaDeployPermissions",
      "Effect": "Allow",
      "Action": [
        "lambda:GetFunctionConfiguration",
        "lambda:CreateFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:PublishVersion"
      ],
      "Resource": "arn:aws:lambda:<region>:<aws_account_id>:function:<function_name>"
    },
    {
      "Sid":"PassRolesDefinition",
      "Effect":"Allow",
      "Action":[
        "iam:PassRole"
      ],
      "Resource":[
        "arn:aws:iam::<aws_account_id>:role/<function_execution_role_name>"
      ]
    }
  ]
}
```

If you're using the S3 deployment method, ensure your IAM role also has the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Permissions",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:PutBucketPublicAccessBlock",
        "s3:PutEncryptionConfiguration",
        "s3:PutBucketVersioning"
      ],
      "Resource": [
        "arn:aws:s3:::<bucket_name>",
        "arn:aws:s3:::<bucket_name>/*"
      ]
    }
  ]
}
```

We recommend reading [AWS Lambda Security Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/security-best-practices.html) for more information on securing your Lambda functions.

## License Summary
This code is made available under the MIT license.

## Security Disclosures
If you would like to report a potential security issue in this project, please
do not create a GitHub issue.  Instead, please follow the instructions
[here](https://aws.amazon.com/security/vulnerability-reporting/) or [email AWS
security directly](mailto:aws-security@amazon.com).
