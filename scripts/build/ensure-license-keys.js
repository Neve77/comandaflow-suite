const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const secretDir = path.join(rootDir, '.secrets');
const buildDir = path.join(rootDir, 'build');
const privateKeyPath = path.join(secretDir, 'license-private.pem');
const publicKeyPath = path.join(buildDir, 'license-public.pem');

fs.mkdirSync(secretDir, { recursive: true });
fs.mkdirSync(buildDir, { recursive: true });

if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(
    privateKeyPath,
    privateKey.export({ type: 'pkcs8', format: 'pem' }),
    { mode: 0o600 }
  );
  fs.writeFileSync(
    publicKeyPath,
    publicKey.export({ type: 'spki', format: 'pem' })
  );
  console.log('[LICENSE] Novo par de chaves Ed25519 criado. Proteja a pasta .secrets.');
} else {
  console.log('[LICENSE] Par de chaves existente preservado.');
}

console.log(`[LICENSE] Chave publica: ${publicKeyPath}`);
console.log(`[LICENSE] Chave privada: ${privateKeyPath} (nao compartilhe)`);
