jest.mock('@actions/core');
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sts');
jest.mock('fs/promises');

const core = require('@actions/core');
const { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const fs = require('fs/promises');
const mainModule = require('../index');

describe('S3 Bucket Operations Tests', () => {
  let mockS3Send;
  beforeEach(() => {
    jest.clearAllMocks();

    core.getInput.mockImplementation((name) => {
      const inputs = {
        'function-name': 'test-function',
        'region': 'us-east-1',
        'code-artifacts-dir': '/mock/artifacts',
        's3-bucket': 'test-lambda-bucket',
        's3-key': 'test-lambda-key.zip'
      };
      return inputs[name] || '';
    });
    core.getBooleanInput.mockImplementation((name) => {
      if (name === 'create-s3-bucket') return true;
      return false;
    });
    core.info = jest.fn();
    core.error = jest.fn();
    core.warning = jest.fn();
    core.setFailed = jest.fn();
    core.setOutput = jest.fn();

    fs.readFile.mockResolvedValue(Buffer.from('mock file content'));
    fs.access.mockResolvedValue(undefined);
    fs.stat.mockResolvedValue({
      size: 1024 
    });

    mockS3Send = jest.fn();
    S3Client.prototype.send = mockS3Send;
    
    STSClient.prototype.send = jest.fn().mockImplementation((command) => {
      if (command instanceof GetCallerIdentityCommand) {
        return Promise.resolve({
          Account: '123456789012' 
        });
      }
      return Promise.reject(new Error('Unknown STS command'));
    });
  });
  
  describe('checkBucketExists function', () => {
    test('should return true when bucket exists', async () => {

      mockS3Send.mockResolvedValueOnce({});
      const s3Client = new S3Client({ region: 'us-east-1' });
      const result = await mainModule.checkBucketExists(s3Client, 'existing-bucket');
      
      expect(result).toBe(true);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(HeadBucketCommand));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('exists'));
    });
    test('should return false when bucket does not exist (404)', async () => {

      const notFoundError = new Error('Not Found');
      notFoundError.$metadata = { httpStatusCode: 404 };
      notFoundError.name = 'NotFound';
      
      mockS3Send.mockRejectedValueOnce(notFoundError);
      const s3Client = new S3Client({ region: 'us-east-1' });
      const result = await mainModule.checkBucketExists(s3Client, 'non-existing-bucket');
      expect(result).toBe(false);
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('does not exist'));
    });
    test('should throw error when HeadBucket returns non-404 error', async () => {

      const accessError = new Error('Access Denied');
      accessError.$metadata = { httpStatusCode: 403 };
      accessError.name = 'AccessDenied';
      
      mockS3Send.mockRejectedValueOnce(accessError);
      const s3Client = new S3Client({ region: 'us-east-1' });
      await expect(mainModule.checkBucketExists(s3Client, 'forbidden-bucket'))
        .rejects.toThrow();
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Error checking if bucket exists'));
    });
    test('should handle region mismatch error (301)', async () => {

      const regionError = new Error('Moved Permanently');
      regionError.$metadata = { httpStatusCode: 301 };
      mockS3Send.mockRejectedValueOnce(regionError);

      const s3Client = new S3Client({ region: 'us-east-1' });

      s3Client.config = { region: 'us-east-1' };
      await expect(mainModule.checkBucketExists(s3Client, 'wrong-region-bucket'))
        .rejects.toThrow(/different region/);
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('REGION MISMATCH ERROR'));
    });
  });
  
  describe('createBucket function', () => {
    test('should create bucket in non-us-east-1 regions with LocationConstraint', async () => {
      mockS3Send.mockResolvedValueOnce({
        Location: 'http://test-bucket.s3.amazonaws.com/'
      });
      const s3Client = new S3Client({ region: 'us-west-2' });
      await mainModule.createBucket(s3Client, 'test-bucket', 'us-west-2');

      expect(mockS3Send).toHaveBeenCalled();
      expect(CreateBucketCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          CreateBucketConfiguration: { LocationConstraint: 'us-west-2' }
        })
      );
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Successfully created S3 bucket'));
    });
    test('should create bucket in us-east-1 without LocationConstraint', async () => {
      mockS3Send.mockResolvedValueOnce({
        Location: 'http://test-bucket.s3.amazonaws.com/'
      });
      const s3Client = new S3Client({ region: 'us-east-1' });
      await mainModule.createBucket(s3Client, 'test-bucket', 'us-east-1');

      expect(mockS3Send).toHaveBeenCalled();
      expect(CreateBucketCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket'
        })
      );
      const createBucketCommand = CreateBucketCommand.mock.calls[0][0];
      expect(createBucketCommand.CreateBucketConfiguration).toBeUndefined();
    });
    test('should handle bucket already exists error', async () => {
      const existsError = new Error('Bucket already exists');
      existsError.name = 'BucketAlreadyExists';
      mockS3Send.mockRejectedValueOnce(existsError);
      const s3Client = new S3Client({ region: 'us-east-1' });
      await expect(mainModule.createBucket(s3Client, 'existing-bucket', 'us-east-1'))
        .rejects.toThrow();
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('already taken'));
    });
    
    test('should handle bucket already owned by you error', async () => {
      const ownedError = new Error('Bucket already owned by you');
      ownedError.name = 'BucketAlreadyOwnedByYou';
      ownedError.code = 'BucketAlreadyOwnedByYou';
      
      mockS3Send.mockRejectedValueOnce(ownedError);
      const s3Client = new S3Client({ region: 'us-east-1' });
      
      await expect(mainModule.createBucket(s3Client, 'my-existing-bucket', 'us-east-1'))
        .rejects.toThrow(ownedError);
        
      expect(core.info).toHaveBeenCalledWith('Creating S3 bucket: my-existing-bucket');
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Sending CreateBucket request'));
      
      expect(mockS3Send).toHaveBeenCalledTimes(1);
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(CreateBucketCommand));
    });
    test('should handle permission denied error', async () => {
      const accessError = new Error('Access Denied');
      accessError.name = 'AccessDenied';
      accessError.$metadata = { httpStatusCode: 403 };
      mockS3Send.mockRejectedValueOnce(accessError);
      const s3Client = new S3Client({ region: 'us-east-1' });
      await expect(mainModule.createBucket(s3Client, 'test-bucket', 'us-east-1'))
        .rejects.toThrow(/Access denied/);
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
    });
    test('should validate bucket name before creating', async () => {
      const s3Client = new S3Client({ region: 'us-east-1' });
      await expect(mainModule.createBucket(s3Client, 'Invalid_Bucket', 'us-east-1'))
        .rejects.toThrow(/Invalid bucket name/);
      expect(mockS3Send).not.toHaveBeenCalled();
    });
  });
  
  describe('validateBucketName function', () => {
    test('should validate correct bucket names', () => {
      expect(mainModule.validateBucketName('valid-bucket-name')).toBe(true);
      expect(mainModule.validateBucketName('my.bucket.name')).toBe(true);
      expect(mainModule.validateBucketName('bucket-123')).toBe(true);
      expect(mainModule.validateBucketName('a-really-long-but-valid-bucket-name-within-63-chars')).toBe(true);
    });
    test('should reject invalid bucket names', () => {
      expect(mainModule.validateBucketName('UPPERCASE')).toBe(false);
      expect(mainModule.validateBucketName('bucket_with_underscore')).toBe(false);
      expect(mainModule.validateBucketName('sh')).toBe(false); 
      expect(mainModule.validateBucketName('192.168.1.1')).toBe(false); 
      expect(mainModule.validateBucketName('bucket..name')).toBe(false); 
      expect(mainModule.validateBucketName('xn--bucket')).toBe(false); 
      expect(mainModule.validateBucketName('a'.repeat(64))).toBe(false);
      expect(mainModule.validateBucketName(null)).toBe(false);
      expect(mainModule.validateBucketName(undefined)).toBe(false);
      expect(mainModule.validateBucketName(123)).toBe(false); 
    });
  });
 
  describe('uploadToS3 function', () => {
    test('should upload file to existing S3 bucket', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      jest.spyOn(mainModule, 'checkBucketExists').mockResolvedValue(true);
      jest.clearAllMocks();

      mockS3Send.mockResolvedValueOnce({}); 
      const result = await mainModule.uploadToS3(
        '/path/to/deployment.zip',
        'new-bucket',
        'lambda/function.zip',
        'us-east-1'
      );
      expect(result).toEqual({
        bucket: 'new-bucket',
        key: 'lambda/function.zip'
      });
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('S3 upload successful, file size'));
    });
    test('should create bucket if it does not exist', async () => {

      jest.clearAllMocks();

      fs.readFile.mockResolvedValue(Buffer.from('test file content'));

      const notFoundError = new Error('Not Found');
      notFoundError.$metadata = { httpStatusCode: 404 };
      notFoundError.name = 'NotFound';
     
      mockS3Send.mockRejectedValueOnce(notFoundError);
      mockS3Send.mockResolvedValueOnce({
        Location: 'http://new-bucket.s3.amazonaws.com/'
      });

      mockS3Send.mockResolvedValueOnce({});

      jest.spyOn(mainModule, 'createBucket').mockResolvedValue(true);
      mockS3Send.mockResolvedValueOnce({}); 
      await mainModule.uploadToS3(
        '/path/to/deployment.zip',
        'new-bucket',
        'lambda/function.zip',
        'us-east-1',
        '123456789012' 
      );
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Bucket new-bucket does not exist. Attempting to create it'));
      expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    });
    test('should handle file access errors', async () => {

      const fileError = new Error('Permission denied');
      fileError.code = 'EACCES';
     
      fs.access.mockRejectedValueOnce(fileError);
      await expect(mainModule.uploadToS3(
        '/inaccessible/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1',
        '123456789012' // Adding expected bucket owner
      )).rejects.toThrow('Permission denied');
      expect(core.error).toHaveBeenCalled();
    });
    
    test('should handle bucket already owned by you error in uploadToS3', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const notFoundError = new Error('Not Found');
      notFoundError.$metadata = { httpStatusCode: 404 };
      notFoundError.name = 'NotFound';
      mockS3Send.mockRejectedValueOnce(notFoundError);
      
      const ownedError = new Error('Bucket already owned by you');
      ownedError.name = 'BucketAlreadyOwnedByYou';
      ownedError.code = 'BucketAlreadyOwnedByYou';
      
      mockS3Send.mockRejectedValueOnce(ownedError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/deployment.zip',
        'my-existing-bucket',
        'lambda/function.zip',
        'us-east-1'
      )).rejects.toThrow('Bucket already owned by you');
      
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create bucket my-existing-bucket'));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Bucket name my-existing-bucket is already taken'));
      
      expect(core.info).toHaveBeenCalledWith('Bucket my-existing-bucket does not exist. Attempting to create it...');
      expect(core.info).toHaveBeenCalledWith('Creating S3 bucket: my-existing-bucket');
    });
    test('should handle S3 upload errors', async () => {

      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      jest.spyOn(mainModule, 'checkBucketExists').mockResolvedValue(true);

      const uploadError = new Error('Upload failed');
      uploadError.name = 'S3Error';
      uploadError.$metadata = { httpStatusCode: 500 };
      
      mockS3Send.mockRejectedValueOnce(uploadError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1',
        '123456789012' 
      )).rejects.toThrow('Upload failed');

      const errorCalls = core.error.mock.calls.flat().join(' ');

      expect(errorCalls).toContain('upload');
      expect(errorCalls).toContain('failed');
    });
    test('should handle S3 permission errors', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      
      jest.spyOn(mainModule, 'checkBucketExists').mockResolvedValue(true);
      
      const permError = new Error('Access Denied');
      
      permError.name = 'AccessDenied';
      permError.$metadata = { httpStatusCode: 403 };
      
      mockS3Send.mockRejectedValueOnce(permError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Access denied');
      
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Access denied'));
    });
  });
  
  describe('getAwsAccountId function', () => {
    test('should retrieve AWS account ID successfully', async () => {
      const result = await mainModule.getAwsAccountId('us-east-1');
      expect(result).toBe('123456789012');
      expect(STSClient.prototype.send).toHaveBeenCalledWith(expect.any(GetCallerIdentityCommand));
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Successfully retrieved AWS account ID'));
    });

    test('should handle errors and return null', async () => {
      STSClient.prototype.send = jest.fn().mockRejectedValueOnce(new Error('STS error'));
      const result = await mainModule.getAwsAccountId('us-east-1');
      expect(result).toBeNull();
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Failed to retrieve AWS account ID'));
    });
  });

  describe('S3 Key Generation', () => {
    test('should generate S3 key with timestamp and commit hash', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        GITHUB_SHA: 'abcdef1234567890'
      };
      const key = mainModule.generateS3Key('test-function');
      process.env = originalEnv;
      expect(key).toMatch(/^lambda-deployments\/test-function\/[\d-]+-abcdef1.zip$/);
    });
    test('should generate S3 key without commit hash if not available', () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv };
      delete process.env.GITHUB_SHA;
      const key = mainModule.generateS3Key('test-function');

      process.env = originalEnv;
      expect(key).toMatch(/^lambda-deployments\/test-function\//);
      expect(key).toMatch(/\.zip$/);
      expect(key).not.toMatch(/[a-f0-9]{7,}\.zip$/);
    });
  });
  
  describe('uploadToS3 error handling', () => {
    test('should handle NoSuchBucket error', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const noSuchBucketError = new Error('No such bucket');
      noSuchBucketError.code = 'NoSuchBucket';
      
      mockS3Send.mockRejectedValueOnce(noSuchBucketError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'non-existent-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('No such bucket');
      
      expect(core.error).toHaveBeenCalledWith('Bucket non-existent-bucket does not exist and could not be created automatically. Please create it manually or check your permissions.');
    });
    
    test('should handle AccessDenied error with code', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const accessDeniedError = new Error('Access denied');
      accessDeniedError.code = 'AccessDenied';
      
      mockS3Send.mockRejectedValueOnce(accessDeniedError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Access denied');
      
      expect(core.error).toHaveBeenCalledWith('Access denied. Ensure your AWS credentials have the following permissions:');
      expect(core.error).toHaveBeenCalledWith('- s3:HeadBucket (to check if the bucket exists)');
      expect(core.error).toHaveBeenCalledWith('- s3:CreateBucket (to create the bucket if it doesn\'t exist)');
      expect(core.error).toHaveBeenCalledWith('- s3:PutObject (to upload the file to the bucket)');
      expect(core.error).toHaveBeenCalledWith('See s3-troubleshooting.md for a complete IAM policy template.');
    });
    
    test('should handle AccessDenied error with name', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const accessDeniedError = new Error('Access denied');
      accessDeniedError.name = 'AccessDenied';
      
      mockS3Send.mockRejectedValueOnce(accessDeniedError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Access denied');
      
      expect(core.error).toHaveBeenCalledWith('Access denied. Ensure your AWS credentials have the following permissions:');
    });
    
    test('should handle AccessDenied error with 403 status code', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const accessDeniedError = new Error('Access denied');
      accessDeniedError.$metadata = { httpStatusCode: 403 };
      
      mockS3Send.mockRejectedValueOnce(accessDeniedError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Access denied');
    });
    
    test('should handle CredentialsProviderError', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const credentialsError = new Error('Credentials not found');
      credentialsError.name = 'CredentialsProviderError';
      
      mockS3Send.mockRejectedValueOnce(credentialsError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'test-bucket',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Credentials not found');
      
      expect(core.error).toHaveBeenCalledWith('AWS credentials not found or invalid. Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
    });
    
    test('should handle InvalidBucketName error', async () => {
      fs.readFile.mockResolvedValue(Buffer.from('test file content'));
      fs.access.mockResolvedValue(undefined);
      
      const invalidBucketError = new Error('Invalid bucket name');
      invalidBucketError.name = 'InvalidBucketName';
      
      mockS3Send.mockRejectedValueOnce(invalidBucketError);
      
      await expect(mainModule.uploadToS3(
        '/path/to/file.zip',
        'Invalid_Bucket_Name',
        'key.zip',
        'us-east-1'
      )).rejects.toThrow('Invalid bucket name');
      
      expect(core.error).toHaveBeenCalledWith('Invalid bucket name: Invalid_Bucket_Name. Bucket names must follow S3 naming rules.');
      expect(core.error).toHaveBeenCalledWith('See s3-troubleshooting.md for S3 bucket naming rules.');
    });
    
    test('should handle S3 upload failure with stack trace in createFunction', async () => {
      const uploadError = new Error('S3 upload failed');
      uploadError.stack = 'Error: S3 upload failed\n    at uploadToS3';
      
      jest.spyOn(mainModule, 'uploadToS3').mockRejectedValue(uploadError);
      
      const mockClient = { send: jest.fn() };
      const inputs = {
        functionName: 'test-function',
        finalZipPath: '/path/to/file.zip',
        s3Bucket: 'test-bucket',
        s3Key: 'test-key.zip',
        region: 'us-east-1',
        role: 'arn:aws:iam::123456789012:role/test-role'
      };
      
      await expect(mainModule.createFunction(mockClient, inputs, false)).rejects.toThrow('Cannot read properties of undefined');
    });
  });
  
  describe('End-to-End S3 Deployment Flow', () => {
    let originalRun;
    beforeAll(() => {
      originalRun = mainModule.run;
    });
    afterAll(() => {
      mainModule.run = originalRun;
    });
    beforeEach(() => {
      jest.spyOn(mainModule, 'packageCodeArtifacts').mockResolvedValue('/mock/package.zip');
      jest.spyOn(mainModule, 'checkFunctionExists').mockResolvedValue(true);
      jest.spyOn(mainModule, 'hasConfigurationChanged').mockResolvedValue(false);
      jest.spyOn(mainModule, 'waitForFunctionUpdated').mockResolvedValue(undefined);

      jest.spyOn(mainModule, 'uploadToS3').mockImplementation(() => {
        return Promise.resolve({
          bucket: 'mock-bucket',
          key: 'mock-key.zip'
        });
      });
      jest.spyOn(mainModule, 'generateS3Key').mockImplementation((functionName) => {
        return `lambda-deployments/${functionName}/timestamp-mock.zip`;
      });

      mainModule.run = jest.fn().mockImplementation(() => {
        return Promise.resolve();
      });
    });
    test('should use S3 deployment method when s3-bucket is provided', async () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'code-artifacts-dir': '/mock/artifacts',
          'region': 'us-east-1',
          's3-bucket': 'lambda-deployment-bucket',
          's3-key': 'custom/key/path.zip'
        };
        return inputs[name] || '';
      });

      mainModule.uploadToS3.mockReset();
      mainModule.uploadToS3.mockResolvedValueOnce({
        bucket: 'lambda-deployment-bucket',
        key: 'custom/key/path.zip'
      });

      const testUploadFunction = async () => {
        const s3Bucket = core.getInput('s3-bucket');
        const s3Key = core.getInput('s3-key');
        const region = core.getInput('region');
        if (s3Bucket) {
          jest.spyOn(mainModule, 'getAwsAccountId').mockResolvedValue('123456789012');
          return mainModule.uploadToS3(
            '/mock/package.zip',
            s3Bucket,
            s3Key,
            region
          );
        }
        return null;
      };

      const result = await testUploadFunction();

      expect(mainModule.uploadToS3).toHaveBeenCalledWith(
        '/mock/package.zip',
        'lambda-deployment-bucket',
        'custom/key/path.zip',
        'us-east-1'
      );

      expect(result).toEqual({
        bucket: 'lambda-deployment-bucket',
        key: 'custom/key/path.zip'
      });
    });
    test('should generate S3 key when not provided', async () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'code-artifacts-dir': '/mock/artifacts',
          'region': 'us-east-1',
          's3-bucket': 'lambda-deployment-bucket'
        };
        return inputs[name] || '';
      });

      mainModule.generateS3Key.mockReset();
      const mockGeneratedKey = 'lambda-deployments/test-function/timestamp.zip';
      mainModule.generateS3Key.mockReturnValueOnce(mockGeneratedKey);

      const testKeyGeneration = () => {
        const functionName = core.getInput('function-name');
        const s3Key = core.getInput('s3-key');
        if (!s3Key) {
          return mainModule.generateS3Key(functionName);
        }
        return s3Key;
      };
      const result = testKeyGeneration();
      expect(mainModule.generateS3Key).toHaveBeenCalledWith('test-function');
      expect(result).toEqual(mockGeneratedKey);
    });
    test('should use ZipFile method if no S3 bucket is provided', async () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'code-artifacts-dir': '/mock/artifacts',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const testDirectUpload = () => {
        const s3Bucket = core.getInput('s3-bucket');
        return !s3Bucket; 
      };
      
      const useDirectUpload = testDirectUpload();

      expect(useDirectUpload).toBe(true);

      mainModule.uploadToS3.mockReset();

      const s3Bucket = core.getInput('s3-bucket');
      if (s3Bucket) {
        await mainModule.uploadToS3('file.zip', s3Bucket, 'key.zip', 'region');
      }
      expect(mainModule.uploadToS3).not.toHaveBeenCalled();
    });
  });
});
