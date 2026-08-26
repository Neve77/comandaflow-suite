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
assert(project.includes('CURRENT_PROJECT_VERSION = 4;'), 'Build 4 do aplicativo iOS ausente no projeto Xcode.');

const infoPlist = read('frontend/ios/App/App/Info.plist');
assert(infoPlist.includes('<string>ComandaFlow Restaurante</string>'), 'Nome de exibicao ausente no Info.plist.');
assert(infoPlist.includes('<key>NSLocalNetworkUsageDescription</key>'), 'Permissao de rede local ausente no Info.plist.');
assert(infoPlist.includes('<key>NSAllowsLocalNetworking</key>'), 'Excecao ATS restrita a rede local ausente no Info.plist.');

const requiredFiles = [
  'frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'frontend/ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo.png',
  'frontend/ios/App/App/public/index.html',
  '.github/workflows/build-ios-sideloadly.yml',
  'docs/guias/ios-sideloadly.md',
  'scripts/windows/enable-restaurant-lan.ps1',
];
requiredFiles.forEach((file) => assert(exists(file), `Arquivo obrigatorio ausente: ${file}`));

assert(
  hash('frontend/public/logo-icon.png') === hash('frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),
  'O icone iOS nao corresponde a identidade visual do ComandaFlow.',
);

const backendApp = read('backend/src/app.js');
const backendSocket = read('backend/src/server.js');
const mobileConfig = read('frontend/src/shared/config/config.js');
const mobileLayout = read('frontend/src/shared/components/Layout.jsx');
const mobileStyles = read('frontend/src/styles/ios.css');
assert(backendApp.includes("'capacitor://localhost'"), 'Origem iOS ausente no CORS HTTP.');
assert(backendSocket.includes("'capacitor://localhost'"), 'Origem iOS ausente no CORS do Socket.IO.');
assert(backendSocket.includes("process.env.COMANDAFLOW_BIND_HOST || '0.0.0.0'"), 'Backend nao esta disponivel na rede local.');
assert(mobileConfig.includes('isPrivateIPv4'), 'Validacao de IP privado ausente no aplicativo iOS.');
assert(mobileLayout.includes('ios-tab-bar'), 'Navegacao inferior nativa ausente no layout iOS.');
assert(mobileStyles.includes('.ios-tab-item-active'), 'Estado ativo da navegacao iOS ausente.');
assert(mobileStyles.includes('@keyframes ios-sheet-in'), 'Bottom sheet do menu iOS ausente.');

console.log('[IOS] Projeto aprovado: Capacitor, rede local, Xcode, CORS, identidade visual e workflow do Sideloadly prontos.');
