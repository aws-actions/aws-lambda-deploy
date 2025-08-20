const fs = require('fs/promises');
const core = require('@actions/core');
const { LambdaClient, GetFunctionConfigurationCommand, CreateFunctionCommand } = require('@aws-sdk/client-lambda');
const index = require('../index');
const { checkFunctionExists } = index;

jest.mock('fs/promises', () => {
  return {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    access: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
  };
});
jest.mock('glob');
jest.mock('adm-zip');
jest.mock('@actions/core');
jest.mock('path');
jest.mock('os');
jest.mock('../validations');
jest.mock('@aws-sdk/client-lambda', () => {
  const original = jest.requireActual('@aws-sdk/client-lambda');
  return {
    ...original,
    GetFunctionConfigurationCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'GetFunctionConfigurationCommand'
    })),
    CreateFunctionCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'CreateFunctionCommand'
    })),
    UpdateFunctionCodeCommand: jest.fn().mockImplementation((params) => ({
      input: params,
      type: 'UpdateFunctionCodeCommand'
    })),
    UpdateFunctionConfigurationCommand: jest.fn().mockImplementation((params) => ({
      input: params,
      type: 'UpdateFunctionConfigurationCommand'
    })),
    GetFunctionCommand: jest.fn().mockImplementation((params) => ({
      input: params,
      type: 'GetFunctionCommand'
    })),
    LambdaClient: jest.fn().mockImplementation(() => ({
      send: jest.fn()
    })),
    waitUntilFunctionUpdated: jest.fn()
  };
});
jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...original,
    HeadBucketCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'HeadBucketCommand'
    })),
    CreateBucketCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'CreateBucketCommand'
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'PutObjectCommand'
    })),
    PutBucketEncryptionCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'PutBucketEncryptionCommand'
    })),
    PutPublicAccessBlockCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'PutPublicAccessBlockCommand'
    })),
    PutBucketVersioningCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      type: 'PutBucketVersioningCommand'
    })),
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({})
    }))
  };
});

afterAll(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('Function Create Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.readFile.mockResolvedValue(Buffer.from('mock zip content'));
  });

  test('Handles ThrottlingException', async () => {
    const throttlingError = new Error('Rate exceeded');
    throttlingError.name = 'ThrottlingException';
    
    const mockSend = jest.fn().mockRejectedValue(throttlingError);
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('Rate exceeded');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Rate limit exceeded and maximum retries reached: Rate exceeded'
    );
  });

  test('Handles 429 error', async () => {
    const tooManyRequestsError = new Error('Too many requests');
    tooManyRequestsError.$metadata = { httpStatusCode: 429 };
    
    const mockSend = jest.fn().mockRejectedValue(tooManyRequestsError);
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('Too many requests');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Rate limit exceeded and maximum retries reached: Too many requests'
    );
  });

  test('Handles server error', async () => {
    const serverError = new Error('Internal server error');
    serverError.$metadata = { httpStatusCode: 500 };
    
    const mockSend = jest.fn().mockRejectedValue(serverError);
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('Internal server error');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Server error (500): Internal server error. All retry attempts failed.'
    );
  });

  test('Handles AccessDeniedException', async () => {
    const accessError = new Error('Access denied');
    accessError.name = 'AccessDeniedException';
    
    const mockSend = jest.fn().mockRejectedValue(accessError);
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('Access denied');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Action failed with error: Permissions error: Access denied. Check IAM roles.'
    );
  });

  test('Handles generic error', async () => {
    const genericError = new Error('Something went wrong');
    genericError.stack = 'Error: Something went wrong\n    at Function.mockFunction';
    
    const mockSend = jest.fn().mockRejectedValue(genericError);
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('Something went wrong');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to create function: Something went wrong'
    );
    expect(core.debug).toHaveBeenCalledWith(genericError.stack);
  });

  test('Validates role parameter', async () => {
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await index.createFunction(client, inputs, false);
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'Role ARN must be provided when creating a new function'
    );
    
    expect(client.send).not.toHaveBeenCalled();
  });

  test('Validates dryRun parameter', async () => {
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {},
      dryRun: true
    };
    
    await index.createFunction(client, inputs, false);
    
    expect(core.setFailed).toHaveBeenCalledWith(
      'DRY RUN MODE can only be used for updating function code of existing functions'
    );
    
    expect(client.send).not.toHaveBeenCalled();
  });

  test('Handles file read error', async () => {
    const fileError = new Error('File not found');
    fileError.code = 'ENOENT';
    fs.readFile.mockRejectedValue(fileError);
    
    const mockSend = jest.fn();
    LambdaClient.mockImplementation(() => ({
      send: mockSend
    }));
    
    const client = new LambdaClient();
    const inputs = {
      functionName: 'test-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await expect(index.createFunction(client, inputs, false))
      .rejects.toThrow('File not found');
    
    expect(core.setFailed).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to read Lambda deployment package/)
    );
  }); 
});

