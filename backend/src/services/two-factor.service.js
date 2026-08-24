const crypto = require('crypto');
const prisma = require('../infra/prisma/client');

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const encodeBase32 = (buffer) => {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let result = '';
  for (let index = 0; index < bits.length; index += 5) {
    result += alphabet[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return result;
};

const decodeBase32 = (value) => {
  let bits = '';
  for (const character of value.replace(/=+$/g, '').toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error('Segredo de autenticação inválido.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
};

const encryptionKey = () => crypto.createHash('sha256').update(`comandaflow-2fa|${process.env.JWT_SECRET}`).digest();
const encrypt = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
};
const decrypt = (value) => {
  const [iv, tag, encrypted] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const totp = (secret, timestamp = Date.now()) => {
  const counter = BigInt(Math.floor(timestamp / 30000));
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(counter);
  const digest = crypto.createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return number.toString().padStart(6, '0');
};

const verifyTotp = (secret, code) => {
  const normalized = String(code || '').replace(/\D/g, '');
  if (normalized.length !== 6) return false;
  return [-30000, 0, 30000].some((offset) => {
    const expected = totp(secret, Date.now() + offset);
    return crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
  });
};

const generateRecoveryCodes = () => Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());

const setup = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 });
  if (user.twoFactorEnabled) throw Object.assign(new Error('Desative o segundo fator atual antes de configurar uma nova chave.'), { status: 409 });
  const secret = encodeBase32(crypto.randomBytes(20));
  const recoveryCodes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: encrypt(secret),
      twoFactorRecoveryCodes: JSON.stringify(recoveryCodes.map(sha256)),
    },
  });
  const label = encodeURIComponent(`ComandaFlow:${user.email}`);
  const issuer = encodeURIComponent('ComandaFlow Gestor');
  return { secret, recoveryCodes, otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30` };
};

const enable = async (userId, code) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret || !verifyTotp(decrypt(user.twoFactorSecret), code)) {
    throw Object.assign(new Error('Código de autenticação inválido.'), { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
};

const disable = async (userId, code) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !verifyTotp(decrypt(user.twoFactorSecret), code)) {
    throw Object.assign(new Error('Código de autenticação inválido.'), { status: 400 });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: null },
  });
};

const verifyLogin = async (user, code) => {
  if (!user.twoFactorEnabled) return true;
  const normalized = String(code || '').trim().toUpperCase();
  if (verifyTotp(decrypt(user.twoFactorSecret), normalized)) return true;
  const hashes = JSON.parse(user.twoFactorRecoveryCodes || '[]');
  const recoveryIndex = hashes.indexOf(sha256(normalized));
  if (recoveryIndex < 0) return false;
  hashes.splice(recoveryIndex, 1);
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorRecoveryCodes: JSON.stringify(hashes) } });
  return true;
};

module.exports = { disable, enable, setup, totp, verifyLogin, verifyTotp };
