import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="Instalar aplicativo Kaju"
        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{compact ? 'Instalar' : 'Instalar App'}</span>
      </button>
    );
  }

  // Show iOS guide button on iOS devices or when explicitly helpful
  return (
    <>
      <button
        type="button"
        onClick={() => setShowIOSGuide(true)}
        aria-label="Como instalar no iPhone"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Share className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{isIOS || compact ? 'Instalar iOS' : 'App iOS'}</span>
      </button>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#131A29] border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="ios-install-title"
                  className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                >
                  Instalar Kaju no iPhone ou iPad
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Use em tela cheia e offline direto da sua Tela de Início do iOS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                aria-label="Fechar instruções de instalação"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="mt-5 space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  1
                </span>
                <div>
                  Abra este site no <strong>Safari</strong> do iOS e toque no ícone{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-white">
                    <Share className="w-4 h-4 inline" aria-hidden="true" /> Compartilhar
                  </span>{' '}
                  na barra inferior.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  2
                </span>
                <div>
                  Role a lista e toque em{' '}
                  <span className="inline-flex items-center gap-1 font-medium text-slate-900 dark:text-white">
                    <PlusSquare className="w-4 h-4 inline" aria-hidden="true" /> Adicionar à Tela de Início
                  </span>
                  .
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                  3
                </span>
                <div>
                  Toque em <strong>Adicionar</strong>. O Kaju abrirá como um aplicativo nativo com dados salvos localmente.
                </div>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
