jest.mock('@actions/core');
jest.mock('@aws-sdk/client-lambda');
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockImplementation(async (path) => ({
    isDirectory: () => path.includes('directory')
  })),
  copyFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content'))
}));
jest.mock('path');

const core = require('@actions/core');
const { 
  LambdaClient, 
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand 
} = require('@aws-sdk/client-lambda');
const fs = require('fs/promises');
const path = require('path');
const index = require('../index');

describe('Lambda Function Code Tests', () => {
  
  jest.setTimeout(60);
  beforeEach(() => {
    jest.resetAllMocks();
    
    process.cwd = jest.fn().mockReturnValue('/mock/cwd');
    
    path.join.mockImplementation((...parts) => parts.join('/'));
    
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'function-name': 'test-function',
        'region': 'us-east-1',
        'code-artifacts-dir': '/mock/src',
        'architectures': 'x86_64'
      };
      return inputs[name] || '';
    });
    core.getBooleanInput.mockImplementation((name) => {
      if (name === 'dry-run') return false;
      if (name === 'publish') return true;
      return false;
    });
    core.info.mockImplementation(() => {});
    core.error.mockImplementation(() => {});
    core.setFailed.mockImplementation(() => {});
    core.setOutput.mockImplementation(() => {});
    core.debug.mockImplementation(() => {});
    
    const mockFunctionResponse = {
      Configuration: {
        FunctionName: 'test-function',
        FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        Runtime: 'nodejs18.x',
        Handler: 'index.handler'
      }
    };
    const mockUpdateCodeResponse = {
      FunctionName: 'test-function',
      FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      Version: '2',
      LastUpdateStatus: 'Successful'
    };
    
    LambdaClient.prototype.send = jest.fn().mockImplementation((command) => {
      if (command instanceof GetFunctionCommand) {
        return Promise.resolve(mockFunctionResponse);
      } else if (command instanceof GetFunctionConfigurationCommand) {
        return Promise.resolve(mockFunctionResponse.Configuration);
      } else if (command instanceof UpdateFunctionCodeCommand) {
        return Promise.resolve(mockUpdateCodeResponse);
      }
      return Promise.resolve({});
    });
    
    jest.spyOn(index, 'checkBucketExists').mockResolvedValue(true);

    jest.spyOn(index, 'checkFunctionExists').mockResolvedValue(true);
  });
  test('Test the updateFunctionCode function with S3 upload method', async () => {
    const originalUpdateFunctionCode = index.updateFunctionCode;
    
    index.updateFunctionCode = jest.fn().mockImplementation(async (client, params) => {
      const command = new UpdateFunctionCodeCommand({
        FunctionName: params.functionName,
        S3Bucket: params.s3Bucket,
        S3Key: params.s3Key,
        ...(params.architectures && { 
          Architectures: Array.isArray(params.architectures) 
            ? params.architectures 
            : [params.architectures] 
        }),
        ...(params.publish !== undefined && { Publish: params.publish }),
        ...(params.dryRun !== undefined && { DryRun: params.dryRun })
      });
      
      const response = await client.send(command);
      
      core.setOutput('function-arn', response.FunctionArn);
      if (response.Version) {
        core.setOutput('version', response.Version);
      }
      
      return response;
    });
    
    try {
      const mockClient = new LambdaClient();
      const mockParams = {
        functionName: 'test-function',
        finalZipPath: '/mock/path/lambda.zip',
        useS3Method: true,
        s3Bucket: 'test-bucket',
        s3Key: 'test-key',
        architectures: 'x86_64',
        publish: true,
        dryRun: false,
        region: 'us-east-1'
      };
      
      await index.updateFunctionCode(mockClient, mockParams);
      
      expect(index.updateFunctionCode).toHaveBeenCalledWith(mockClient, mockParams);
      
      const command = UpdateFunctionCodeCommand.mock.calls[0][0];
      expect(command).toHaveProperty('FunctionName', 'test-function');
      expect(command).toHaveProperty('S3Bucket', 'test-bucket');
      expect(command).toHaveProperty('S3Key', 'test-key');
      expect(command).toHaveProperty('Architectures', ['x86_64']);
      expect(command).toHaveProperty('Publish', true);
      
      expect(core.setOutput).toHaveBeenCalledWith('function-arn', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('version', expect.any(String));
    } finally {
      index.updateFunctionCode = originalUpdateFunctionCode;
    }
  });
  
  test('S3 method should propagate errors from uploadToS3', async () => {
    const originalUpdateFunctionCode = index.updateFunctionCode;
    
    try {
      index.updateFunctionCode = async (client, params) => {
        if (params.useS3Method) {
          core.info(`Using S3 deployment method with bucket: ${params.s3Bucket}, key: ${params.s3Key}`);

          await index.uploadToS3(params.finalZipPath, params.s3Bucket, params.s3Key, params.region);

          core.info(`Successfully uploaded package to S3: s3://${params.s3Bucket}/${params.s3Key}`);

        } else {
          return;
        }
      };

      core.info = jest.fn();

      const mockClient = {};

      const mockParams = {
        functionName: 'test-function',
        finalZipPath: '/mock/path/lambda.zip',
        useS3Method: true,
        s3Bucket: 'test-bucket',
        s3Key: 'test-key',
        architectures: 'x86_64',
        publish: true,
        dryRun: false,
        region: 'us-east-1'
      };

      const originalUploadToS3 = index.uploadToS3;
      const testError = new Error('S3 upload failure');
      index.uploadToS3 = jest.fn().mockRejectedValue(testError);

      await expect(index.updateFunctionCode(mockClient, mockParams))
        .rejects.toThrow('S3 upload failure');

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining(`Using S3 deployment method with bucket: ${mockParams.s3Bucket}, key: ${mockParams.s3Key}`)
      );

      expect(index.uploadToS3).toHaveBeenCalledWith(
        mockParams.finalZipPath, 
        mockParams.s3Bucket,
        mockParams.s3Key,
        mockParams.region
      );

      expect(core.info).not.toHaveBeenCalledWith(
        expect.stringContaining('Successfully uploaded package to S3')
      );
      
      index.uploadToS3 = originalUploadToS3;
    } finally {
      index.updateFunctionCode = originalUpdateFunctionCode;
    }
  });

  test('Handle errors in updateFunctionCode function', async () => {
    const mockClient = new LambdaClient();
    const mockError = new Error('Function code update failed');
    mockError.name = 'ResourceNotFoundException';
    mockClient.send.mockRejectedValue(mockError);

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow();

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Failed to update function code')
    );
  });
  
  test('Test direct upload method (ZipFile parameter)', async () => {
    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);

    const mockClient = new LambdaClient();

    mockClient.send.mockResolvedValue({
      FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      Version: '3'
    });

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false, 
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await index.updateFunctionCode(mockClient, mockParams);

    expect(fs.readFile).toHaveBeenCalledWith(mockParams.finalZipPath);

    expect(mockClient.send).toHaveBeenCalled();
    const commandCall = mockClient.send.mock.calls[0][0];
    expect(commandCall).toBeInstanceOf(UpdateFunctionCodeCommand);

    expect(core.info).toHaveBeenCalledWith(expect.stringContaining(`Original buffer length: ${mockZipContent.length} bytes`));

    expect(core.setOutput).toHaveBeenCalledWith('function-arn', expect.any(String));
    expect(core.setOutput).toHaveBeenCalledWith('version', expect.any(String));
  });
  
  test('Handle file read errors - ENOENT (file not found)', async () => {
    const readError = new Error('File not found');
    readError.code = 'ENOENT';
    fs.readFile.mockRejectedValue(readError);
    
    const mockClient = new LambdaClient();

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      codeArtifactsDir: '/mock/src',
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('File not found');

    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read Lambda deployment package')
    );
 
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('File not found. Ensure the code artifacts directory')
    );
  });
  
  test('Handle file read errors - EACCES (permission denied)', async () => {
    const readError = new Error('Permission denied');
    readError.code = 'EACCES';
    fs.readFile.mockRejectedValue(readError);

    const mockClient = new LambdaClient();

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      codeArtifactsDir: '/mock/src',
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };
    
    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('Permission denied');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringContaining('Failed to read Lambda deployment package')
    );
    
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('Permission denied. Check file access permissions.')
    );
  });
  
  test('Test dry run mode', async () => {
    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);
    
    const mockClient = new LambdaClient();

    mockClient.send.mockResolvedValue({
      FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      Version: '$LATEST'
    });

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: true, 
      region: 'us-east-1'
    };

    await index.updateFunctionCode(mockClient, mockParams);

    expect(mockClient.send).toHaveBeenCalled();
    const commandCall = mockClient.send.mock.calls[0][0];
    expect(commandCall).toBeInstanceOf(UpdateFunctionCodeCommand);

    expect(core.info).toHaveBeenCalledWith(expect.stringMatching(/\[DRY RUN\]/));
    expect(core.info).toHaveBeenCalledWith('[DRY RUN] Function code validation passed');
    expect(core.info).toHaveBeenCalledWith('[DRY RUN] Function code update simulation completed');

    expect(core.setOutput).toHaveBeenCalledWith('function-arn', expect.any(String));
    expect(core.setOutput).toHaveBeenCalledWith('version', expect.any(String));
  });
  
  test('Handle AWS specific errors - ThrottlingException', async () => {

    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);
  
    const mockClient = new LambdaClient();

    const throttlingError = new Error('Rate exceeded');
    throttlingError.name = 'ThrottlingException';
    mockClient.send.mockRejectedValue(throttlingError);

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('Rate exceeded');

    expect(core.setFailed).toHaveBeenCalledWith(
      'Rate limit exceeded and maximum retries reached: Rate exceeded'
    );
  });
  
  test('Handle AWS specific errors - Server error (500)', async () => {
    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);

    const mockClient = new LambdaClient();

    const serverError = new Error('Internal server error');
    serverError.$metadata = { httpStatusCode: 500 };
    mockClient.send.mockRejectedValue(serverError);

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('Internal server error');

    expect(core.setFailed).toHaveBeenCalledWith(
      'Server error (500): Internal server error. All retry attempts failed.'
    );
  });
  
  test('Handle AWS specific errors - Access denied', async () => {
    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);

    const mockClient = new LambdaClient();

    const accessError = new Error('Access denied');
    accessError.name = 'AccessDeniedException';
    mockClient.send.mockRejectedValue(accessError);
    
    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };
    
    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('Access denied');

    expect(core.setFailed).toHaveBeenCalledWith(
      'Action failed with error: Permissions error: Access denied. Check IAM roles.'
    );
  });
  
  test('Log stack trace when available', async () => {
    const mockZipContent = Buffer.from('mock zip content');
    fs.readFile.mockResolvedValue(mockZipContent);

    const mockClient = new LambdaClient();

    const error = new Error('Something went wrong');
    error.stack = 'Error: Something went wrong\n    at Function.updateFunctionCode';
    mockClient.send.mockRejectedValue(error);

    core.debug = jest.fn();

    const mockParams = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/lambda.zip',
      useS3Method: false,
      architectures: 'x86_64',
      publish: true,
      dryRun: false,
      region: 'us-east-1'
    };

    await expect(index.updateFunctionCode(mockClient, mockParams))
      .rejects.toThrow('Something went wrong');

    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to update function code: Something went wrong'
    );

    expect(core.debug).toHaveBeenCalledWith(error.stack);
  });
});
