import { useEffect, useState } from 'react';
import { Settings, Store, Save, Printer, QrCode, KeyRound, ShieldCheck } from 'lucide-react';
import api from '../../shared/services/api';

export default function SettingsPage() {
  const [restauranteNome, setRestauranteNome] = useState(
    localStorage.getItem('cf_nome_restaurante') || 'Meu Restaurante'
  );
  const [taxaServico, setTaxaServico] = useState(
    localStorage.getItem('cf_taxa_servico') || '10'
  );
  const [chavePix, setChavePix] = useState(
    localStorage.getItem('cf_chave_pix') || ''
  );
  const [tipoChavePix, setTipoChavePix] = useState(
    localStorage.getItem('cf_tipo_chave_pix') || 'CPF / CNPJ'
  );
  const [mensagemCupom, setMensagemCupom] = useState(
    localStorage.getItem('cf_mensagem_cupom') || 'Obrigado pela preferência! Volte sempre.'
  );
  const [message, setMessage] = useState('');
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseMessage, setLicenseMessage] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [activating, setActivating] = useState(false);

  const loadLicense = async () => {
    const response = await api.get('/license/status');
    setLicenseStatus(response.data);
  };

  useEffect(() => {
    loadLicense().catch(() => setLicenseError('Nao foi possivel consultar a assinatura.'));
  }, []);

  const handleActivateLicense = async (event) => {
    event.preventDefault();
    setActivating(true);
    setLicenseError('');
    setLicenseMessage('');
    try {
      const response = await api.post('/license/activate', { licenseKey });
      setLicenseMessage(response.data.message);
      setLicenseKey('');
      await loadLicense();
    } catch (requestError) {
      setLicenseError(requestError.response?.data?.message || 'Chave de assinatura invalida.');
    } finally {
      setActivating(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('cf_nome_restaurante', restauranteNome);
    localStorage.setItem('cf_taxa_servico', taxaServico);
    localStorage.setItem('cf_chave_pix', chavePix);
    localStorage.setItem('cf_tipo_chave_pix', tipoChavePix);
    localStorage.setItem('cf_mensagem_cupom', mensagemCupom);
    setMessage('Configurações salvas com sucesso!');
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-700">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="section-title">Configurações do Restaurante</h1>
            <p className="section-subtitle">
              Personalize o nome do estabelecimento, chave PIX para envio aos clientes e mensagens do sistema.
            </p>
          </div>
        </div>
      </section>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      <section className="panel p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="text-emerald-600" size={20} />
          <div>
            <h2 className="text-base font-bold text-slate-900">Assinatura do ComandaFlow</h2>
            <p className="mt-1 text-xs text-slate-500">
              {licenseStatus
                ? `${licenseStatus.plan} · ${licenseStatus.daysRemaining ?? '—'} dia(s) restante(s)`
                : 'Consultando assinatura...'}
            </p>
          </div>
        </div>
        <form onSubmit={handleActivateLicense} className="mt-4 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Ativar ou renovar com uma chave
            <textarea
              className="input-field mt-1 min-h-24 resize-y font-mono text-xs"
              value={licenseKey}
              onChange={(event) => setLicenseKey(event.target.value)}
              placeholder="CF2-... ou CF3-..."
              required
            />
          </label>
          {licenseMessage && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{licenseMessage}</div>}
          {licenseError && <div className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{licenseError}</div>}
          <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={activating}>
            <KeyRound size={17} /> {activating ? 'Validando...' : 'Ativar assinatura'}
          </button>
        </form>
      </section>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="panel p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store className="text-emerald-600" size={20} />
            <h2 className="text-base font-bold text-slate-900">
              Dados do Estabelecimento
            </h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nome do Restaurante / Bar *
              </label>
              <input
                type="text"
                value={restauranteNome}
                onChange={(e) => setRestauranteNome(e.target.value)}
                className="input-field mt-1"
                placeholder="Ex: Bar & Restaurante Sabor do Sul"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Taxa de Serviço Sugerida (%)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={taxaServico}
                onChange={(e) => setTaxaServico(e.target.value)}
                className="input-field mt-1"
                placeholder="10"
              />
            </div>
          </div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <QrCode className="text-emerald-600" size={20} />
            <h2 className="text-base font-bold text-slate-900">
              Chave PIX para Cobrança no WhatsApp
            </h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Tipo da Chave PIX
              </label>
              <select
                value={tipoChavePix}
                onChange={(e) => setTipoChavePix(e.target.value)}
                className="input-field mt-1"
              >
                <option value="CPF / CNPJ">CPF / CNPJ</option>
                <option value="Celular / WhatsApp">Celular / WhatsApp</option>
                <option value="E-mail">E-mail</option>
                <option value="Chave Aleatória">Chave Aleatória</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Chave PIX
              </label>
              <input
                type="text"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                className="input-field mt-1"
                placeholder="Ex: 11999998888 ou pix@restaurante.com"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Esta chave será inserida automaticamente nas mensagens de cobrança enviadas pelo WhatsApp.
              </p>
            </div>
          </div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Printer className="text-emerald-600" size={20} />
            <h2 className="text-base font-bold text-slate-900">
              Mensagens de Agradecimento
            </h2>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mensagem no Rodapé do Cupom e WhatsApp
              </label>
              <input
                type="text"
                value={mensagemCupom}
                onChange={(e) => setMensagemCupom(e.target.value)}
                className="input-field mt-1"
                placeholder="Ex: Obrigado pela preferência! Volte sempre."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary bg-emerald-600 hover:bg-emerald-700 font-bold">
            <Save size={18} />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>
    </div>
  );
}
