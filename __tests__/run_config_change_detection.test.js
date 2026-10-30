const core = require('@actions/core');
const {
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  UpdateFunctionCodeCommand
} = require('@aws-sdk/client-lambda');
const mainModule = require('../index');
const validations = require('../validations');

jest.mock('@actions/core');
jest.mock('@aws-sdk/client-lambda');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-sts');

// These tests go through run() with the real hasConfigurationChanged(), so
// they catch the result of the comparison being ignored (for example when
// the async function is called without await and the pending Promise is
// treated as "changed").
describe('run() configuration change detection', () => {
  const currentConfig = {
    FunctionName: 'test-function',
    PackageType: 'Image',
    MemorySize: 512,
    Timeout: 60,
    Environment: { Variables: { ENV: 'production' } },
    State: 'Active',
    LastUpdateStatus: 'Successful'
  };

  let mockSend;

  const setInputs = (overrides = {}) => {
    validations.validateAllInputs = jest.fn().mockReturnValue({
      valid: true,
      functionName: 'test-function',
      packageType: 'Image',
      imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/repo:latest',
      parsedMemorySize: 512,
      timeout: 60,
      parsedEnvironment: { ENV: 'production' },
      dryRun: false,
      ...overrides
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    mockSend = jest.fn().mockImplementation(async () => ({
      ...currentConfig,
      FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      Version: '$LATEST'
    }));
    LambdaClient.mockImplementation(() => ({ send: mockSend }));
  });

  test('does not update the configuration when nothing changed', async () => {
    setInputs();

    await mainModule.run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith('No configuration changes detected');
    expect(UpdateFunctionConfigurationCommand).not.toHaveBeenCalled();
    expect(UpdateFunctionCodeCommand).toHaveBeenCalledTimes(1);
  });

  test('updates the configuration when an input differs', async () => {
    setInputs({ parsedMemorySize: 1024 });

    await mainModule.run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(UpdateFunctionConfigurationCommand).toHaveBeenCalledTimes(1);
    expect(UpdateFunctionConfigurationCommand.mock.calls[0][0]).toHaveProperty('MemorySize', 1024);
    expect(UpdateFunctionCodeCommand).toHaveBeenCalledTimes(1);
  });

  test('dry run still validates the code update when nothing changed', async () => {
    setInputs({ dryRun: true });

    await mainModule.run();

    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.info).not.toHaveBeenCalledWith('[DRY RUN] Configuration updates are not simulated in dry run mode');
    expect(UpdateFunctionConfigurationCommand).not.toHaveBeenCalled();
    expect(UpdateFunctionCodeCommand).toHaveBeenCalledTimes(1);
    expect(UpdateFunctionCodeCommand.mock.calls[0][0]).toHaveProperty('DryRun', true);
  });
});
