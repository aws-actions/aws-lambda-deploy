const core = require('@actions/core');
const { isEmptyValue, cleanNullKeys, hasConfigurationChanged } = require('../index');

jest.mock('@actions/core');

describe('Has Configuration Changed Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    core.info = jest.fn();
  });
 
  test('should return true when current config is empty/null', async () => {
    const result = await hasConfigurationChanged(null, { Runtime: 'nodejs18.x' });
    expect(result).toBe(true);
    const emptyResult = await hasConfigurationChanged({}, { Runtime: 'nodejs18.x' });
    expect(emptyResult).toBe(true);
  });
  
  test('should return false when configurations are identical', async () => {
    const current = {
      Runtime: 'nodejs18.x',
      MemorySize: 256,
      Timeout: 30
    };
    const updated = {
      Runtime: 'nodejs18.x',
      MemorySize: 256,
      Timeout: 30
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(false);
    expect(core.info).not.toHaveBeenCalled();
  });
  
  test('should return true when string values differ', async () => {
    const current = {
      Runtime: 'nodejs16.x',
      Handler: 'index.handler'
    };
    const updated = {
      Runtime: 'nodejs18.x',
      Handler: 'index.handler'
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Runtime'));
  });
  
  test('should return true when numeric values differ', async () => {
    const current = {
      MemorySize: 128,
      Timeout: 30
    };
    const updated = {
      MemorySize: 256,
      Timeout: 30
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in MemorySize'));
  });
 
  test('should return true when object values differ', async () => {
    const current = {
      Environment: {
        Variables: {
          ENV: 'dev',
          DEBUG: 'false'
        }
      }
    };
    const updated = {
      Environment: {
        Variables: {
          ENV: 'prod',
          DEBUG: 'false'
        }
      }
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Environment'));
  });
  
  test('should return true when array values differ', async () => {
    const current = {
      Layers: ['arn:aws:lambda:us-east-1:123456789012:layer:layer1:1']
    };
    const updated = {
      Layers: [
        'arn:aws:lambda:us-east-1:123456789012:layer:layer1:1',
        'arn:aws:lambda:us-east-1:123456789012:layer:layer2:1'
      ]
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Layers'));
  });
  
  test('should ignore undefined or null values in updated config', async () => {
    const current = {
      Runtime: 'nodejs18.x',
      MemorySize: 256,
      Timeout: 30
    };
    const updated = {
      Runtime: 'nodejs18.x',
      MemorySize: undefined,
      Timeout: null,
      Handler: 'index.handler' 
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in MemorySize'));
    expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Timeout'));
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Handler'));
  });
  
  test('should handle complex nested objects', async () => {
    const current = {
      VpcConfig: {
        SubnetIds: ['subnet-123', 'subnet-456'],
        SecurityGroupIds: ['sg-123']
      },
      Environment: {
        Variables: {
          ENV: 'dev',
          REGION: 'us-east-1',
          DEBUG: 'true'
        }
      }
    };
    const updated = {
      VpcConfig: {
        SubnetIds: ['subnet-123', 'subnet-456'],
        SecurityGroupIds: ['sg-123', 'sg-456'] 
      },
      Environment: {
        Variables: {
          ENV: 'dev',
          REGION: 'us-east-1',
          DEBUG: 'true'
        }
      }
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in VpcConfig'));
  });
  
  test('should return false when no meaningful changes exist', async () => {
    const current = {
      Runtime: 'nodejs18.x',
      MemorySize: 256,
      Environment: {
        Variables: {
          ENV: 'production'
        }
      }
    };
    const updated = {
      
      
      Runtime: 'nodejs18.x',
      MemorySize: 256,
      Environment: {
        Variables: {
          ENV: 'production'
        }
      },
      
      NewField1: undefined,
      NewField2: null
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(false);
  });
  
  test('should handle empty arrays properly', async () => {
    const current = {
      Layers: ['arn:aws:lambda:us-east-1:123456789012:layer:layer1:1']
    };
    const updated = {
      Layers: [] 
    };
    
    
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(false);
  });
  
  test('should handle arrays with empty values', async () => {
    const current = {
      Layers: ['layer1', 'layer2', 'layer3']
    };
    const updated = {
      Layers: ['layer1', null, 'layer3', undefined, ''] 
    };
    
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Layers'));
  });
  
  test('should handle empty objects properly', async () => {
    const current = {
      Environment: {
        Variables: {
          ENV: 'dev'
        }
      }
    };
    const updated = {
      Environment: {} 
    };
    
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(false);
  });
  
  test('should handle objects with empty nested properties', async () => {
    const current = {
      Environment: {
        Variables: {
          ENV: 'dev',
          DEBUG: 'true'
        }
      }
    };
    const updated = {
      Environment: {
        Variables: {
          ENV: 'dev',
          DEBUG: 'true',
          EMPTY_ARRAY: [],
          EMPTY_OBJECT: {},
          NULL_VALUE: null
        }
      }
    };
    
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(false);
  });
  
  test('should detect changes when empty values are replaced with real values', async () => {
    const current = {
      Environment: {
        Variables: {
          ENV: 'dev',
          DEBUG: '',  
          LOG_LEVEL: null 
        }
      }
    };
    const updated = {
      Environment: {
        Variables: {
          ENV: 'dev',
          DEBUG: 'true', 
          LOG_LEVEL: 'info' 
        }
      }
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Environment'));
  });
  
  test('should handle zero as a valid non-empty value', async () => {
    const current = {
      RetryAttempts: 3
    };
    const updated = {
      RetryAttempts: 0 
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in RetryAttempts'));
  });
  
  test('should handle false as a valid non-empty value', async () => {
    const current = {
      CacheEnabled: true
    };
    const updated = {
      CacheEnabled: false 
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in CacheEnabled'));
  });
  
  test('should handle new configuration parameters', async () => {
    const current = {
      Runtime: 'nodejs18.x',
      MemorySize: 256
    };
    const updated = {
      Runtime: 'nodejs20.x',
      MemorySize: 256,
      SnapStart: { ApplyOn: 'PublishedVersions' },
      LoggingConfig: { LogFormat: 'JSON' }
    };
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in Runtime'));
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in SnapStart'));
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in LoggingConfig'));
  });
  
  test('should handle special case for VpcConfig with empty arrays', async () => {
    const current = {
      VpcConfig: {
        SubnetIds: ['subnet-123', 'subnet-456'],
        SecurityGroupIds: ['sg-123']
      }
    };
    const updated = {
      VpcConfig: {
        SubnetIds: [],
        SecurityGroupIds: []
      }
    };
    
    const result = await hasConfigurationChanged(current, updated);
    expect(result).toBe(true);
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Configuration difference detected in VpcConfig'));
  });
  
  test('should correctly identify empty values', () => {
    expect(isEmptyValue(null)).toBe(true);
    expect(isEmptyValue(undefined)).toBe(true);
    expect(isEmptyValue('')).toBe(true);
    expect(isEmptyValue([])).toBe(true);
    expect(isEmptyValue({})).toBe(true);
  });
  
  test('should identify non-empty values', () => {
    expect(isEmptyValue('value')).toBe(false);
    expect(isEmptyValue(0)).toBe(false);
    expect(isEmptyValue(false)).toBe(false);
    expect(isEmptyValue(['item'])).toBe(false);
    expect(isEmptyValue({ key: 'value' })).toBe(false);
  });
  
  test('should handle nested structures', () => {
    expect(isEmptyValue([null, undefined, ''])).toBe(true);
    expect(isEmptyValue({ a: null, b: undefined, c: '' })).toBe(true);
    expect(isEmptyValue([null, 'value', undefined])).toBe(false);
    expect(isEmptyValue({ a: null, b: 'value', c: undefined })).toBe(false);
  });
    
  test('should remove null and undefined values from objects', () => {
    const input = {
      validProp: 'value',
      nullProp: null,
      undefinedProp: undefined,
      emptyString: ''
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      validProp: 'value'
    });
  });
  
  test('should filter empty values from arrays', () => {
    const input = {
      array: [1, null, 2, undefined, '', 3]
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      array: [1, 2, 3]
    });
  });
  
  test('should handle nested objects and arrays', () => {
    const input = {
      nested: {
        validProp: 'value',
        nullProp: null,
        array: [1, null, '']
      },
      emptyArray: [null, undefined, ''],
      emptyObject: { a: null, b: undefined, c: '' }
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      nested: {
        validProp: 'value',
        array: [1]
      }
    });
  });
  
  test('should preserve VpcConfig with empty arrays for SubnetIds and SecurityGroupIds', () => {
    const input = {
      VpcConfig: {
        SubnetIds: [],
        SecurityGroupIds: []
      }
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      VpcConfig: {
        SubnetIds: [],
        SecurityGroupIds: []
      }
    });
  });
  
  test('should handle VpcConfig even when other properties have empty values', () => {
    const input = {
      FunctionName: 'test-function',
      Role: 'arn:aws:iam::123456789012:role/lambda-role',
      VpcConfig: {
        SubnetIds: ['subnet-123'],
        SecurityGroupIds: [],
        EmptyProp: null
      },
      EmptyObj: {}
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      FunctionName: 'test-function',
      Role: 'arn:aws:iam::123456789012:role/lambda-role',
      VpcConfig: {
        SubnetIds: ['subnet-123'],
        SecurityGroupIds: []
      }
    });
  });
  
  test('should handle properly zero and false values', () => {
    const input = {
      zeroValue: 0,
      falseValue: false,
      emptyString: '',
      nullValue: null
    };
    const result = cleanNullKeys(input);
    expect(result).toEqual({
      zeroValue: 0,
      falseValue: false
    });
  });
});