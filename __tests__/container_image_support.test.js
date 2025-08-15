const core = require('@actions/core');
const originalValidations = require('../validations');

jest.mock('@actions/core');

describe('Container Image Support Tests', () => {
  let originalEnv;
  
  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    process.env = { ...originalEnv };
    process.env.GITHUB_SHA = 'abc123';
    
    // Default mock implementations
    core.getInput.mockImplementation((name) => {
      const inputs = {
        'function-name': 'test-function',
        'package-type': 'Image',
        'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
        'region': 'us-east-1'
      };
      return inputs[name] || '';
    });
    
    core.getBooleanInput.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Package Type Validation', () => {
    test('should accept Image package type with image-uri', () => {
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(result.packageType).toBe('Image');
      expect(result.imageUri).toBe('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('should fail when Image package type is used without image-uri', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Image',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(false);
      expect(core.setFailed).toHaveBeenCalledWith('image-uri must be provided when package-type is "Image"');
    });

    test('should accept Zip package type with code-artifacts-dir', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Zip',
          'code-artifacts-dir': './artifacts',
          'handler': 'index.handler',
          'runtime': 'nodejs20.x',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(result.packageType).toBe('Zip');
      expect(result.codeArtifactsDir).toBe('./artifacts');
      expect(core.setFailed).not.toHaveBeenCalled();
    });

    test('should fail when Zip package type is used without code-artifacts-dir', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Zip',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(false);
      expect(core.setFailed).toHaveBeenCalledWith('code-artifacts-dir must be provided when package-type is "Zip"');
    });

    test('should reject invalid package type', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'InvalidType',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(false);
      expect(core.setFailed).toHaveBeenCalledWith('Package type must be either \'Zip\' or \'Image\', got: InvalidType');
    });

    test('should default to Zip package type when not specified', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'code-artifacts-dir': './artifacts',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(result.packageType).toBe('Zip');
    });
  });

  describe('Input Conflict Warnings', () => {
    test('should warn when code-artifacts-dir is provided with Image package type', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Image',
          'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
          'code-artifacts-dir': './artifacts',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(core.warning).toHaveBeenCalledWith('code-artifacts-dir parameter is ignored when package-type is "Image"');
    });

    test('should warn when image-uri is provided with Zip package type', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Zip',
          'code-artifacts-dir': './artifacts',
          'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(core.warning).toHaveBeenCalledWith('image-uri parameter is ignored when package-type is "Zip"');
    });

    test('should warn when S3 parameters are provided with Image package type', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Image',
          'image-uri': '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest',
          's3-bucket': 'my-bucket',
          's3-key': 'my-key',
          'source-kms-key-arn': 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      expect(core.warning).toHaveBeenCalledWith('s3-bucket parameter is ignored when package-type is "Image"');
      expect(core.warning).toHaveBeenCalledWith('s3-key parameter is ignored when package-type is "Image"');
      expect(core.warning).toHaveBeenCalledWith('source-kms-key-arn parameter is ignored when package-type is "Image"');
    });

    test('should not warn about S3 parameters with Zip package type', () => {
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'package-type': 'Zip',
          'code-artifacts-dir': './artifacts',
          's3-bucket': 'my-bucket',
          's3-key': 'my-key',
          'region': 'us-east-1'
        };
        return inputs[name] || '';
      });
      
      const result = originalValidations.validateAllInputs();
      expect(result.valid).toBe(true);
      // Check that warning was not called for S3 parameters
      expect(core.warning).not.toHaveBeenCalledWith(expect.stringContaining('s3-bucket'));
      expect(core.warning).not.toHaveBeenCalledWith(expect.stringContaining('s3-key'));
    });
  });

});