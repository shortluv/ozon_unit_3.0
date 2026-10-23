import React, { useState } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import { MARKETPLACE_PRESETS, calculateUnitEconomics, formatCurrency, formatPercent } from '../utils/calculator';
import { X, Plus, Sparkles, Tag, DollarSign, Box, Percent, Settings2, ArrowRight } from 'lucide-react';

interface NewProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: ProductUnitData) => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({
  isOpen,
  onClose,
  onAddProduct,
}) => {
  const [sku, setSku] = useState(`OZN-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Красота и гигиена');
  
  // 5 Ключевых параметров (главный фокус)
  const [retailPrice, setRetailPrice] = useState<number>(310);
  const [taxPrice, setTaxPrice] = useState<number>(270);
  const [cogs, setCogs] = useState<number>(55);
  const [volumeLiters, setVolumeLiters] = useState<number>(0.25);
  const [adSpendPercent, setAdSpendPercent] = useState<number>(5);

  const [plannedUnits, setPlannedUnits] = useState<number>(100);

  // Тарифные параметры (по умолчанию из Excel Ozon Красота)
  const defaultPreset = MARKETPLACE_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);
  const [commissionUnder300, setCommissionUnder300] = useState<number>(defaultPreset.commissionUnder300);
  const [commissionOver300, setCommissionOver300] = useState<number>(defaultPreset.commissionOver300);
  const [lastMilePercent, setLastMilePercent] = useState<number>(defaultPreset.lastMilePercent);
  const [acquiringPercent, setAcquiringPercent] = useState<number>(defaultPreset.acquiringPercent);
  const [crossDockFixed, setCrossDockFixed] = useState<number>(defaultPreset.crossDockFixed);
  const [fulfillmentFixed, setFulfillmentFixed] = useState<number>(defaultPreset.fulfillmentFixed);
  const [forceMajeurePercent, setForceMajeurePercent] = useState<number>(defaultPreset.forceMajeurePercent);
  const [taxPercent, setTaxPercent] = useState<number>(defaultPreset.taxPercent);
  const [ddvRub, setDdvRub] = useState<number>(0);
  const [lpRub, setLpRub] = useState<number>(0);

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyPreset = (presetId: string) => {
    const preset = MARKETPLACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setCommissionUnder300(preset.commissionUnder300);
    setCommissionOver300(preset.commissionOver300);
    setLastMilePercent(preset.lastMilePercent);
    setAcquiringPercent(preset.acquiringPercent);
    setCrossDockFixed(preset.crossDockFixed);
    setFulfillmentFixed(preset.fulfillmentFixed);
    setForceMajeurePercent(preset.forceMajeurePercent);
    setTaxPercent(preset.taxPercent);
  };

  const draftProduct: ProductUnitData = {
    id: `prod_${Date.now()}`,
    sku: sku || 'OZN-NEW',
    title: title || 'Новый товар',
    category,
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: Number(retailPrice) || 0,
    taxPrice: Number(taxPrice) > 0 ? Number(taxPrice) : Number(retailPrice) || 0,
    cogs: Number(cogs) || 0,
    volumeLiters: Number(volumeLiters) || 0.1,
    adSpendPercent: Number(adSpendPercent) || 0,
    
    fulfillmentFixed: Number(fulfillmentFixed) || 10,
    ddvRub: Number(ddvRub) || 0,
    lpRub: Number(lpRub) || 0,
    crossDockFixed: Number(crossDockFixed) || 1.63,
    lastMilePercent: Number(lastMilePercent) || 4.9,
    acquiringPercent: Number(acquiringPercent) || 1.5,
    commissionUnder300: Number(commissionUnder300) || 23,
    commissionOver300: Number(commissionOver300) || 52,
    forceMajeurePercent: Number(forceMajeurePercent) || 1.0,
    taxPercent: Number(taxPercent) || 11,
    plannedSalesUnits: Number(plannedUnits) || 100,
  };

  const calc = calculateUnitEconomics(draftProduct);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct(draftProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080b11]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_25px_50px_-12px_rgba(0,0,0,0.8)]">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-[#0a0f19]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Добавить товар в юнит-экономику</h2>
              <p className="text-xs text-slate-400">Заполните 5 изменяемых параметров — остальное рассчитается автоматически по формулам Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5 flex-1 text-xs">
          {/* Preset Buttons */}
          <div>
            <span className="text-slate-400 mb-1.5 block flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Шаблон тарифов маркетплейса:
            </span>
            <div className="flex flex-wrap gap-2">
              {MARKETPLACE_PRESETS.map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleApplyPreset(p.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                        : 'bg-[#080b11] hover:bg-[#121825] border-white/[0.08] text-slate-300'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sku & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Артикул (SKU)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 font-mono bg-[#080b11] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-emerald-500/60"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Наименование товара</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="напр., Сыворотка для лица с ниацинамидом"
                className="w-full px-3 py-2 bg-[#080b11] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-emerald-500/60"
                required
              />
            </div>
          </div>

          {/* 5 PRIMARY INPUTS HIGHLIGHTED */}
          <div className="p-4.5 bg-[#080b11] border-2 border-emerald-500/40 rounded-2xl space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
              <div className="font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                <span>5 Ключевых параметров (ввод селлера):</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">автоматический пересчет</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Предельная цена */}
              <div>
                <label className="block text-emerald-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> 1. Предельная цена</span>
                  <span className="text-[10px] text-slate-400 font-mono">₽</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 font-bold font-mono text-base bg-[#121929] border border-emerald-500/50 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {retailPrice <= 300 ? 'Порог ≤300 ₽: комиссия 23%' : 'Порог >300 ₽: комиссия 52%'}
                </span>
              </div>

              {/* Цена реализации для налога */}
              <div>
                <label className="block text-cyan-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-cyan-400" /> 2. Цена реализации</span>
                  <span className="text-[10px] text-slate-400 font-mono">₽</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={taxPrice}
                  onChange={(e) => setTaxPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 font-bold font-mono text-base bg-[#121929] border border-cyan-500/50 rounded-xl text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  required
                />
                <span className="text-[10px] text-cyan-400/90 mt-0.5 block font-mono">
                  Налог УСН {taxPercent}%: {formatCurrency(((taxPrice || retailPrice) * taxPercent) / 100)}
                </span>
              </div>

              {/* Закупка */}
              <div>
                <label className="block text-blue-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> 3. Закупка / себест.</span>
                  <span className="text-[10px] text-slate-400 font-mono">₽</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={cogs}
                  onChange={(e) => setCogs(Number(e.target.value))}
                  className="w-full px-3 py-2 font-bold font-mono text-base bg-[#121929] border border-blue-500/50 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Себестоимость единицы товара
                </span>
              </div>

              {/* Литраж */}
              <div>
                <label className="block text-amber-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Box className="w-3.5 h-3.5" /> 4. Литраж упаковки</span>
                  <span className="text-[10px] text-slate-400 font-mono">литры (л)</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  value={volumeLiters}
                  onChange={(e) => setVolumeLiters(Number(e.target.value))}
                  className="w-full px-3 py-2 font-bold font-mono text-base bg-[#121929] border border-amber-500/50 rounded-xl text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Тариф лог: {calc.baseLogisticsTariff} ₽
                </span>
              </div>

              {/* Процент рекламы */}
              <div className="sm:col-span-2">
                <label className="block text-pink-300 font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> 5. Процент рекламы (ДРР %)</span>
                  <span className="text-[10px] text-slate-400 font-mono">% от цены</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={adSpendPercent}
                  onChange={(e) => setAdSpendPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 font-bold font-mono text-base bg-[#121929] border border-pink-500/50 rounded-xl text-pink-200 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Расход на рекламу с 1 заказа: {formatCurrency(calc.adSpendRub)}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Advanced Parameters */}
          <div className="border border-white/[0.06] rounded-xl p-3.5 bg-[#080b11]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 font-semibold text-xs">
                <Settings2 className="w-4 h-4 text-slate-400" />
                Параметры склада и налогообложения (из Excel)
              </span>
              <span className="text-[11px] text-slate-500 underline">
                {showAdvanced ? 'Скрыть' : 'Показать'}
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-3.5 pt-3.5 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-0.5">ФФ (руб)</label>
                  <input
                    type="number"
                    value={fulfillmentFixed}
                    onChange={(e) => setFulfillmentFixed(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Кросс-докинг (руб)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={crossDockFixed}
                    onChange={(e) => setCrossDockFixed(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Налог % (УСН)</label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Посл. миля %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={lastMilePercent}
                    onChange={(e) => setLastMilePercent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">Эквайринг %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={acquiringPercent}
                    onChange={(e) => setAcquiringPercent(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-0.5">План продаж (шт/мес)</label>
                  <input
                    type="number"
                    value={plannedUnits}
                    onChange={(e) => setPlannedUnits(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 font-mono bg-[#121929] border border-white/[0.08] rounded-lg text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instant Calculation Preview Card */}
          <div className="p-4 bg-[#080b11] border border-white/[0.08] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
              <span>Результат юнит-экономики:</span>
              <span className="font-mono">
                {calc.status === 'profitable' ? '🟢 Прибыльный' : calc.status === 'marginal' ? '🟡 Низкая маржа' : '🔴 Убыточный'}
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center pt-1">
              <div className="p-2.5 bg-[#0e1420] rounded-xl border border-white/[0.04]">
                <div className="text-[10px] text-slate-400">Прибыль / 1 шт</div>
                <div className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                  calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(calc.netProfitPerUnit)}
                </div>
              </div>

              <div className="p-2.5 bg-[#0e1420] rounded-xl border border-white/[0.04]">
                <div className="text-[10px] text-slate-400">Маржа %</div>
                <div className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                  calc.marginPercent >= 15 ? 'text-emerald-400' : calc.marginPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formatPercent(calc.marginPercent)}
                </div>
              </div>

              <div className="p-2.5 bg-[#0e1420] rounded-xl border border-white/[0.04]">
                <div className="text-[10px] text-slate-400">ROI %</div>
                <div className={`font-mono font-bold text-sm tabular-nums mt-0.5 ${
                  calc.roiPercent >= 20 ? 'text-emerald-400' : calc.roiPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formatPercent(calc.roiPercent)}
                </div>
              </div>

              <div className="p-2.5 bg-[#0e1420] rounded-xl border border-white/[0.04]">
                <div className="text-[10px] text-slate-400">Безубыток</div>
                <div className="font-mono font-bold text-sm tabular-nums text-white mt-0.5">
                  {formatCurrency(calc.breakEvenPrice)}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 px-1">
              <span>Логистика итого: <strong className="text-white font-mono">{formatCurrency(calc.totalLogisticsRub)}</strong></span>
              <span>Комиссия ({calc.appliedCommissionPercent}%): <strong className="text-white font-mono">{formatCurrency(calc.commissionRub)}</strong></span>
              <span>Расходы: <strong className="text-white font-mono">{formatCurrency(calc.totalExpensesRub)}</strong></span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer"
            >
              Добавить в таблицу
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
