const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const authSessionsService = require('../../services/auth-sessions.service');

dotenv.config();

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.scope === 'mobile' && payload.role === 'garcom' && !payload.userId) {
      req.user = payload;
      return next();
    }
    if (!payload.sessionId) {
      return res.status(401).json({ message: 'Sua sessão antiga expirou. Entre novamente.' });
    }
    const session = await authSessionsService.validateSession(payload.sessionId, payload.userId);
    if (!session) {
      return res.status(401).json({ message: 'Sessão encerrada ou expirada. Entre novamente.' });
    }
    req.user = {
      ...payload,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.id,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou sessão indisponível' });
  }
};

module.exports = authenticate;
