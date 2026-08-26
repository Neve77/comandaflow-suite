import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Server,
  ShieldCheck,
  Smartphone,
  Wifi,
} from 'lucide-react';
import {
  getConfiguredMobileServerUrl,
  isNativeIOS,
  normalizeMobileServerUrl,
  saveMobileServerUrl,
} from '../../shared/config/config';

const requestWithTimeout = async (url) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};

const validateRestaurantServer = async (value) => {
  const serverUrl = normalizeMobileServerUrl(value);
  const healthResponse = await requestWithTimeout(`${serverUrl}/health`);
  if (!healthResponse.ok) throw new Error('O servidor respondeu, mas nao esta pronto para receber conexoes.');
  const health = await healthResponse.json().catch(() => null);
  if (health?.status !== 'ok') throw new Error('O endereco informado nao parece ser um servidor ComandaFlow.');

  const capabilitiesResponse = await requestWithTimeout(`${serverUrl}/system/capabilities`);
  if (!capabilitiesResponse.ok) throw new Error('Nao foi possivel confirmar o tipo desta instalacao.');
  const capabilities = await capabilitiesResponse.json();
  if (capabilities.subscriptionManager) {
    throw new Error('Este endereco pertence ao Gestor. Informe o servidor do restaurante.');
  }
  return { serverUrl, capabilities };
};

export default function ServerConnectionGate({ children }) {
  const nativeIOS = isNativeIOS();
  const configuredServer = useMemo(() => getConfiguredMobileServerUrl(), []);
  const [serverUrl, setServerUrl] = useState(configuredServer);
  const [checking, setChecking] = useState(Boolean(nativeIOS && configuredServer));
  const [connectionReady, setConnectionReady] = useState(false);
  const [error, setError] = useState('');
  const [connectedName, setConnectedName] = useState('');

  useEffect(() => {
    if (!nativeIOS || !configuredServer) return undefined;
    let active = true;
    validateRestaurantServer(configuredServer)
      .then(() => { if (active) setConnectionReady(true); })
      .catch((requestError) => {
        if (!active) return;
        setError(requestError.name === 'AbortError'
          ? 'O Restaurante não respondeu. Confira o Wi-Fi e mantenha o sistema aberto no computador.'
          : requestError.message || 'Não foi possível reconectar ao Restaurante.');
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [configuredServer, nativeIOS]);

  if (!nativeIOS || connectionReady) return children;

  const connect = async (event) => {
    event.preventDefault();
    setChecking(true);
    setError('');
    setConnectedName('');
    try {
      const result = await validateRestaurantServer(serverUrl);
      saveMobileServerUrl(result.serverUrl);
      setConnectedName(result.capabilities.appName || 'ComandaFlow Restaurante');
      window.setTimeout(() => window.location.reload(), 500);
    } catch (requestError) {
      const message = requestError.name === 'AbortError'
        ? 'O servidor demorou para responder. Deixe o ComandaFlow aberto e conecte os dois aparelhos ao mesmo Wi-Fi.'
        : requestError.message || 'Nao foi possivel conectar. Confira o Wi-Fi, o IP e se o ComandaFlow esta aberto no computador.';
      setError(message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="ios-setup-page">
      <div className="ios-setup-glow ios-setup-glow-one" aria-hidden="true" />
      <div className="ios-setup-glow ios-setup-glow-two" aria-hidden="true" />
      <section className="ios-setup-card">
        <div className="ios-setup-brand">
          <span className="ios-setup-logo"><img src="./logo-icon.png" alt="" /><strong>CF</strong></span>
          <span><strong>ComandaFlow</strong><small>Restaurante para iOS</small></span>
        </div>

        <div className="ios-setup-icon"><Smartphone size={30} /></div>
        <p className="ios-setup-eyebrow">Conexão direta com o Restaurante</p>
        <h1>Conecte este iPhone ao restaurante.</h1>
        <p className="ios-setup-description">
          Use o IP local do computador onde está aberto o ComandaFlow Restaurante. Não use o endereço do Gestor.
        </p>

        <form onSubmit={connect} className="ios-setup-form">
          <label htmlFor="restaurant-server"><Server size={15} />Servidor do restaurante</label>
          <div className="ios-setup-input-wrap">
            <Wifi size={18} />
            <input
              id="restaurant-server"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={serverUrl}
              onChange={(event) => setServerUrl(event.target.value)}
              placeholder="http://192.168.0.127:3002"
              required
            />
          </div>

          {error && <div className="ios-setup-message ios-setup-error" role="alert">{error}</div>}
          {connectedName && <div className="ios-setup-message ios-setup-success"><CheckCircle2 size={17} />{connectedName} encontrado. Abrindo...</div>}

          <button type="submit" disabled={checking}>
            {checking ? <LoaderCircle className="animate-spin" size={19} /> : <Wifi size={19} />}
            {checking ? 'Testando conexao...' : 'Conectar ao restaurante'}
            {!checking && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="ios-setup-security"><ShieldCheck size={17} /><span>HTTP e aceito somente em IP privado da rede local. Fora do restaurante, o aplicativo continua exigindo HTTPS.</span></div>
      </section>
    </main>
  );
}
