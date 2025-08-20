const { deepEqual } = require('../index');

describe('Deep Equal Tests', () => {
  test('Compare primitive values', () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
    expect(deepEqual(123, 123)).toBe(true);
    expect(deepEqual('test', 'test')).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(false, false)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(123, '123')).toBe(false);
    expect(deepEqual(true, 1)).toBe(false);
    expect(deepEqual('test', 'TEST')).toBe(false);
  });

  test('Compare arrays', () => {
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(deepEqual([1, [2, 3], 4], [1, [2, 3], 4])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual([1, [2, 3], 4], [1, [2, 4], 4])).toBe(false);
  });

  test('Compare objects', () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true); 
    expect(deepEqual(
      { a: 1, b: { c: 3, d: 4 } },
      { a: 1, b: { c: 3, d: 4 } }
    )).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual(
      { a: 1, b: { c: 3, d: 4 } },
      { a: 1, b: { c: 3, d: 5 } }
    )).toBe(false);
  });

  test('Handle mixed nested structures', () => {
    const obj1 = {
      name: 'test',
      values: [1, 2, 3],
      nested: {
        a: [4, 5, 6],
        b: {
          c: 'deep',
          d: [7, 8, 9]
        }
      }
    };
    
    const obj2 = {
      name: 'test',
      values: [1, 2, 3],
      nested: {
        a: [4, 5, 6],
        b: {
          c: 'deep',
          d: [7, 8, 9]
        }
      }
    };
    
    expect(deepEqual(obj1, obj2)).toBe(true);

    const obj3 = {
      name: 'test',
      values: [1, 2, 3],
      nested: {
        a: [4, 5, 6],
        b: {
          c: 'deep',
          d: [7, 8, 10]
        }
      }
    };
    
    expect(deepEqual(obj1, obj3)).toBe(false);
  });

  test('Handle type mismatches', () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({ 0: 'a', 1: 'b', length: 2 }, ['a', 'b'])).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual({ value: 123 }, 123)).toBe(false);
    expect(deepEqual([], '')).toBe(false);
    expect(deepEqual([1, 2, 3], '123')).toBe(false);
  });

  test('Handle special edge cases', () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
    expect(deepEqual(
      { a: undefined }, 
      { b: undefined }
    )).toBe(false);
    expect(deepEqual(
      { a: undefined },
      { a: null }
    )).toBe(false);
  });

  test('Handle lambda function configuration objects', () => {
    const lambdaConfig1 = {
      FunctionName: 'test-function',
      Runtime: 'nodejs18.x',
      MemorySize: 512,
      Environment: {
        Variables: {
          ENV: 'production',
          DEBUG: 'false'
        }
      },
      VpcConfig: {
        SubnetIds: ['subnet-123', 'subnet-456'],
        SecurityGroupIds: ['sg-123']
      }
    };
    
    const lambdaConfig2 = {
      FunctionName: 'test-function',
      Runtime: 'nodejs18.x',
      MemorySize: 512,
      Environment: {
        Variables: {
          ENV: 'production',
          DEBUG: 'false'
        }
      },
      VpcConfig: {
        SubnetIds: ['subnet-123', 'subnet-456'],
        SecurityGroupIds: ['sg-123']
      }
    };
    
    expect(deepEqual(lambdaConfig1, lambdaConfig2)).toBe(true);
    
    const lambdaConfig3 = {
      ...lambdaConfig1,
      Environment: {
        Variables: {
          ENV: 'development',
          DEBUG: 'false'
        }
      }
    };
    
    expect(deepEqual(lambdaConfig1, lambdaConfig3)).toBe(false);
  });
});