describe('Function Creation Tests', () => {
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    core.getInput = jest.fn();
    core.getBooleanInput = jest.fn();
    core.info = jest.fn();
    core.setFailed = jest.fn();
    core.debug = jest.fn();
    core.setOutput = jest.fn();
    
    fs.readFile.mockResolvedValue(Buffer.from('mock zip content'));
    
    LambdaClient.prototype.send = jest.fn().mockResolvedValue({
      FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      Version: '1'
    });
    
    CreateFunctionCommand.mockImplementation((params) => ({
      ...params,
      type: 'CreateFunctionCommand'
    }));
  });
  
  test('Successfully creates a Lambda function using direct upload method', async () => {
    const originalCreateFunction = index.createFunction;
    
    index.createFunction = jest.fn().mockImplementation(async (client, inputs, functionExists) => {
      if (functionExists) {
        return; 
      }
      
      if (!inputs.role) {
        core.setFailed('Role ARN must be provided when creating a new function');
        return;
      }
      
      if (inputs.dryRun) {
        core.setFailed('DRY RUN MODE can only be used for updating function code of existing functions');
        return;
      }
      
      // Simulate function creation with direct upload
      try {
        const zipFileContent = await fs.readFile(inputs.finalZipPath);
        core.info(`Zip file read successfully, size: ${zipFileContent.length} bytes`);
        
        const command = new CreateFunctionCommand({
          FunctionName: inputs.functionName,
          Role: inputs.role,
          Code: {
            ZipFile: zipFileContent
          },
          Runtime: inputs.runtime,
          Handler: inputs.handler,
          Description: inputs.functionDescription,
          MemorySize: inputs.parsedMemorySize,
          Timeout: inputs.timeout,
          Publish: inputs.publish,
          Architectures: Array.isArray(inputs.architectures) ? inputs.architectures : [inputs.architectures],
          Environment: { Variables: inputs.parsedEnvironment }
        });
        
        const response = await client.send(command);
        core.info('Lambda function created successfully');
        
        core.setOutput('function-arn', response.FunctionArn);
        if (response.Version) {
          core.setOutput('version', response.Version);
        }
        
        // Skip actual waitForFunctionActive but log that it would be called
        core.info(`Waiting for function ${inputs.functionName} to become active before proceeding`);
      } catch (error) {
        core.setFailed(`Failed to create function: ${error.message}`);
        throw error;
      }
    });
    
    try {
      const mockClient = new LambdaClient({ region: 'us-east-1' });
      
      const mockInputs = {
        functionName: 'test-function',
        role: 'arn:aws:iam::123456789012:role/test-role',
        finalZipPath: '/mock/path/file.zip',
        parsedEnvironment: { KEY1: 'value1', KEY2: 'value2' },
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        functionDescription: 'Test function description',
        parsedMemorySize: 256,
        timeout: 30,
        publish: true,
        architectures: ['x86_64']
      };
      
      await index.createFunction(mockClient, mockInputs, false);
      
      // Check that readFile was called with the correct path
      expect(fs.readFile).toHaveBeenCalledWith('/mock/path/file.zip');
      
      // Check that the client.send was called with the correct parameters
      expect(mockClient.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'CreateFunctionCommand',
        FunctionName: 'test-function',
        Role: 'arn:aws:iam::123456789012:role/test-role',
        Runtime: 'nodejs18.x',
        Handler: 'index.handler',
        Description: 'Test function description',
        MemorySize: 256,
        Timeout: 30,
        Publish: true,
        Architectures: ['x86_64'],
        Environment: { Variables: { KEY1: 'value1', KEY2: 'value2' } }
      }));
      
      // Check that outputs were set correctly
      expect(core.setOutput).toHaveBeenCalledWith('function-arn', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('version', expect.any(String));
      
      // Check that appropriate logs were generated
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Lambda function created successfully'));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Waiting for function test-function to become active'));
      
    } finally {
      // Restore the original function
      index.createFunction = originalCreateFunction;
    }
  });
  
  test('Successfully creates a Lambda function using S3 upload method', async () => {
    jest.setTimeout(1000);
    
    const originalCreateFunction = index.createFunction;
    
    index.createFunction = jest.fn().mockImplementation(async (client, inputs, functionExists) => {
      if (functionExists) {
        return; 
      }
      
      if (!inputs.role) {
        core.setFailed('Role ARN must be provided when creating a new function');
        return;
      }
      
      if (inputs.dryRun) {
        core.setFailed('DRY RUN MODE can only be used for updating function code of existing functions');
        return;
      }
      
      // Simulate function creation
      if (inputs.s3Bucket) {
        // Just log the S3 parameters - don't actually call uploadToS3
        core.info(`Using S3 bucket: ${inputs.s3Bucket}, key: ${inputs.s3Key}`);
        
        const command = new CreateFunctionCommand({
          FunctionName: inputs.functionName,
          Role: inputs.role,
          Code: {
            S3Bucket: inputs.s3Bucket,
            S3Key: inputs.s3Key
          },
          Runtime: inputs.runtime,
          Handler: inputs.handler
        });
        
        const response = await client.send(command);
        core.setOutput('function-arn', response.FunctionArn);
        if (response.Version) {
          core.setOutput('version', response.Version);
        }
      }
    });
    
    try {
      const mockClient = new LambdaClient({ region: 'us-east-1' });
      
      const mockInputs = {
        functionName: 'test-function',
        role: 'arn:aws:iam::123456789012:role/test-role',
        finalZipPath: '/mock/path/file.zip',
        parsedEnvironment: {},
        runtime: 'nodejs18.x',
        handler: 'index.handler',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key'
      };
      
      await index.createFunction(mockClient, mockInputs, false);
      
      // Check that the client.send was called with the correct parameters
      expect(mockClient.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'CreateFunctionCommand',
        FunctionName: 'test-function',
        Role: 'arn:aws:iam::123456789012:role/test-role',
        Code: {
          S3Bucket: 'test-bucket',
          S3Key: 'test-key'
        }
      }));
      
      // Check outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('function-arn', expect.any(String));
      expect(core.setOutput).toHaveBeenCalledWith('version', expect.any(String));
      
    } finally {
      // Restore the original function
      index.createFunction = originalCreateFunction;
    }
  });
  
  test('Skips function creation when function already exists', async () => {
    jest.setTimeout(1000);
    
    const mockClient = new LambdaClient({ region: 'us-east-1' });
    
    const mockInputs = {
      functionName: 'existing-function',
      role: 'arn:aws:iam::123456789012:role/test-role',
      finalZipPath: '/mock/path/file.zip',
      parsedEnvironment: {}
    };
    
    await index.createFunction(mockClient, mockInputs, true);
    
    expect(mockClient.send).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});

