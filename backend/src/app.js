const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./http/routes/auth.routes');
const usersRoutes = require('./http/routes/users.routes');
const licenseRoutes = require('./http/routes/license.routes');
const subscriptionsRoutes = require('./http/routes/subscriptions.routes');
const billingRoutes = require('./http/routes/billing.routes');
const managerOperationsRoutes = require('./http/routes/manager-operations.routes');
const updatesRoutes = require('./http/routes/updates.routes');
const mesasRoutes = require('./http/routes/mesas.routes');
const comandaRoutes = require('./http/routes/comandas.routes');
const pedidoRoutes = require('./http/routes/pedidos.routes');
const productRoutes = require('./http/routes/products.routes');
const categoriesRoutes = require('./http/routes/categories.routes');
const inventoryRoutes = require('./http/routes/inventory.routes');
const financeRoutes = require('./http/routes/finance.routes');
const reportRoutes = require('./http/routes/reports.routes');
const clientRoutes = require('./http/routes/clients.routes');
const eventRoutes = require('./http/routes/events.routes');
const braceletRoutes = require('./http/routes/bracelets.routes');
const aiRoutes = require('./http/routes/ai.routes');
const auditRoutes = require('./http/routes/audit.routes');
const backupRoutes = require('./http/routes/backup.routes');
const deviceRoutes = require('./http/routes/devices.routes');
const loyaltyRoutes = require('./http/routes/loyalty.routes');
const mobileRoutes = require('./http/routes/mobile.routes');
const licenseGuard = require('./http/middleware/license.middleware');
const errorMiddleware = require('./http/middleware/error.middleware');
const auditRequest = require('./http/middleware/audit-request.middleware');
const {
  createGlobalLimiter,
  createLicenseActivationLimiter,
  createLicenseStatusLimiter,
} = require('./http/middleware/rate-limiters.middleware');
const ensureRuntimeSchema = require('./services/runtime-migrations.service');

const app = express();

// Confia nos cabeçalhos do túnel apenas quando o proxy está no próprio computador.
app.set('trust proxy', 'loopback');
const schemaReady = ensureRuntimeSchema();
app.set('schemaReady', schemaReady);
app.use((req, res, next) => schemaReady.then(() => next()).catch(next));

// A consulta e a ativação da assinatura precisam continuar disponíveis mesmo
// quando o tráfego normal do restaurante esgota o limitador global.
app.get('/license/status', createLicenseStatusLimiter());
app.post('/license/activate', createLicenseActivationLimiter());
app.use(createGlobalLimiter());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.COMANDAFLOW_DESKTOP === 'true' && (origin === 'null' || origin.startsWith('file://'))) {
    return true;
  }
  if (allowedOrigins.includes(origin)) return true;
  return process.env.NODE_ENV !== 'production'
    && /^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(helmet({ contentSecurityPolicy: false }));
app.use(auditRequest);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/system/capabilities', (req, res) => {
  const subscriptionManager = process.env.COMANDAFLOW_MANAGER_MODE === 'true';
  res.json({
    subscriptionManager,
    appName: subscriptionManager ? 'ComandaFlow Gestor' : 'ComandaFlow',
    appVersion: process.env.COMANDAFLOW_APP_VERSION || null,
  });
});

app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, 'mobile', 'index.html'));
});

app.use('/license', licenseRoutes);

app.use('/auth/login', authLimiter);
app.use('/auth/setup', authLimiter);
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/billing', billingRoutes);
app.use('/manager', managerOperationsRoutes);
app.use('/updates', updatesRoutes);

app.use(licenseGuard);

app.use('/mesas', mesasRoutes);
app.use('/comandas', comandaRoutes);
app.use('/pedidos', pedidoRoutes);
app.use('/products', productRoutes);
app.use('/categories', categoriesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/finance', financeRoutes);
app.use('/reports', reportRoutes);

app.use('/clients', clientRoutes);
app.use('/events', eventRoutes);
app.use('/bracelets', braceletRoutes);
app.use('/ai', aiRoutes);
app.use('/audit', auditRoutes);
app.use('/backup', backupRoutes);
app.use('/devices/pairing/confirm', authLimiter);
app.use('/devices', deviceRoutes);
app.use('/loyalty', loyaltyRoutes);
app.use('/mobile/auth', authLimiter);
app.use('/mobile', mobileRoutes);

app.use(errorMiddleware);

module.exports = app;
