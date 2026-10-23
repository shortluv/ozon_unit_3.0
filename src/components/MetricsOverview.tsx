import React from 'react';
import { ProductUnitData, UnitEconomicsResult } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { TrendingUp, AlertTriangle, CheckCircle2, DollarSign, ArrowUpRight } from 'lucide-react';

interface MetricsOverviewProps {
  products: ProductUnitData[];
  onFilterLosses: () => void;
  activeFilter: string;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  products,
  onFilterLosses,
  activeFilter,
}) => {
  const calculations: UnitEconomicsResult[] = products.map(calculateUnitEconomics);

  const totalMonthlyRevenue = calculations.reduce((acc, c) => acc + c.monthlyRevenue, 0);
  const totalMonthlyProfit = calculations.reduce((acc, c) => acc + c.monthlyNetProfit, 0);
  const totalMonthlyExpenses = calculations.reduce((acc, c) => acc + c.monthlyTotalExpenses, 0);

  const avgMargin = totalMonthlyRevenue > 0
    ? (totalMonthlyProfit / totalMonthlyRevenue) * 100
    : 0;

  const lossCount = calculations.filter((c) => c.status === 'loss').length;
  const marginalCount = calculations.filter((c) => c.status === 'marginal').length;
  const profitableCount = calculations.filter((c) => c.status === 'profitable').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Metric 1: Monthly Net Profit */}
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium text-slate-300">Чистая прибыль / месяц</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className={`text-2xl lg:text-3xl font-bold font-mono tracking-tight tabular-nums ${totalMonthlyProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {formatCurrency(totalMonthlyProfit)}
        </div>
        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
          <span>Ср. маржа:</span>
          <span className="font-mono tabular-nums font-semibold text-white">
            {formatPercent(avgMargin)}
          </span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>{products.length} SKU в расчете</span>
        </div>
      </div>

      {/* Metric 2: Monthly Revenue */}
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium text-slate-300">Плановая выручка</span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <DollarSign className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight tabular-nums text-white">
          {formatCurrency(totalMonthlyRevenue)}
        </div>
        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
          <span>Все расходы:</span>
          <span className="font-mono tabular-nums text-slate-300 font-medium">
            {formatCurrency(totalMonthlyExpenses)}
          </span>
        </div>
      </div>

      {/* Metric 3: Profitable items */}
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all hover:border-white/[0.12]">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium text-slate-300">Прибыльные позиции</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className="text-2xl lg:text-3xl font-bold font-mono tracking-tight tabular-nums text-emerald-400 flex items-baseline">
          {profitableCount}
          <span className="text-sm font-normal text-slate-500 ml-1.5">/ {products.length} SKU</span>
        </div>
        <div className="flex items-center gap-2 mt-2.5 text-xs text-slate-400">
          <span className="text-slate-300">Маржа &gt; 12%</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span className="text-amber-400/90 font-mono tabular-nums">{marginalCount} пограничных</span>
        </div>
      </div>

      {/* Metric 4: Loss warning items */}
      <div
        onClick={lossCount > 0 ? onFilterLosses : undefined}
        className={`bg-[#0e1420] border rounded-xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-all ${
          lossCount > 0
            ? 'border-rose-500/30 hover:border-rose-500/60 cursor-pointer bg-rose-950/[0.08]'
            : 'border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="font-medium text-slate-300">Убыточные позиции</span>
          <div className={`p-1.5 rounded-lg ${lossCount > 0 ? 'bg-rose-500/15 text-rose-400' : 'bg-slate-800 text-slate-500'}`}>
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
        </div>
        <div className={`text-2xl lg:text-3xl font-bold font-mono tracking-tight tabular-nums flex items-baseline ${lossCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
          {lossCount}
          <span className="text-sm font-normal text-slate-500 ml-1.5">SKU</span>
        </div>
        <div className="mt-2.5 text-xs flex items-center justify-between">
          {lossCount > 0 ? (
            <span className="text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-colors">
              {activeFilter === 'loss' ? 'Сбросить фильтр убыточных' : 'Показать в таблице'}
              <ArrowUpRight className="w-3 h-3" />
            </span>
          ) : (
            <span className="text-emerald-400/90 font-medium">Все позиции в плюсе</span>
          )}
        </div>
      </div>
    </div>
  );
};
