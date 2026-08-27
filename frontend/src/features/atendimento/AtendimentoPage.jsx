import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Search,
  Sparkles,
  UserRound,
  UserRoundPlus,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import api from '../../shared/services/api';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import { formatCpf, formatPhone, stripNonDigits } from '../../shared/utils/formatters';

const EMPTY_CLIENT = { nome: '', cpf: '', telefone: '', registered: false };

const normalizeText = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export default function AtendimentoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [clientMode, setClientMode] = useState('');
  const [client, setClient] = useState(EMPTY_CLIENT);
  const [clients, setClients] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [selectedMesaId, setSelectedMesaId] = useState(location.state?.preselectedMesaId || '');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/clients'), api.get('/mesas')])
      .then(([clientResponse, mesaResponse]) => {
        if (!active) return;
        setClients(clientResponse.data.clients || []);
        setMesas(mesaResponse.data.mesas || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Não foi possível preparar o atendimento.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.querySelector('.content-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [clientMode, step]);

  const availableMesas = useMemo(() => mesas.filter((mesa) => {
    const hasOpenComanda = mesa.comandas?.some((comanda) => comanda.status === 'aberta');
    return mesa.status === 'livre' && !hasOpenComanda;
  }), [mesas]);

  const filteredClients = useMemo(() => {
    const term = normalizeText(search.trim());
    const digits = stripNonDigits(search);
    if (!term) return clients.slice(0, 8);
    return clients.filter((item) => (
      normalizeText(item.clienteNome).includes(term)
      || (digits && stripNonDigits(item.clienteTelefone).includes(digits))
      || (digits && stripNonDigits(item.clienteCpf).includes(digits))
    )).slice(0, 12);
  }, [clients, search]);

  const selectedMesa = availableMesas.find((mesa) => mesa.id === selectedMesaId);

  const selectExistingClient = (item) => {
    if (item.blocked) return;
    setClient({
      nome: item.clienteNome || '',
      telefone: formatPhone(item.clienteTelefone || ''),
      cpf: formatCpf(item.clienteCpf || ''),
      registered: true,
    });
    setError('');
  };

  const continueFromClient = async ({ skipRegistration = false } = {}) => {
    setError('');

    if (clientMode === 'existing' && !client.registered) {
      setError('Escolha o cliente na lista para continuar.');
      return;
    }

    if (clientMode === 'quick') {
      setClient({ ...EMPTY_CLIENT, nome: 'Cliente da mesa' });
      setStep(2);
      return;
    }

    if (clientMode === 'new') {
      if (!client.nome.trim()) {
        setError('Digite o nome do cliente.');
        return;
      }

      if (!skipRegistration) {
        const cpf = stripNonDigits(client.cpf);
        const telefone = stripNonDigits(client.telefone);
        if (cpf.length !== 11) {
          setError('Para cadastrar, informe um CPF com 11 números.');
          return;
        }
        if (telefone.length < 10) {
          setError('Para cadastrar, informe um telefone com DDD.');
          return;
        }

        setSaving(true);
        try {
          await api.post('/clients', { name: client.nome.trim(), cpf, phone: telefone });
          setClient((current) => ({ ...current, registered: true }));
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'Não foi possível cadastrar o cliente.');
          setSaving(false);
          return;
        }
        setSaving(false);
      } else {
        setClient((current) => ({ ...current, cpf: '', registered: false }));
      }
    }

    setStep(2);
  };

  const continueFromMesa = () => {
    if (!selectedMesa) {
      setError('Escolha uma mesa livre para continuar.');
      return;
    }
    setError('');
    setStep(3);
  };

  const openService = async () => {
    if (!selectedMesa) return;
    setSaving(true);
    setError('');
    try {
      const response = await api.post('/comandas/open', {
        mesaId: selectedMesa.id,
        mesaNumero: selectedMesa.numero,
        clienteNome: client.nome.trim(),
        clienteCpf: stripNonDigits(client.cpf),
        clienteTelefone: stripNonDigits(client.telefone),
      });
      const comanda = response.data.comanda;
      navigate('/comanda', {
        replace: true,
        state: {
          comandaId: comanda.id,
          mesaId: selectedMesa.id,
          mesaNumero: selectedMesa.numero,
          focusProducts: true,
          guidedService: true,
        },
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Não foi possível abrir a mesa. Tente novamente.');
      setSaving(false);
    }
  };

  const goBack = () => {
    setError('');
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    if (clientMode) {
      setClientMode('');
      setClient(EMPTY_CLIENT);
      return;
    }
    navigate('/dashboard');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="service-flow-page">
      <section className="service-flow-hero">
        <div>
          <span className="service-flow-eyebrow"><Sparkles size={16} /> Atendimento fácil</span>
          <h1>Novo atendimento</h1>
          <p>Vamos fazer uma etapa de cada vez. Primeiro o cliente, depois a mesa e só então os itens.</p>
        </div>
        <div className="service-flow-time"><Clock3 size={19} /><span><strong>Fluxo rápido</strong><small>Leva menos de 1 minuto</small></span></div>
      </section>

      <ol className="service-steps" aria-label={`Etapa ${step} de 3`}>
        {[
          ['Cliente', UserRound],
          ['Mesa', UtensilsCrossed],
          ['Confirmar', CheckCircle2],
        ].map(([label, Icon], index) => {
          const number = index + 1;
          const state = number < step ? 'done' : number === step ? 'active' : '';
          return (
            <li key={label} className={state}>
              <span>{number < step ? <Check size={20} /> : <Icon size={20} />}</span>
              <strong>{number}. {label}</strong>
            </li>
          );
        })}
      </ol>

      {error && <div className="service-error" role="alert"><AlertCircle size={21} /><span>{error}</span></div>}

      <section className="service-flow-card">
        {step === 1 && (
          <div className="service-step-content">
            <div className="service-question">
              <span>Etapa 1 de 3</span>
              <h2>Este cliente já tem cadastro?</h2>
              <p>Escolha uma opção abaixo. Você poderá voltar se tocar na opção errada.</p>
            </div>

            {!clientMode && (
              <div className="service-choice-grid">
                <button type="button" onClick={() => setClientMode('existing')} className="service-choice-card primary">
                  <span className="service-choice-icon"><Search size={29} /></span>
                  <strong>Cliente cadastrado</strong>
                  <small>Buscar pelo nome, telefone ou CPF</small>
                  <span className="service-choice-action">Buscar cliente <ArrowRight size={19} /></span>
                </button>
                <button type="button" onClick={() => setClientMode('new')} className="service-choice-card">
                  <span className="service-choice-icon"><UserRoundPlus size={29} /></span>
                  <strong>Cliente novo</strong>
                  <small>Cadastrar os dados antes de abrir a mesa</small>
                  <span className="service-choice-action">Cadastrar cliente <ArrowRight size={19} /></span>
                </button>
                <button type="button" onClick={() => { setClientMode('quick'); setClient({ ...EMPTY_CLIENT, nome: 'Cliente da mesa' }); setStep(2); }} className="service-choice-card compact">
                  <span className="service-choice-icon"><Users size={26} /></span>
                  <strong>Sem cadastro</strong>
                  <small>Continuar sem dados pessoais</small>
                  <span className="service-choice-action">Escolher mesa <ArrowRight size={19} /></span>
                </button>
              </div>
            )}

            {clientMode === 'existing' && (
              <div className="service-client-search">
                <label htmlFor="client-search">Digite o nome, telefone ou CPF</label>
                <div className="service-search-field"><Search size={21} /><input id="client-search" autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: Maria, (11) 99999-9999..." /></div>
                <div className="service-client-list">
                  {filteredClients.length ? filteredClients.map((item) => {
                    const selected = client.registered && stripNonDigits(client.cpf) === stripNonDigits(item.clienteCpf);
                    return (
                      <button key={item.id || item.clienteCpf} type="button" disabled={item.blocked} onClick={() => selectExistingClient(item)} className={`service-client-row ${selected ? 'selected' : ''}`}>
                        <span className="service-client-avatar">{String(item.clienteNome || 'C').charAt(0).toUpperCase()}</span>
                        <span><strong>{item.clienteNome}</strong><small>{formatPhone(item.clienteTelefone)} · CPF {formatCpf(item.clienteCpf)}</small></span>
                        <em>{item.blocked ? 'Bloqueado' : selected ? 'Escolhido' : 'Escolher'}</em>
                      </button>
                    );
                  }) : <div className="service-empty">Nenhum cliente encontrado. Volte e escolha “cliente novo”.</div>}
                </div>
                <button type="button" className="service-primary-action" disabled={!client.registered} onClick={() => continueFromClient()}>
                  Continuar para escolher a mesa <ArrowRight size={21} />
                </button>
              </div>
            )}

            {clientMode === 'new' && (
              <div className="service-new-client-form">
                <div className="service-field full"><label htmlFor="new-client-name">Nome do cliente</label><input id="new-client-name" autoFocus value={client.nome} onChange={(event) => setClient({ ...client, nome: event.target.value })} placeholder="Digite o nome" /></div>
                <div className="service-field"><label htmlFor="new-client-phone">Telefone com DDD</label><input id="new-client-phone" inputMode="tel" value={client.telefone} onChange={(event) => setClient({ ...client, telefone: formatPhone(event.target.value) })} placeholder="(00) 00000-0000" /></div>
                <div className="service-field"><label htmlFor="new-client-cpf">CPF</label><input id="new-client-cpf" inputMode="numeric" value={client.cpf} onChange={(event) => setClient({ ...client, cpf: formatCpf(event.target.value) })} placeholder="000.000.000-00" /></div>
                <div className="service-new-actions">
                  <button type="button" className="service-secondary-action" disabled={saving || !client.nome.trim()} onClick={() => continueFromClient({ skipRegistration: true })}>Continuar sem cadastrar</button>
                  <button type="button" className="service-primary-action" disabled={saving} onClick={() => continueFromClient()}>{saving ? 'Salvando cliente...' : 'Cadastrar e escolher mesa'} {!saving && <ArrowRight size={21} />}</button>
                </div>
                <p className="service-form-help">Para salvar o cadastro, telefone e CPF são necessários. Se o cliente não quiser informar, use “Continuar sem cadastrar”.</p>
              </div>
            )}

            {clientMode === 'quick' && (
              <div className="service-quick-confirm">
                <span><Users size={30} /></span>
                <h3>Atendimento sem cadastro</h3>
                <p>A mesa será identificada como “Cliente da mesa”. Nenhum dado pessoal será solicitado.</p>
                <button type="button" className="service-primary-action" onClick={() => continueFromClient()}>Escolher a mesa <ArrowRight size={21} /></button>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="service-step-content">
            <div className="service-question">
              <span>Etapa 2 de 3</span>
              <h2>Em qual mesa o cliente está?</h2>
              <p>Somente as mesas livres podem ser escolhidas.</p>
            </div>
            {availableMesas.length ? (
              <div className="service-table-grid">
                {availableMesas.map((mesa) => (
                  <button key={mesa.id} type="button" onClick={() => { setSelectedMesaId(mesa.id); setError(''); }} className={selectedMesaId === mesa.id ? 'selected' : ''}>
                    <span>Mesa</span><strong>{mesa.numero}</strong><small>{mesa.capacidade || 4} lugares</small>{selectedMesaId === mesa.id && <em><Check size={17} /> Escolhida</em>}
                  </button>
                ))}
              </div>
            ) : (
              <div className="service-empty large"><UtensilsCrossed size={35} /><strong>Nenhuma mesa livre agora</strong><span>Feche uma comanda ou cadastre uma nova mesa.</span><button type="button" onClick={() => navigate('/mesas')}>Ver todas as mesas</button></div>
            )}
            {availableMesas.length > 0 && <button type="button" className="service-primary-action service-next-action" disabled={!selectedMesa} onClick={continueFromMesa}>Revisar atendimento <ArrowRight size={21} /></button>}
          </div>
        )}

        {step === 3 && (
          <div className="service-step-content">
            <div className="service-question">
              <span>Etapa 3 de 3</span>
              <h2>Confira antes de abrir</h2>
              <p>Depois desta confirmação, a tela de adicionar itens será aberta.</p>
            </div>
            <div className="service-summary-grid">
              <article><span><UserRound size={23} /></span><div><small>Cliente</small><strong>{client.nome || 'Cliente da mesa'}</strong><p>{client.registered ? 'Cadastro encontrado' : 'Atendimento sem cadastro'}</p></div><button type="button" onClick={() => setStep(1)}>Alterar</button></article>
              <article><span><UtensilsCrossed size={23} /></span><div><small>Local</small><strong>Mesa {selectedMesa?.numero}</strong><p>{selectedMesa?.capacidade || 4} lugares · Livre</p></div><button type="button" onClick={() => setStep(2)}>Alterar</button></article>
            </div>
            <div className="service-ready-box"><CheckCircle2 size={27} /><span><strong>Tudo pronto</strong><small>Toque no botão abaixo para abrir a mesa e começar a lançar os pedidos.</small></span></div>
            <button type="button" className="service-primary-action service-open-action" disabled={saving} onClick={openService}>{saving ? 'Abrindo atendimento...' : `Abrir Mesa ${selectedMesa?.numero} e adicionar itens`} {!saving && <ArrowRight size={22} />}</button>
          </div>
        )}
      </section>

      <button type="button" className="service-back-button" onClick={goBack}><ArrowLeft size={19} /> Voltar uma etapa</button>
    </div>
  );
}
