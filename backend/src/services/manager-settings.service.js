const prisma = require('../infra/prisma/client');

const defaults = {
  publicServerUrl: '',
  offlineGraceHours: 24,
  syncIntervalMinutes: 1,
  automaticSuspensionEnabled: true,
  paymentGraceDays: 3,
  defaultSuspensionMessage: 'Sua assinatura esta pendente. Entre em contato para regularizar o acesso.',
};

const parseValue = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

const get = async () => {
  const records = await prisma.systemSetting.findMany();
  const values = { ...defaults };
  for (const record of records) {
    if (Object.hasOwn(defaults, record.key)) {
      values[record.key] = parseValue(record.value, defaults[record.key]);
    }
  }
  return values;
};

const save = async (settings) => {
  const next = { ...defaults, ...settings };
  await prisma.$transaction(Object.entries(next).map(([key, value]) => prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  })));
  return get();
};

module.exports = { defaults, get, save };
