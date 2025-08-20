const core = require('@actions/core');
const { validateAndResolvePath } = require('../validations');
const originalValidations = jest.requireActual('../validations');
const index = require('../index');
const validations = require('../validations');

jest.mock('@actions/core');
jest.mock('../validations', () => {
  return {
    
    ...jest.requireActual('../validations'),
    
    validateAllInputs: jest.fn()
  };
});

describe('Validations Tests', () => {
  describe('Numeric Input Validation Tests', () => {
    describe('Memory Size Validation', () => {
      test('should accept valid memory sizes', () => {
        
        const validSizes = ['128', '256', '512', '1024', '10240'];
        for (const size of validSizes) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((name) => {
            if (name === 'memory-size') return size;
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.parsedMemorySize).toBe(parseInt(size));
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('should handle empty memory size input', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((name) => {
            if (name === 'memory-size') return '';
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedMemorySize).toBeUndefined();
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should handle non-numeric memory size input', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((name) => {
            if (name === 'memory-size') return 'hello';
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith('Memory size must be a number, got: hello');
      });
    });
    describe('Timeout Validation', () => {
      test('should accept valid timeout values', () => {
        
        const validTimeouts = ['1', '30', '300', '900'];
        for (const timeout of validTimeouts) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((name) => {
            if (name === 'timeout') return timeout;
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.timeout).toBe(parseInt(timeout));
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('should handle non-numeric memory size input', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((name) => {
            if (name === 'timeout') return 'hello';
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
            return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith('Timeout must be a number, got: hello');
      });
    });
    describe('Ephemeral Storage Validation', () => {
      test('should accept valid ephemeral storage values', () => {
        
        const validStorageValues = ['512', '1024', '2048', '10240'];
        for (const storage of validStorageValues) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((name) => {
            if (name === 'ephemeral-storage') return storage;
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.ephemeralStorage).toBe(parseInt(storage));
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('should handle non-numeric memory size input', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((name) => {
            if (name === 'ephemeral-storage') return 'hello';
            if (name === 'function-name') return 'test-function';
            if (name === 'region') return 'us-east-1';
            if (name === 'code-artifacts-dir') return './artifacts';
            if (name === 'handler') return 'index.handler';
            if (name === 'runtime') return 'nodejs18.x';
            return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith('Ephemeral storage must be a number, got: hello');
      });
    });
  });
  describe('Required Input Validation Tests', () => {
    describe('Function Name Validation', () => {
      test('should accept valid function names', () => {
        const validNames = ['my-function', 'my_function', 'my.function', 'my-function-123'];
        for (const name of validNames) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((inputName) => {
            if (inputName === 'function-name') return name;
            if (inputName === 'region') return 'us-east-1';
            if (inputName === 'code-artifacts-dir') return './artifacts';
            if (inputName === 'handler') return 'index.handler';
            if (inputName === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.functionName).toBe(name);
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('should reject empty function names', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((inputName) => {
          if (inputName === 'function-name') return '';
          if (inputName === 'region') return 'us-east-1';
          if (inputName === 'code-artifacts-dir') return './artifacts';
          if (inputName === 'handler') return 'index.handler';
          if (inputName === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith('Function name must be provided');
      });
    });
    describe('Code Artifacts Directory Validation', () => {
      test('should accept valid code artifacts directories', () => {
        const validDirs = ['./artifacts', '../artifacts', '/home/user/artifacts'];
        for (const dir of validDirs) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((inputName) => {
            if (inputName === 'function-name') return 'test-function';
            if (inputName === 'region') return 'us-east-1';
            if (inputName === 'code-artifacts-dir') return dir;
            if (inputName === 'handler') return 'index.handler';
            if (inputName === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.codeArtifactsDir).toBe(dir);
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('should reject empty code artifacts directories', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((inputName) => {
          if (inputName === 'function-name') return 'test-function';
          if (inputName === 'region') return 'us-east-1';
          if (inputName === 'code-artifacts-dir') return '';
          if (inputName === 'handler') return 'index.handler';
          if (inputName === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith('code-artifacts-dir must be provided when package-type is "Zip"');
      });
    });
    describe('Handler Validation', () => {
      test('should accept valid handlers', () => {
        const validHandlers = ['index.handler', 'my-function.handler', 'my.function.handler'];
        for (const handler of validHandlers) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((inputName) => {
            if (inputName === 'function-name') return 'test-function';
            if (inputName === 'region') return 'us-east-1';
            if (inputName === 'code-artifacts-dir') return './artifacts';
            if (inputName === 'handler') return handler;
            if (inputName === 'runtime') return 'nodejs18.x';
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.handler).toBe(handler);
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('default to index.handler', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((inputName) => {
          if (inputName === 'function-name') return 'test-function';
          if (inputName === 'region') return 'us-east-1';
          if (inputName === 'code-artifacts-dir') return './artifacts';
          if (inputName === 'handler') return '';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.handler).toBe('index.handler');
        expect(core.setFailed).not.toHaveBeenCalled();
      });
    });
    describe('Runtime Validation', () => {
      test('should accept valid runtimes', () => {
        const validRuntimes = ['nodejs18.x', 'nodejs16.x', 'nodejs14.x', 'nodejs12.x'];
        for (const runtime of validRuntimes) {
          jest.clearAllMocks();
          core.getInput.mockImplementation((inputName) => {
            if (inputName === 'function-name') return 'test-function';
            if (inputName === 'region') return 'us-east-1';
            if (inputName === 'code-artifacts-dir') return './artifacts';
            if (inputName === 'handler') return 'index.handler';
            if (inputName === 'runtime') return runtime;
            return '';
          });
          const result = originalValidations.validateAllInputs();
          expect(result.valid).toBe(true);
          expect(result.runtime).toBe(runtime);
          expect(core.setFailed).not.toHaveBeenCalled();
        }
      });
      test('default to 20js.x', () => {
        jest.clearAllMocks();
        core.getInput.mockImplementation((inputName) => {
          if (inputName === 'function-name') return 'test-function';
          if (inputName === 'region') return 'us-east-1';
          if (inputName === 'code-artifacts-dir') return './artifacts';
          if (inputName === 'handler') return 'index.handler';
          if (inputName === 'runtime') return '';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.runtime).toBe('nodejs20.x');
        expect(core.setFailed).not.toHaveBeenCalled();
      });
    });
  });
  describe('ARN Input Validation Tests', () => {
    describe('Role ARN Validation', () => {
      test('should validate role ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'role') return 'arn:aws:iam::123456789012:role/test-role';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should reject invalid role ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'role') return 'invalid:arn:format';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid IAM role ARN format')
        );
      });
    });
    describe('Code Signing Config ARN Validation Test', () => {
      test('should validate code signing config ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'code-signing-config-arn') return 'arn:aws:lambda:us-east-1:123456789012:code-signing-config:abc123';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should reject invalid code signing config ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'code-signing-config-arn') return 'invalid:code:signing:arn';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid code signing config ARN format')
        );
      });
    });
    describe('KMS Key ARN Validation', () => {
      test('should validate KMS key ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'kms-key-arn') return 'arn:aws:kms:us-east-1:123456789012:key/abcdef12-3456-7890-abcd-ef1234567890';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should reject invalid source KMS key ARN format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'kms-key-arn') return 'invalid:kms:key:arn';
          if (name === 'source-kms-key-arn') return 'invalid:kms:key:arn'
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid KMS key ARN format')
        );
      });
      test('should reject invalid source-kms-key-arn format', () => {
        core.getInput.mockImplementation((name) => {
          if (name === 'source-kms-key-arn') return 'invalid:source:kms:arn';
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid KMS key ARN format')
        );
      });
    });
  });
  describe('JSON Input Validations', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      core.getInput = jest.fn();
      core.getBooleanInput = jest.fn();
      core.setFailed = jest.fn();
      core.getInput.mockImplementation((name) => {
        const inputs = {
          'function-name': 'test-function',
          'region': 'us-east-1',
          'code-artifacts-dir': './src',
          'handler': 'index.handler', 
          'runtime': 'nodejs18.x'     
        };
        return inputs[name] || '';
      });
    });
    describe('Environment validation', () => {
      test('should accept valid environment variables', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'environment') {
            return '{"ENV":"prod","DEBUG":"true","API_URL":"https://api.example.com"}'
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './src',
            'handler': 'index.handler',
            'runtime': 'nodejs18.x'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedEnvironment).toEqual({
          ENV: 'prod', 
          DEBUG: 'true', 
          API_URL: 'https://api.example.com'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject invalid JSON in environment', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'environment') {
            return '{"ENV":"prod", DEBUG:"true"}'; 
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './src',
            'handler': 'index.handler',
            'runtime': 'nodejs18.x'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Input validation error'));
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON in environment'));
      });
    });
    describe('vpc-config validation', () => {
      test('should accept valid vpc configuration', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'vpc-config') {
            return '{"SubnetIds":["subnet-123","subnet-456"],"SecurityGroupIds":["sg-123"]}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './src',
            'handler': 'index.handler',
            'runtime': 'nodejs18.x'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedVpcConfig).toEqual({
          SubnetIds: ['subnet-123', 'subnet-456'],
          SecurityGroupIds: ['sg-123']
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject vpc-config missing SubnetIds', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'vpc-config') {
            return '{"SecurityGroupIds":["sg-123"]}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './src'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('vpc-config must include \'SubnetIds\''));
      });
      test('should reject vpc-config with non-array SubnetIds', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'vpc-config') {
            return '{"SubnetIds": "subnet-123", "SecurityGroupIds":["sg-123"]}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './src'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('vpc-config must include \'SubnetIds\' as an array'));
      });
      test('should reject vpc-config missing SecurityGroupIds', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'vpc-config') {
            return '{"SubnetIds":["subnet-123","subnet-456"]}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir',
            'handler': 'index.handler',
            'runtime': 'nodejs18.x'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('vpc-config must include \'SecurityGroupIds\''));
      });
      test('should reject vpc-config with non-array SecurityGroupIds', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'vpc-config') {
            return '{"SubnetIds":["subnet-123","subnet-456"],"SecurityGroupIds":"sg-123"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('vpc-config must include \'SecurityGroupIds\' as an array'));
      });
    });
    describe('dead-letter-config validation', () => {
      test('should accept valid dead letter configuration', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'dead-letter-config') {
            return '{"TargetArn":"arn:aws:sns:us-east-1:123456789012:my-topic"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedDeadLetterConfig).toEqual({
          TargetArn: 'arn:aws:sns:us-east-1:123456789012:my-topic'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject dead-letter-config missing TargetArn', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'dead-letter-config') {
            return '{"SomeOtherProperty":"value"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('dead-letter-config must include \'TargetArn\''));
      });
    });
    describe('tracing-config validation', () => {
      test('should accept valid tracing configuration with Active mode', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tracing-config') {
            return '{"Mode":"Active"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedTracingConfig).toEqual({
          Mode: 'Active'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should accept valid tracing configuration with PassThrough mode', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tracing-config') {
            return '{"Mode":"PassThrough"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedTracingConfig).toEqual({
          Mode: 'PassThrough'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject tracing-config with invalid Mode', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tracing-config') {
            return '{"Mode":"InvalidMode"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('tracing-config Mode must be \'Active\' or \'PassThrough\''));
      });
      test('should reject tracing-config missing Mode', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tracing-config') {
            return '{"SomeOtherProperty":"value"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('tracing-config Mode must be \'Active\' or \'PassThrough\''));
      });
    });
    describe('layers validation', () => {
      test('should accept valid layers array', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'layers') {
            return '["arn:aws:lambda:us-east-1:123456789012:layer:layer1:1","arn:aws:lambda:us-east-1:123456789012:layer:layer2:2"]';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedLayers).toEqual([
          'arn:aws:lambda:us-east-1:123456789012:layer:layer1:1',
          'arn:aws:lambda:us-east-1:123456789012:layer:layer2:2'
        ]);
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject layers as non-array', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'layers') {
            return '{"layer":"arn:aws:lambda:us-east-1:123456789012:layer:layer1:1"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('layers must be an array of layer ARNs'));
      });
    });
    describe('file-system-configs validation', () => {
      test('should accept valid file system configs array', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'file-system-configs') {
            return '[{"Arn":"arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-123","LocalMountPath":"/mnt/efs"}]';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedFileSystemConfigs).toEqual([
          {
            Arn: 'arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-123',
            LocalMountPath: '/mnt/efs'
          }
        ]);
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject file-system-configs as non-array', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'file-system-configs') {
            return '{"Arn":"arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-123","LocalMountPath":"/mnt/efs"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'        };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('file-system-configs must be an array'));
      });
      test('should reject file-system-configs missing Arn', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'file-system-configs') {
            return '[{"LocalMountPath":"/mnt/efs"}]';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Each file-system-config must include \'Arn\' and \'LocalMountPath\''));
      });
      test('should reject file-system-configs missing LocalMountPath', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'file-system-configs') {
            return '[{"Arn":"arn:aws:elasticfilesystem:us-east-1:123456789012:access-point/fsap-123"}]';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('Each file-system-config must include \'Arn\' and \'LocalMountPath\''));
      });
    });
    describe('snap-start validation', () => {
      test('should accept valid snap-start with PublishedVersions', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'snap-start') {
            return '{"ApplyOn":"PublishedVersions"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedSnapStart).toEqual({
          ApplyOn: 'PublishedVersions'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should accept valid snap-start with None', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'snap-start') {
            return '{"ApplyOn":"None"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedSnapStart).toEqual({
          ApplyOn: 'None'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject snap-start with invalid ApplyOn', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'snap-start') {
            return '{"ApplyOn":"Invalid"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('snap-start ApplyOn must be \'PublishedVersions\' or \'None\''));
      });
      test('should reject snap-start missing ApplyOn', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'snap-start') {
            return '{"SomeOtherProperty":"value"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('snap-start ApplyOn must be \'PublishedVersions\' or \'None\''));
      });
    });
    describe('tags validation', () => {
      test('should accept valid tags object', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tags') {
            return '{"Environment":"Production","Team":"DevOps","Project":"Lambda-Action"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedTags).toEqual({
          Environment: 'Production',
          Team: 'DevOps',
          Project: 'Lambda-Action'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
      test('should reject tags as array', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'tags') {
            return '["tag1", "tag2"]';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('tags must be an object of key-value pairs'));
      });
    });
    describe('VPC Configuration Edge Cases', () => {
      test('should reject vpc-config with malformed SubnetIds', () => {
        const invalidVpcConfig = JSON.stringify({
          SubnetIds: "subnet-123", 
          SecurityGroupIds: ['sg-123']
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'vpc-config') return invalidVpcConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("vpc-config must include 'SubnetIds' as an array")
        );
      });
      test('should reject vpc-config with empty SecurityGroupIds array', () => {
        const validVpcConfig = JSON.stringify({
          SubnetIds: ['subnet-123'],
          SecurityGroupIds: []
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'vpc-config') return validVpcConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
    });
    describe('Dead Letter Config Validation', () => {
      test('should validate SQS ARN in dead-letter-config', () => {
        const validDLQConfig = JSON.stringify({
          TargetArn: 'arn:aws:sqs:us-east-1:123456789012:my-queue'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'dead-letter-config') return validDLQConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should validate SNS ARN in dead-letter-config', () => {
        const validDLQConfig = JSON.stringify({
          TargetArn: 'arn:aws:sns:us-east-1:123456789012:my-topic'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'dead-letter-config') return validDLQConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
    });
    describe('Invalid JSON Handling', () => {
      test('should handle invalid JSON format in vpc-config', () => {
        const invalidJson = '{ this is not valid JSON }';
        core.getInput.mockImplementation((name) => {
          if (name === 'vpc-config') return invalidJson;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid JSON in vpc-config')
        );
      });
      test('should handle invalid JSON format in environment', () => {
        const invalidJson = '{ ENV: production }';
        core.getInput.mockImplementation((name) => {
          if (name === 'environment') return invalidJson;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          if (name === 'handler') return 'index.handler';
          if (name === 'runtime') return 'nodejs18.x';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining('Invalid JSON in environment')
        );
      });
    });
    describe('Tracing Config Validation', () => {
      test('should reject invalid tracing mode values', () => {
        const invalidTracingConfig = JSON.stringify({
          Mode: 'Detailed' 
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'tracing-config') return invalidTracingConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("tracing-config Mode must be 'Active' or 'PassThrough'")
        );
      });
    });
    describe('SnapStart Config Validation', () => {
      test('should validate PublishedVersions for snap-start', () => {
        const validSnapStart = JSON.stringify({
          ApplyOn: 'PublishedVersions'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'snap-start') return validSnapStart;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should validate None for snap-start', () => {
        const validSnapStart = JSON.stringify({
          ApplyOn: 'None'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'snap-start') return validSnapStart;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should reject invalid ApplyOn values', () => {
        const invalidSnapStart = JSON.stringify({
          ApplyOn: 'AllVersions' 
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'snap-start') return invalidSnapStart;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("snap-start ApplyOn must be 'PublishedVersions' or 'None'")
        );
      });
    });
    describe('File System Configs Validation', () => {
      test('should reject non-array file-system-configs', () => {
        const invalidFSConfig = JSON.stringify({
          Arn: 'arn:aws:efs:us-east-1:123456789012:access-point/fsap-12345',
          LocalMountPath: '/mnt/efs'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'file-system-configs') return invalidFSConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("file-system-configs must be an array")
        );
      });
      test('should reject file-system-configs with missing Arn', () => {
        const invalidFSConfig = JSON.stringify([
          {
            LocalMountPath: '/mnt/efs'
          }
        ]);
        core.getInput.mockImplementation((name) => {
          if (name === 'file-system-configs') return invalidFSConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("Each file-system-config must include 'Arn' and 'LocalMountPath'")
        );
      });
      test('should validate multiple file system configs', () => {
        const validFSConfig = JSON.stringify([
          {
            Arn: 'arn:aws:efs:us-east-1:123456789012:access-point/fsap-12345',
            LocalMountPath: '/mnt/efs1'
          },
          {
            Arn: 'arn:aws:efs:us-east-1:123456789012:access-point/fsap-67890',
            LocalMountPath: '/mnt/efs2'
          }
        ]);
        core.getInput.mockImplementation((name) => {
          if (name === 'file-system-configs') return validFSConfig;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
    });
    describe('Tags Validation', () => {
      test('should validate complex tag objects', () => {
        const validTags = JSON.stringify({
          Environment: 'Production',
          Project: 'Lambda-Action',
          Team: 'DevOps',
          Cost: 'Center123',
          'Complex Key': 'Value with spaces'
        });
        core.getInput.mockImplementation((name) => {
          if (name === 'tags') return validTags;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
      });
      test('should reject tag arrays', () => {
        const invalidTags = JSON.stringify([
          { key: 'Environment', value: 'Production' }
        ]);
        core.getInput.mockImplementation((name) => {
          if (name === 'tags') return invalidTags;
          if (name === 'function-name') return 'test-function';
          if (name === 'region') return 'us-east-1';
          if (name === 'code-artifacts-dir') return './artifacts';
          return '';
        });
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(false);
        expect(core.setFailed).toHaveBeenCalledWith(
          expect.stringContaining("tags must be an object of key-value pairs")
        );
      });
    });
    describe('image-config validation', () => {
      test('should accept valid image-config', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'image-config') {
            return '{"EntryPoint":["/app/entrypoint.sh"],"Command":["handler"]}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedImageConfig).toEqual({
          EntryPoint: ['/app/entrypoint.sh'],
          Command: ['handler']
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
    });
    describe('logging-config validation', () => {
      test('should accept valid logging-config', () => {
        const mockGetInput = jest.fn((name) => {
          if (name === 'logging-config') {
            return '{"LogFormat":"JSON","ApplicationLogLevel":"INFO"}';
          }
          const inputs = {
            'function-name': 'test-function',
            'region': 'us-east-1',
            'code-artifacts-dir': './test-dir'
          };
          return inputs[name] || '';
        });
        core.getInput = mockGetInput;
        const result = originalValidations.validateAllInputs();
        expect(result.valid).toBe(true);
        expect(result.parsedLoggingConfig).toEqual({
          LogFormat: 'JSON',
          ApplicationLogLevel: 'INFO'
        });
        expect(core.setFailed).not.toHaveBeenCalled();
      });
    });
  });
  describe('getAdditionalInputs function', () => {
    test('should handle invalid publish input and default to false', () => {
      const mockGetBooleanInput = jest.fn((name) => {
        if (name === 'publish') {
          throw new Error('Invalid boolean input');
        }
        return false;
      });
      core.getBooleanInput = mockGetBooleanInput;
      const result = originalValidations.getAdditionalInputs();
      expect(result.publish).toBe(false);
    });
  });
  describe('validateAndResolvePath function', () => {
    let originalPlatform;
    beforeAll(() => {
      originalPlatform = process.platform;
    });
    afterAll(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });
    beforeEach(() => {
      process.cwd = jest.fn().mockReturnValue('/mock/cwd');
    });
    test('should resolve relative paths correctly', () => {
      const basePath = '/base/path';
      const relativePath = './subdir/file.js';
      const result = validateAndResolvePath(relativePath, basePath);
      expect(result).toBe('/base/path/subdir/file.js');
    });
    test('should allow absolute paths that are inside base path', () => {
      const basePath = '/base/path';
      const absolutePath = '/base/path/subdir/file.js';
      const result = validateAndResolvePath(absolutePath, basePath);
      expect(result).toBe('/base/path/subdir/file.js');
    });
    test('should handle paths with no traversal correctly', () => {
      const basePath = '/base/path';
      const safePath = 'subdir/file.js';
      const result = validateAndResolvePath(safePath, basePath);
      expect(result).toBe('/base/path/subdir/file.js');
    });
    test('should throw error for path traversal with ../', () => {
      const basePath = '/base/path';
      const maliciousPath = '../outside/file.js';
      expect(() => {
        validateAndResolvePath(maliciousPath, basePath);
      }).toThrow(/Security error: Path traversal attempt detected/);
    });
    test('should throw error for path traversal with multiple ../', () => {
      const basePath = '/base/path';
      const maliciousPath = 'subdir/../../outside/file.js';
      expect(() => {
        validateAndResolvePath(maliciousPath, basePath);
      }).toThrow(/Security error: Path traversal attempt detected/);
    });
    test('should throw error for absolute paths outside base path', () => {
      const basePath = '/base/path';
      const maliciousPath = '/outside/path/file.js';
      expect(() => {
        validateAndResolvePath(maliciousPath, basePath);
      }).toThrow(/Security error: Path traversal attempt detected/);
    });
    test('should normalize paths with redundant separators', () => {
      const basePath = '/base/path';
      const messyPath = 'subdir///nested//file.js';
      const result = validateAndResolvePath(messyPath, basePath);
      expect(result).toBe('/base/path/subdir/nested/file.js');
    });
    test('should handle absolute paths inside base path', () => {
      const basePath = '/base/path';
      let result = validateAndResolvePath(basePath, basePath);
      expect(result).toBe('/base/path');
      result = validateAndResolvePath(`${basePath}/subdir`, basePath);
      expect(result).toBe('/base/path/subdir');
    });
    test('should handle empty paths', () => {
      const basePath = '/base/path';
      const emptyPath = '';
      const result = validateAndResolvePath(emptyPath, basePath);
      expect(result).toBe('/base/path');
    });
    test('should handle current directory path', () => {
      const basePath = '/base/path';
      const currentDirPath = '.';
      const result = validateAndResolvePath(currentDirPath, basePath);
      expect(result).toBe('/base/path');
    });
    test('should handle special characters in paths', () => {
      const basePath = '/base/path';
      const specialCharsPath = 'subdir/file with spaces and $special#chars.js';
      const result = validateAndResolvePath(specialCharsPath, basePath);
      expect(result).toBe('/base/path/subdir/file with spaces and $special#chars.js');
    });
    test('should handle edge case where path resolves to base directory', () => {
      const basePath = '/base/path';
      const edgeCasePaths = [
        'subdir/..',
        'subdir/nested/../..',
        'subdir/./nested/../../',
        './subdir/../'
      ];
      edgeCasePaths.forEach(edgeCasePath => {
        const result = validateAndResolvePath(edgeCasePath, basePath);
        expect(result).toBe('/base/path');
      });
    });
    test('should handle paths with dot directory references', () => {
      const basePath = '/base/path';
      const pathWithDots = 'subdir/./nested/./file.js';
      const result = validateAndResolvePath(pathWithDots, basePath);
      expect(result).toBe('/base/path/subdir/nested/file.js');
    });
    test('should handle complex absolute paths correctly', () => {
      const basePath = '/base/path';
      const absolutePath = '/base/path/./subdir/../file.js';
      expect(() => {
        validateAndResolvePath(absolutePath, basePath);
      }).not.toThrow();
      const result = validateAndResolvePath(absolutePath, basePath);
      expect(result).toBe('/base/path/file.js');
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

  describe('Early Return on Invalid Inputs', () => {
    test('run should return early when validations fail', async () => {
      const mockValidateAllInputs = jest.fn().mockReturnValue({ valid: false });
      const originalValidateAllInputs = validations.validateAllInputs;
      validations.validateAllInputs = mockValidateAllInputs;
      
      const coreSpy = jest.spyOn(require('@actions/core'), 'info');
      
      await index.run();
      
      expect(mockValidateAllInputs).toHaveBeenCalledTimes(1);
      expect(coreSpy).not.toHaveBeenCalledWith(expect.stringMatching(/Creating Lambda function with deployment package/));
      
      validations.validateAllInputs = originalValidateAllInputs;
    });

  });
});

