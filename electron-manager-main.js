const path = require('path');

process.env.COMANDAFLOW_MANAGER_MODE = 'true';
process.env.PORT = process.env.PORT || '3012';

if (!process.defaultApp && process.resourcesPath) {
  process.env.CF_LICENSE_PRIVATE_KEY_PATH = path.join(process.resourcesPath, 'license-private.pem');
}

require('./electron-main');
