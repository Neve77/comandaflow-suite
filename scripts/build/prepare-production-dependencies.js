const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const sourceBackend = path.join(rootDir, 'backend');
const runtimeBackend = path.join(rootDir, '.desktop-runtime', 'backend');
const runtimeModules = path.join(runtimeBackend, 'node_modules');

function runNpm(args) {
  const npmCli = process.env.npm_execpath;
  const result = npmCli
    ? spawnSync(process.execPath, [npmCli, ...args], { cwd: runtimeBackend, stdio: 'inherit' })
    : spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, {
      cwd: runtimeBackend,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
  if (result.status !== 0) throw new Error('Falha ao instalar as dependencias de producao.');
}

function main() {
  fs.rmSync(runtimeBackend, { recursive: true, force: true });
  fs.mkdirSync(runtimeBackend, { recursive: true });
  fs.copyFileSync(path.join(sourceBackend, 'package.json'), path.join(runtimeBackend, 'package.json'));
  fs.copyFileSync(path.join(sourceBackend, 'package-lock.json'), path.join(runtimeBackend, 'package-lock.json'));

  runNpm(['ci', '--omit=dev', '--legacy-peer-deps', '--no-audit', '--no-fund']);

  const generatedSource = path.join(sourceBackend, 'node_modules', '.prisma', 'client');
  const generatedTarget = path.join(runtimeModules, '.prisma', 'client');
  if (!fs.existsSync(generatedSource)) {
    throw new Error('Cliente Prisma gerado nao encontrado. Execute npm run prepare:desktop-runtime.');
  }
  fs.rmSync(generatedTarget, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(generatedTarget), { recursive: true });
  fs.cpSync(generatedSource, generatedTarget, { recursive: true });
  for (const item of fs.readdirSync(generatedTarget)) {
    if (item.includes('.tmp')) fs.rmSync(path.join(generatedTarget, item), { force: true });
  }
  fs.rmSync(path.join(runtimeModules, '.cache'), { recursive: true, force: true });

  console.log(`[RUNTIME] Dependencias de producao preparadas em ${runtimeModules}`);
}

try {
  main();
} catch (error) {
  console.error(`[RUNTIME] ${error.message}`);
  process.exit(1);
}
