import React, { useState } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { Grid3X3, Tag, DollarSign, Box, Percent, ArrowRight } from 'lucide-react';

interface SensitivityMatrixProps {
  products: ProductUnitData[];
  selectedProduct: ProductUnitData | null;
}

export const SensitivityMatrix: React.FC<SensitivityMatrixProps> = ({
  products,
  selectedProduct,
}) => {
  const [activeProductId, setActiveProductId] = useState<string>(
    selectedProduct?.id || products[0]?.id || ''
  );

  const product = products.find((p) => p.id === activeProductId) || products[0];

  if (!product) {
    return (
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-12 text-center text-slate-400">
        Нет товаров для анализа. Добавьте товар в каталог.
      </div>
    );
  }

  // Price multipliers: -25%, -15%, -10%, Current (0%), +10%, +20%, +30%
  const priceDeltas = [-0.25, -0.15, -0.10, 0, 0.10, 0.20, 0.30];
  // Cost multipliers: -20%, -10%, Current (0%), +10%, +25%
  const costDeltas = [-0.20, -0.10, 0, 0.10, 0.25];

  const currentCalc = calculateUnitEconomics(product);

  return (
    <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
      {/* Header and SKU selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-emerald-400" />
            <span>Матрица чувствительности «Что, если?»</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Стресс-тест чистой прибыли и маржинальности при колебаниях цены реализации и стоимости закупки
          </p>
        </div>

        {/* Product Picker */}
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-400 whitespace-nowrap font-medium">Товар:</label>
          <select
            value={activeProductId}
            onChange={(e) => setActiveProductId(e.target.value)}
            className="text-xs font-semibold bg-[#080b11] border border-white/[0.08] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/60 max-w-xs truncate cursor-pointer shadow-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Baseline info showing the 4 primary inputs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#080b11] p-4 rounded-xl border border-white/[0.06] text-xs">
        <div>
          <span className="text-slate-400 block mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-400" /> Предельная цена:
          </span>
          <span className="font-mono tabular-nums font-bold text-emerald-300 text-sm">
            {formatCurrency(product.retailPrice)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" /> Закупка:
          </span>
          <span className="font-mono tabular-nums font-bold text-blue-300 text-sm">
            {formatCurrency(product.cogs)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-1 flex items-center gap-1">
            <Box className="w-3.5 h-3.5 text-amber-400" /> Литраж упаковки:
          </span>
          <span className="font-mono tabular-nums font-bold text-amber-300 text-sm">
            {product.volumeLiters} л ({Math.round(currentCalc.totalLogisticsRub)} ₽ лог.)
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-pink-400" /> Процент рекламы:
          </span>
          <span className="font-mono tabular-nums font-bold text-pink-300 text-sm">
            {product.adSpendPercent}% ({formatCurrency(currentCalc.adSpendRub)})
          </span>
        </div>
      </div>

      {/* Sensitivity Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-center text-xs border-collapse">
          <thead>
            <tr>
              <th className="py-3 px-3.5 text-left bg-[#080b11] border border-white/[0.06] text-slate-400 font-semibold whitespace-nowrap">
                Закупка \ Предельная цена
              </th>
              {priceDeltas.map((pDelta) => {
                const simulatedPrice = Math.round(product.retailPrice * (1 + pDelta));
                const isCurrent = pDelta === 0;

                return (
                  <th
                    key={pDelta}
                    className={`py-3 px-3 border border-white/[0.06] font-mono tabular-nums ${
                      isCurrent
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40'
                        : 'bg-[#080b11] text-slate-300 font-medium'
                    }`}
                  >
                    <div className="text-white font-bold">{formatCurrency(simulatedPrice)}</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                      {pDelta > 0 ? `+${pDelta * 100}%` : pDelta < 0 ? `${pDelta * 100}%` : 'Текущая'}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {costDeltas.map((cDelta) => {
              const simulatedCogs = Math.round(product.cogs * (1 + cDelta));
              const isCurrentCost = cDelta === 0;

              return (
                <tr key={cDelta}>
                  <td
                    className={`py-3 px-3.5 text-left font-mono tabular-nums border border-white/[0.06] ${
                      isCurrentCost
                        ? 'bg-emerald-500/10 text-emerald-300 font-bold border-emerald-500/30'
                        : 'bg-[#080b11] text-slate-300 font-medium'
                    }`}
                  >
                    <div className="text-white font-semibold">{formatCurrency(simulatedCogs)}</div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      {cDelta > 0 ? `+${cDelta * 100}% закупка` : cDelta < 0 ? `${cDelta * 100}% закупка` : 'Текущая себест.'}
                    </div>
                  </td>

                  {priceDeltas.map((pDelta) => {
                    const simulatedPrice = Math.round(product.retailPrice * (1 + pDelta));
                    const isBaseCell = pDelta === 0 && cDelta === 0;

                    const cellCalc = calculateUnitEconomics({
                      ...product,
                      retailPrice: simulatedPrice,
                      cogs: simulatedCogs,
                    });

                    const isLoss = cellCalc.netProfitPerUnit < 0;
                    const isMarginal = cellCalc.marginPercent < 12 && !isLoss;

                    return (
                      <td
                        key={pDelta}
                        className={`py-3 px-3 border border-white/[0.06] font-mono tabular-nums transition-all ${
                          isBaseCell
                            ? 'ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10'
                            : ''
                        } ${
                          isLoss
                            ? 'bg-rose-500/10 text-rose-300'
                            : isMarginal
                            ? 'bg-amber-500/10 text-amber-300'
                            : 'bg-emerald-500/[0.08] text-emerald-300'
                        }`}
                      >
                        <div className="font-bold text-xs">
                          {formatCurrency(cellCalc.netProfitPerUnit)}
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {formatPercent(cellCalc.marginPercent)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend & Advice */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/[0.06] text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
            <span>Прибыль (&gt;12% маржи)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40 inline-block" />
            <span>Погранично (0–12%)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 inline-block" />
            <span>Убыток (&lt;0 ₽)</span>
          </span>
        </div>
        <div className="text-slate-400 font-medium">
          Ячейка с зеленой рамкой — текущие параметры товара в каталоге
        </div>
      </div>
    </div>
  );
};
