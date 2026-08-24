const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const setupSocket = require('./realtime/socket');
const licenseSyncService = require('./services/license-sync.service');
const appUpdateService = require('./services/app-update.service');
const billingScheduler = require('./services/billing-scheduler.service');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET deve ter ao menos 32 caracteres');
}

const server = http.createServer(app);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.COMANDAFLOW_DESKTOP === 'true' && (origin === 'null' || origin.startsWith('file://'))) {
    return true;
  }
  const allowed = [process.env.FRONTEND_URL, 'http://127.0.0.1:5173'].filter(Boolean);
  return allowed.includes(origin) || (process.env.NODE_ENV !== 'production' && /^https?:\/\/(?:localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});

app.set('io', io);
app.set('connectedSockets', 0);
app.set('mobileClients', 0);
setupSocket({ io, app });

const PORT = process.env.PORT || 3002;

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} ja esta em uso. Reutilize o backend ativo ou libere a porta antes de iniciar outro servidor.`);
    app.set('serverError', { code: error.code, message: error.message, port: PORT });
    return;
  }

  console.error('Erro ao iniciar servidor:', error);
  app.set('serverError', { code: error.code, message: error.message, port: PORT });
});

const start = async () => {
  await app.get('schemaReady');
  server.listen(PORT, () => {
    console.log(`Backend rodando em http://localhost:${PORT}`);
    licenseSyncService.start();
    appUpdateService.start();
    billingScheduler.start();
  });
};

start().catch((error) => {
  console.error('Falha ao preparar o banco local:', error);
  process.exitCode = 1;
});
