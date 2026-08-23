const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const backendDir = path.join(rootDir, 'backend');
const schemaPath = path.join(backendDir, 'prisma', 'schema.prisma');
const templateDatabase = path.join(backendDir, 'prisma', 'desktop-template.db');
const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');

async function main() {
  if (!fs.existsSync(prismaCli)) {
    throw new Error('Prisma CLI nao encontrado. Execute npm --prefix backend install.');
  }

  fs.writeFileSync(templateDatabase, '');

  const result = spawnSync(process.execPath, [prismaCli,
    'db',
    'push',
    '--force-reset',
    '--skip-generate',
    '--schema',
    schemaPath,
  ], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: 'file:./desktop-template.db' },
    encoding: 'utf8',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0 || !fs.existsSync(templateDatabase)) {
    throw new Error('Nao foi possivel criar o banco inicial do aplicativo.');
  }

  for (const suffix of ['-journal', '-wal', '-shm']) {
    const sidecar = `${templateDatabase}${suffix}`;
    if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
  }

  console.log(`[RUNTIME] Banco inicial vazio e atualizado: ${templateDatabase}`);
}

main().catch((error) => {
  console.error(`[RUNTIME] ${error.message}`);
  process.exit(1);
});
