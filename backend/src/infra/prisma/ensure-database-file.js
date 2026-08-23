const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith('file:')) {
  throw new Error('DATABASE_URL deve apontar para um arquivo SQLite.');
}

const value = decodeURIComponent(databaseUrl.slice('file:'.length).split('?')[0]);
const schemaDirectory = path.resolve(__dirname, '..', '..', '..', 'prisma');
const databasePath = path.isAbsolute(value) ? value : path.resolve(schemaDirectory, value);

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.closeSync(fs.openSync(databasePath, 'a'));