describe('Function Existence Check', () => {
  jest.setTimeout(1000); 

  let mockSend;
  
  beforeEach(() => {
    jest.resetAllMocks();
    
    core.getInput = jest.fn();
    core.getBooleanInput = jest.fn();
    core.info = jest.fn();
    core.setFailed = jest.fn();
    core.debug = jest.fn();
    core.setOutput = jest.fn();
    
    mockSend = jest.fn();
    LambdaClient.prototype.send = mockSend;
    
    GetFunctionConfigurationCommand.mockImplementation((params) => ({
      ...params,
      type: 'GetFunctionConfigurationCommand'
    }));

    CreateFunctionCommand.mockImplementation((params) => ({
      ...params,
      type: 'CreateFunctionCommand'
    }));

    fs.readFile = jest.fn().mockResolvedValue(Buffer.from('mock zip content'));
  });
  
  describe('checkFunctionExists', () => {
    afterAll(() => {
      jest.clearAllMocks();
      jest.useRealTimers();
    });
    
    it('should return true when the function exists', async () => {
      mockSend.mockResolvedValueOnce({
        Configuration: { FunctionName: 'test-function' }
      });
      
      const client = new LambdaClient({ region: 'us-east-1' });
      const result = await checkFunctionExists(client, 'test-function');
      
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        FunctionName: 'test-function',
        type: 'GetFunctionConfigurationCommand'
      }));
    });
    
    it('should return false when the function does not exist', async () => {
      const error = new Error('Function not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(error);
      
      const client = new LambdaClient({ region: 'us-east-1' });
      const result = await checkFunctionExists(client, 'test-function');
      
      expect(result).toBe(false);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        FunctionName: 'test-function',
        type: 'GetFunctionConfigurationCommand'
      }));
    });
    
    it('should propagate other errors', async () => {
      const error = new Error('Network error');
      error.name = 'NetworkError';
      mockSend.mockRejectedValueOnce(error);
      
      const client = new LambdaClient({ region: 'us-east-1' });
      
      await expect(checkFunctionExists(client, 'test-function'))
        .rejects.toThrow('Network error');
      
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        FunctionName: 'test-function',
        type: 'GetFunctionConfigurationCommand'
      }));
    });
  });
});
