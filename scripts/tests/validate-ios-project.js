const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const hash = (relativePath) => crypto
  .createHash('sha256')
  .update(fs.readFileSync(path.join(root, relativePath)))
  .digest('hex');

const capacitor = JSON.parse(read('frontend/capacitor.config.json'));
assert(capacitor.appId === 'com.orqium.comandaflow.restaurant', 'Bundle ID iOS incorreto.');
assert(capacitor.appName === 'ComandaFlow Restaurante', 'Nome do aplicativo iOS incorreto.');
assert(capacitor.webDir === 'dist', 'Diretorio web do Capacitor incorreto.');

const project = read('frontend/ios/App/App.xcodeproj/project.pbxproj');
assert(project.includes('PRODUCT_BUNDLE_IDENTIFIER = com.orqium.comandaflow.restaurant;'), 'Bundle ID ausente no projeto Xcode.');
assert(project.includes('MARKETING_VERSION = 2.4.6;'), 'Versao 2.4.6 ausente no projeto Xcode.');

const infoPlist = read('frontend/ios/App/App/Info.plist');
assert(infoPlist.includes('<string>ComandaFlow Restaurante</string>'), 'Nome de exibicao ausente no Info.plist.');

const requiredFiles = [
  'frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'frontend/ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo.png',
  'frontend/ios/App/App/public/index.html',
  '.github/workflows/build-ios-sideloadly.yml',
  'docs/guias/ios-sideloadly.md',
];
requiredFiles.forEach((file) => assert(exists(file), `Arquivo obrigatorio ausente: ${file}`));

assert(
  hash('frontend/public/logo-icon.png') === hash('frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),
  'O icone iOS nao corresponde a identidade visual do ComandaFlow.',
);

const backendApp = read('backend/src/app.js');
const backendSocket = read('backend/src/server.js');
assert(backendApp.includes("'capacitor://localhost'"), 'Origem iOS ausente no CORS HTTP.');
assert(backendSocket.includes("'capacitor://localhost'"), 'Origem iOS ausente no CORS do Socket.IO.');

console.log('[IOS] Projeto aprovado: Capacitor, Xcode, CORS, identidade visual e workflow do Sideloadly prontos.');
