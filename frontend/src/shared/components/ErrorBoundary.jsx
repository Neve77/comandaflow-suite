import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-5 text-center">
          <h2 className="text-xl font-semibold text-red-400">Algo deu errado</h2>
          <p className="text-slate-400 mt-2">Tente recarregar a página</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-white"
          >
            Recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;