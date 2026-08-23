export const emptySubscriber = {
  businessName: '', contactName: '', email: '', phone: '', document: '', notes: '',
};

export const planDays = {
  Mensal: 30,
  Trimestral: 90,
  Semestral: 180,
  Anual: 365,
  Personalizado: 30,
};

export const statusStyle = {
  ativo: 'bg-emerald-100 text-emerald-700',
  suspenso: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-rose-100 text-rose-700',
  expirado: 'bg-slate-200 text-slate-700',
  substituido: 'bg-blue-100 text-blue-700',
};

export const formatDate = (value) => value
  ? new Intl.DateTimeFormat('pt-BR').format(new Date(value))
  : '—';

export const formatFileSize = (bytes) => bytes
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : '—';

export const copyText = async (value) => {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);

  const input = document.createElement('textarea');
  input.value = value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
};
