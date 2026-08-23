import { useEffect, useState } from 'react';
import { DatabaseBackup, RotateCcw } from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';

export default function BackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadBackups = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/backup');
      setBackups(response.data.backups || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao carregar backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setMessage('');
    try {
      await api.post('/backup');
      setMessage('Backup criado com sucesso');
      await loadBackups();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao criar backup');
    }
  };

  const restoreBackup = async (id) => {
    if (!window.confirm('Restaurar este backup? O banco local sera substituido.')) return;
    try {
      await api.post(`/backup/${id}/restore`, { id });
      setMessage('Backup restaurado. Reinicie o aplicativo para recarregar tudo.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Erro ao restaurar backup');
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const formatSize = (size) => `${(Number(size || 0) / 1024).toFixed(1)} KB`;

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase text-slate-500">Backup</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">Copias locais do banco</h1>
            <p className="mt-1 text-slate-500">Crie backups manuais e restaure versoes salvas do SQLite local.</p>
          </div>
          <button type="button" onClick={createBackup} className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            <DatabaseBackup size={16} /> Criar backup
          </button>
        </div>
      </section>

      {message && <div className="panel p-4 text-sm text-slate-700">{message}</div>}

      <section className="panel p-6">
        <h2 className="text-xl font-semibold text-slate-950">Backups gerados</h2>
        {loading ? (
          <div className="mt-6"><LoadingSpinner /></div>
        ) : backups.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">Nenhum backup criado ainda.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{backup.filename}</p>
                  <p className="mt-1 text-sm text-slate-500">{new Date(backup.createdAt).toLocaleString('pt-BR')} · {formatSize(backup.size)}</p>
                </div>
                <button type="button" onClick={() => restoreBackup(backup.id)} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                  <RotateCcw size={16} /> Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
