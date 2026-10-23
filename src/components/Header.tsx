import React from 'react';
import { Calculator, Table2, Grid3X3, Lightbulb, Upload, Download, Plus, Layers, RefreshCw, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor';
  setActiveTab: (tab: 'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor') => void;
  onOpenImport: () => void;
  onExport: () => void;
  onNewProduct: () => void;
  onOpenOzonSync: () => void;
  isOzonConnected?: boolean;
  productCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenImport,
  onExport,
  onNewProduct,
  onOpenOzonSync,
  isOzonConnected,
  productCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#080b11]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single clean brand wordmark (Uptic style) */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Layers className="w-4 h-4 text-emerald-400 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap font-sans">
                ЮнитЭкономика
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-400">
                PRO
              </span>
            </div>
          </div>

          {/* Zone 2: Refined segmented navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-[#0e1420]/70 border border-white/[0.06] rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Таблица позиций</span>
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-300">
                {productCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('live_analytics')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'live_analytics'
                  ? 'bg-emerald-500/15 text-emerald-300 shadow-sm border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Живая аналитика</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('single')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Калькулятор 1 шт</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Матрица «Что, если?»</span>
            </button>

            <button
              onClick={() => setActiveTab('advisor')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'advisor'
                  ? 'bg-white/[0.08] text-white shadow-sm border border-white/[0.1]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Аудит и советы</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenOzonSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-sm border ${
                isOzonConnected
                  ? 'text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/35 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  : 'text-slate-300 bg-[#0e1420] hover:bg-[#151f32] border-white/[0.08] hover:border-white/[0.15]'
              }`}
              title="Синхронизация с Ozon и актуальные тарифы логистики"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Ozon Тарифы</span>
              {isOzonConnected ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0e1420] hover:bg-[#151f32] border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-sm"
              title="Загрузить таблицу Excel или CSV с юнит-экономикой"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Импорт Excel</span>
            </button>

            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#0e1420] hover:bg-[#151f32] border border-white/[0.08] hover:border-white/[0.15] rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-sm"
              title="Выгрузить все расчеты в Excel файл"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Экспорт</span>
            </button>

            <button
              onClick={onNewProduct}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Новый товар</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
