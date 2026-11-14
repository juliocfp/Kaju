import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado ao carregar o aplicativo.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200 p-6 shadow-sm text-center space-y-4">
            <h1 className="text-lg font-bold text-slate-900">
              Não foi possível abrir o Kaju
            </h1>
            <p className="text-sm text-slate-600">
              Ocorreu um erro ao carregar os dados locais ({this.state.errorMessage}).
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-sm font-medium text-white"
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
              >
                Redefinir cache local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
