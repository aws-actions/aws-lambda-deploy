const { packageCodeArtifacts } = require('../index');
const fs = require('fs/promises');
const path = require('path');
const AdmZip = require('adm-zip');
const core = require('@actions/core');
const os = require('os');
const validations = require('../validations');

jest.mock('fs/promises');
jest.mock('glob');
jest.mock('adm-zip');
jest.mock('@actions/core');
jest.mock('path');
jest.mock('os');
jest.mock('../validations');

describe('Package Artifacts Tests', () => { 
  const mockTimestamp = 1234567890;
  beforeEach(() => {
    jest.resetAllMocks();
    
    global.Date.now = jest.fn().mockReturnValue(mockTimestamp);
    
    process.cwd = jest.fn().mockReturnValue('/mock/cwd');
    
    os.tmpdir = jest.fn().mockReturnValue('/mock/tmp');
    
    path.join.mockImplementation((...parts) => parts.join('/'));
    path.dirname.mockImplementation((p) => p.substring(0, p.lastIndexOf('/')));
    path.isAbsolute = jest.fn().mockReturnValue(false);
    path.resolve = jest.fn().mockImplementation((cwd, dir) => `/resolved/${dir}`);
    
    fs.mkdir.mockResolvedValue(undefined);
    fs.cp = jest.fn().mockResolvedValue(undefined);
    fs.rm = jest.fn().mockResolvedValue(undefined);
    fs.stat = jest.fn().mockResolvedValue({ size: 12345 });
    fs.access = jest.fn().mockResolvedValue(undefined);
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: 'directory', isDirectory: () => true }
        ]);
      } else {
        return Promise.resolve(['file1.js', 'directory']);
      }
    });
    
    const mockZipInstance = {
      addLocalFolder: jest.fn(),
      addLocalFile: jest.fn(),
      writeZip: jest.fn()
    };
    
    const mockEntries = [
      {
        entryName: 'file1.js',
        header: { size: 1024 }
      },
      {
        entryName: 'directory/subfile.js',
        header: { size: 2048 }
      }
    ];
    
    AdmZip.mockImplementation((zipPath) => {
      if (zipPath) {
        
        return {
          getEntries: jest.fn().mockReturnValue(mockEntries)
        };
      }
      
      return mockZipInstance;
    });
    
    core.info = jest.fn();
    core.error = jest.fn();
  });
  
  test('should successfully package artifacts', async () => {
    const artifactsDir = '/mock/artifacts';
    const result = await packageCodeArtifacts(artifactsDir);
    
    const expectedTempDir = '/mock/tmp/lambda-temp-1234567890';
    const expectedZipPath = '/mock/tmp/lambda-function-1234567890.zip';
    
    expect(fs.rm).toHaveBeenCalledWith(expectedTempDir, { recursive: true, force: true });
    expect(fs.mkdir).toHaveBeenCalledWith(expectedTempDir, { recursive: true });
    
    expect(fs.readdir).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
    
    expect(fs.cp).toHaveBeenCalledTimes(2);
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('file1.js'),
      expect.stringContaining(`lambda-temp-${mockTimestamp}/file1.js`), 
      { recursive: true }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('directory'),
      expect.stringContaining(`lambda-temp-${mockTimestamp}/directory`), 
      { recursive: true }
    );
    
    const zipInstance = AdmZip.mock.results[0].value;
    expect(zipInstance.addLocalFolder).toHaveBeenCalledWith(`${expectedTempDir}/directory`, 'directory');
    expect(zipInstance.addLocalFile).toHaveBeenCalledWith(`${expectedTempDir}/file1.js`);
    expect(zipInstance.writeZip).toHaveBeenCalledWith(expectedZipPath);
    
    expect(core.info).toHaveBeenCalledWith('Creating ZIP file with standard options');
    
    expect(result).toBe(expectedZipPath);
  });
  
  test('should handle nested directory structures', async () => {
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: 'dir1', isDirectory: () => true }
        ]);
      } else {
        return Promise.resolve(['file1.js', 'dir1']);
      }
    });
    const artifactsDir = '/mock/artifacts';
    await packageCodeArtifacts(artifactsDir);
    
    const expectedTempDir = '/mock/tmp/lambda-temp-1234567890';
    
    expect(fs.cp).toHaveBeenCalledTimes(2);
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('file1.js'),
      expect.stringContaining(`${expectedTempDir}/file1.js`), 
      { recursive: true }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('dir1'),
      expect.stringContaining(`${expectedTempDir}/dir1`), 
      { recursive: true }
    );
  });
  
  test('should handle files with hidden/dot files', async () => {
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: '.env', isDirectory: () => false },
          { name: '.config', isDirectory: () => false }
        ]);
      } else {
        return Promise.resolve(['file1.js', '.env', '.config']);
      }
    });
    const artifactsDir = '/mock/artifacts';
    await packageCodeArtifacts(artifactsDir);
    
    const expectedTempDir = '/mock/tmp/lambda-temp-1234567890';
    
    expect(fs.cp).toHaveBeenCalledTimes(3); 
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('.env'),
      expect.stringContaining(`${expectedTempDir}/.env`), 
      { recursive: true }
    );
    expect(fs.cp).toHaveBeenCalledWith(
      expect.stringContaining('.config'),
      expect.stringContaining(`${expectedTempDir}/.config`), 
      { recursive: true }
    );
  });
  
  test('should handle error during directory cleanup', async () => {
    
    const expectedZipPath = '/mock/tmp/lambda-function-1234567890.zip';
    
    const rmError = new Error('Failed to remove directory');
    fs.rm.mockRejectedValueOnce(rmError);
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: 'directory', isDirectory: () => true }
        ]);
      } else {
        return Promise.resolve(['file1.js', 'directory']);
      }
    });
    const artifactsDir = '/mock/artifacts';
    const result = await packageCodeArtifacts(artifactsDir);
    
    expect(fs.mkdir).toHaveBeenCalled();
    expect(result).toBe(expectedZipPath);
  });
  
  test('should handle error during directory creation', async () => {
    
    const mkdirError = new Error('Failed to create directory');
    fs.mkdir.mockRejectedValue(mkdirError);
    const artifactsDir = '/mock/artifacts';
    
    await expect(packageCodeArtifacts(artifactsDir)).rejects.toThrow('Failed to create directory');
    
    expect(core.error).toHaveBeenCalledWith('Failed to package artifacts: Failed to create directory');
  });
  
  test('should handle error during file copying', async () => {
    
    fs.cp.mockImplementation((src, _dest, _options) => {
      if (src.includes('file1.js')) {
        return Promise.reject(new Error('Failed to copy file'));
      }
      return Promise.resolve();
    });
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: 'directory', isDirectory: () => true }
        ]);
      } else {
        return Promise.resolve(['file1.js', 'directory']);
      }
    });
    const artifactsDir = '/mock/artifacts';
    
    await expect(packageCodeArtifacts(artifactsDir)).rejects.toThrow('Failed to copy file');
    
    expect(core.error).toHaveBeenCalledWith('Failed to package artifacts: Failed to copy file');
  });
  
  test('should handle error during zip creation', async () => {
    
    const mockZipInstance = {
      addLocalFolder: jest.fn(),
      addLocalFile: jest.fn(),
      writeZip: jest.fn().mockImplementation(() => {
        throw new Error('Failed to write zip');
      })
    };
    AdmZip.mockImplementation(() => mockZipInstance);
    
    fs.readdir.mockImplementation((dir, options) => {
      if (options && options.withFileTypes) {
        return Promise.resolve([
          { name: 'file1.js', isDirectory: () => false },
          { name: 'directory', isDirectory: () => true }
        ]);
      } else {
        return Promise.resolve(['file1.js', 'directory']);
      }
    });
    const artifactsDir = '/mock/artifacts';
    
    await expect(packageCodeArtifacts(artifactsDir)).rejects.toThrow('Failed to write zip');
    
    expect(core.error).toHaveBeenCalledWith('Failed to package artifacts: Failed to write zip');
  });
  
  test('should verify zip file contents after creation', async () => {
    const artifactsDir = '/mock/artifacts';
    const zipPath = await packageCodeArtifacts(artifactsDir);
    
    const verificationZip = new AdmZip(zipPath);
    const entries = verificationZip.getEntries();
    
    expect(entries).toHaveLength(2);
    expect(entries[0].entryName).toBe('file1.js');
    expect(entries[1].entryName).toBe('directory/subfile.js');
    
    expect(entries[0].header.size).toBe(1024);
    expect(entries[1].header.size).toBe(2048);
    
    expect(fs.stat).toHaveBeenCalledWith(zipPath);
  });
  
  test('should use provided artifact directory path correctly', async () => {
    
    const customArtifactsDir = '/custom/artifacts/path';
    validations.validateAndResolvePath = jest.fn().mockReturnValue(customArtifactsDir);
    await packageCodeArtifacts(customArtifactsDir);
    
    expect(validations.validateAndResolvePath).toHaveBeenCalledWith(customArtifactsDir, '/mock/cwd');
    
    expect(fs.access).toHaveBeenCalledWith(customArtifactsDir);
    expect(fs.readdir).toHaveBeenCalledWith(customArtifactsDir);
  });
  
  test('should throw error for empty artifacts directory', async () => {
    
    fs.readdir.mockImplementation(() => {
      return Promise.resolve([]);
    });
    
    const artifactsDir = '/mock/artifacts';
    const resolvedPath = '/resolved/path';
    validations.validateAndResolvePath = jest.fn().mockReturnValue(resolvedPath);
    
    await expect(packageCodeArtifacts(artifactsDir)).rejects.toThrow(
      `Code artifacts directory '${resolvedPath}' is empty, no files to package`
    );
  });
  
  test('should handle artifacts directory access error', async () => {
    
    const accessError = new Error('Directory does not exist');
    fs.access.mockRejectedValueOnce(accessError);
    
    const artifactsDir = '/mock/artifacts';
    const resolvedPath = '/resolved/path';
    validations.validateAndResolvePath = jest.fn().mockReturnValue(resolvedPath);
    await expect(packageCodeArtifacts(artifactsDir)).rejects.toThrow(
      `Code artifacts directory '${resolvedPath}' does not exist or is not accessible`
    );
  });
  
  test('should use validateAndResolvePath to prevent path traversal attacks', async () => {
    
    validations.validateAndResolvePath = jest.fn().mockReturnValue('/safe/resolved/path');
    const artifactsDir = './artifacts';
    await packageCodeArtifacts(artifactsDir);
    
    expect(validations.validateAndResolvePath).toHaveBeenCalledWith(artifactsDir, '/mock/cwd');
    
    expect(fs.access).toHaveBeenCalledWith('/safe/resolved/path');
    expect(fs.readdir).toHaveBeenCalledWith('/safe/resolved/path');
  });
  
  test('should throw error when validateAndResolvePath detects path traversal', async () => {
    
    const securityError = new Error('Security error: Path traversal attempt detected');
    validations.validateAndResolvePath = jest.fn().mockImplementation(() => {
      throw securityError;
    });
    const maliciousPath = '../../../etc/passwd';
    
    await expect(packageCodeArtifacts(maliciousPath)).rejects.toThrow('Security error: Path traversal attempt detected');
    
    expect(validations.validateAndResolvePath).toHaveBeenCalledWith(maliciousPath, '/mock/cwd');
  });
  
  test('should handle absolute paths using validateAndResolvePath', async () => {
    
    path.isAbsolute = jest.fn().mockReturnValue(true);
    validations.validateAndResolvePath = jest.fn().mockReturnValue('/absolute/path/artifacts');
    const absolutePath = '/absolute/path/artifacts';
    await packageCodeArtifacts(absolutePath);
    
    expect(validations.validateAndResolvePath).toHaveBeenCalledWith(absolutePath, '/mock/cwd');
    
    expect(fs.access).toHaveBeenCalledWith('/absolute/path/artifacts');
  });
});