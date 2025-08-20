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


});