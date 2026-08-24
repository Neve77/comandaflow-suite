import React from 'react';

const diagnosticCode = () => `CF-${Date.now().toString(36).toUpperCase()}`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, diagnosticId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, diagnosticId: diagnosticCode() };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `[RENDERER_ERROR ${this.state.diagnosticId}] ${error?.message || 'Erro desconhecido'}`,
      errorInfo?.componentStack || '',
    );
  }

  backToLogin = () => {
    localStorage.removeItem('comanda_token');
    localStorage.removeItem('comanda_user');
    window.location.hash = '#/login';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-xl font-black text-rose-600">!</div>
            <h1 className="mt-4 text-xl font-extrabold text-slate-900">Não foi possível abrir o painel</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Feche outras janelas do ComandaFlow e tente novamente. Seus dados não foram apagados.
            </p>
            <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600">
              Código de diagnóstico: {this.state.diagnosticId}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={() => window.location.reload()} className="btn-primary w-full sm:w-auto">Tentar novamente</button>
              <button type="button" onClick={this.backToLogin} className="btn-secondary w-full sm:w-auto">Voltar ao login</button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
