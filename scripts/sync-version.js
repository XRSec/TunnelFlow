import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function checkNotSymlink(filePath) {
  try {
    const stats = await fs.lstat(filePath);
    if (stats.isSymbolicLink()) {
      throw new Error(`Path ${filePath} is a symbolic link. Symlinks are not allowed for security reasons.`);
    }
    const canonicalPath = await fs.realpath(filePath);
    const rootPath = await fs.realpath(process.cwd());
    
    const rel = path.relative(rootPath, canonicalPath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(`Path ${filePath} resolves outside the project root directory. Traversal is not allowed.`);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function syncVersion() {
  try {
    const packageJsonPath = path.resolve('package.json');
    const tauriConfPath = path.resolve('src-tauri/tauri.conf.json');
    const cargoTomlPath = path.resolve('src-tauri/Cargo.toml');

    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const { version } = JSON.parse(packageJsonContent);

    // Validate version against strict semver regex
    const semverRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9-.]+)?(\+[a-zA-Z0-9-.]+)?$/;
    if (!semverRegex.test(version)) {
      throw new Error(`Invalid version format in package.json: ${version}`);
    }

    console.log(`Syncing version: ${version}`);

    // Check for symlinks
    await checkNotSymlink(tauriConfPath);
    await checkNotSymlink(cargoTomlPath);

    // Update tauri.conf.json
    const tauriConfContent = await fs.readFile(tauriConfPath, 'utf8');
    const tauriConf = JSON.parse(tauriConfContent);
    tauriConf.version = version;
    await fs.writeFile(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
    console.log(`Updated src-tauri/tauri.conf.json to ${version}`);

    // Update Cargo.toml
    let cargoTomlContent = await fs.readFile(cargoTomlPath, 'utf8');
    cargoTomlContent = cargoTomlContent.replace(/^version\s*=\s*".*?"/m, `version = "${version}"`);
    await fs.writeFile(cargoTomlPath, cargoTomlContent);
    console.log(`Updated src-tauri/Cargo.toml to ${version}`);

    // Git add
    await execAsync('git add src-tauri/tauri.conf.json src-tauri/Cargo.toml');
    console.log('Staged src-tauri/tauri.conf.json and src-tauri/Cargo.toml');

  } catch (error) {
    console.error('Error syncing version:', error);
    process.exit(1);
  }
}

syncVersion();
