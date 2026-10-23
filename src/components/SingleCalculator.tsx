import React, { useState, useEffect } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import { calculateUnitEconomics, formatCurrency, formatPercent, MARKETPLACE_PRESETS } from '../utils/calculator';
import {
  Sparkles,
  Save,
  CheckCircle2,
  Info,
  Box,
  DollarSign,
  Percent,
  Tag,
  Calculator,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Settings2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SingleCalculatorProps {
  products: ProductUnitData[];
  selectedProduct: ProductUnitData | null;
  onSaveProduct: (product: ProductUnitData) => void;
  onSaveAsNew: (product: ProductUnitData) => void;
}

export const SingleCalculator: React.FC<SingleCalculatorProps> = ({
  products,
  selectedProduct,
  onSaveProduct,
  onSaveAsNew,
}) => {
  const defaultProduct: ProductUnitData = selectedProduct || products[0] || {
    id: `prod_${Date.now()}`,
    sku: 'OZN-NEW',
    title: 'Новый товар для расчета',
    category: 'Красота и гигиена',
    warehouse: 'Склад FBO Тула / Москва (Центр)',
    warehouseType: 'FBO',
    retailPrice: 310,
    cogs: 55,
    volumeLiters: 0.25,
    adSpendPercent: 5,
    fulfillmentFixed: 10,
    ddvRub: 0,
    lpRub: 0,
    crossDockFixed: 1.63,
    lastMilePercent: 4.9,
    acquiringPercent: 1.5,
    commissionUnder300: 23,
    commissionOver300: 52,
    forceMajeurePercent: 1.0,
    taxPercent: 11,
    plannedSalesUnits: 150,
  };

  const [form, setForm] = useState<ProductUnitData>(defaultProduct);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Dimensions helper (Д x Ш x В в см -> Литраж)
  const [showDimensionHelper, setShowDimensionHelper] = useState(false);
  const [dimL, setDimL] = useState(15);
  const [dimW, setDimW] = useState(10);
  const [dimH, setDimH] = useState(5);

  useEffect(() => {
    if (selectedProduct) {
      setForm(selectedProduct);
    }
  }, [selectedProduct]);

  const calc = calculateUnitEconomics(form);

  const applyPreset = (presetId: string) => {
    const preset = MARKETPLACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      commissionUnder300: preset.commissionUnder300,
      commissionOver300: preset.commissionOver300,
      lastMilePercent: preset.lastMilePercent,
      acquiringPercent: preset.acquiringPercent,
      crossDockFixed: preset.crossDockFixed,
      fulfillmentFixed: preset.fulfillmentFixed,
      forceMajeurePercent: preset.forceMajeurePercent,
      taxPercent: preset.taxPercent,
    }));
  };

  const handleSave = () => {
    onSaveProduct(form);
    setSaveSuccessMsg('Товар успешно обновлен в каталоге!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveNew = () => {
    const newId = `prod_${Date.now()}`;
    const newSku = form.sku.includes('-NEW') ? form.sku : `${form.sku}-COPY`;
    onSaveAsNew({
      ...form,
      id: newId,
      sku: newSku,
    });
    setSaveSuccessMsg('Сохранено как новая позиция в каталоге!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const applyDimensions = () => {
    const liters = Number(((dimL * dimW * dimH) / 1000).toFixed(2));
    setForm((prev) => ({ ...prev, volumeLiters: Math.max(0.01, liters) }));
    setShowDimensionHelper(false);
  };

  // Stacked bar percentages
  const totalBar = Math.max(calc.retailPrice, calc.totalExpensesRub);
  const pctCogs = totalBar > 0 ? (calc.cogs / totalBar) * 100 : 0;
  const pctLogistics = totalBar > 0 ? (calc.totalLogisticsRub / totalBar) * 100 : 0;
  const pctCommission = totalBar > 0 ? (calc.commissionRub / totalBar) * 100 : 0;
  const pctAds = totalBar > 0 ? (calc.adSpendRub / totalBar) * 100 : 0;
  const pctFulfillment = totalBar > 0 ? ((calc.fulfillmentRub + calc.crossDockRub) / totalBar) * 100 : 0;
  const pctTax = totalBar > 0 ? ((calc.taxRub + calc.forceMajeureRub) / totalBar) * 100 : 0;
  const pctProfit = totalBar > 0 && calc.netProfitPerUnit > 0 ? (calc.netProfitPerUnit / totalBar) * 100 : 0;

  // Max allowable CPO in Rubles
  const maxAllowableCPO = (calc.retailPrice * calc.maxAllowableAdPercent) / 100;

  // Check if price is in the 301-340 cliff
  const isCliffPricing = form.retailPrice > 300 && form.retailPrice <= 340;

  return (
    <div className="space-y-6">
      {/* Product Switcher & Presets Strip (Uptic style) */}
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400 whitespace-nowrap font-medium">Товар для детального расчета:</label>
          <select
            value={form.id}
            onChange={(e) => {
              const found = products.find((p) => p.id === e.target.value);
              if (found) setForm(found);
            }}
            className="text-xs font-semibold bg-[#080b11] border border-white/[0.08] text-white rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/60 max-w-sm truncate cursor-pointer shadow-sm"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.retailPrice} ₽)
              </option>
            ))}
          </select>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Шаблон:
          </span>
          {MARKETPLACE_PRESETS.map((pr) => (
            <button
              key={pr.id}
              onClick={() => applyPreset(pr.id)}
              className="text-xs px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#080b11] hover:bg-white/[0.06] text-slate-300 transition-all cursor-pointer shadow-sm"
            >
              {pr.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Inputs (Left) and Live Waterfall/Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: 4 PRIMARY INPUTS + TARIFFS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Ozon API Transparency Banner */}
          {form.syncMeta && (
            <div className="bg-[#0e1420] border border-blue-500/25 rounded-2xl p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] border-b border-white/[0.06] pb-2">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Данные позиции получены из Ozon Seller API (Admin Read-Only)
                </span>
                {form.syncMeta.lastSyncDate && (
                  <span className="font-mono text-slate-400 text-[10px]">
                    {new Date(form.syncMeta.lastSyncDate).toLocaleDateString('ru-RU')} {new Date(form.syncMeta.lastSyncDate).toLocaleTimeString('ru-RU')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-[#080b11] rounded-lg border border-white/[0.04]">
                  <span className="text-slate-400 block text-[10px]">1. Предельная цена:</span>
                  <span className="font-mono text-emerald-400 font-bold">{form.retailPrice} ₽</span>
                  <div className="text-[9px] text-slate-500 truncate" title={form.syncMeta.limitPriceMeta?.message}>
                    {form.syncMeta.limitPriceMeta?.fieldUsed || 'price.min_price'}
                  </div>
                </div>
                <div className="p-2 bg-[#080b11] rounded-lg border border-white/[0.04]">
                  <span className="text-slate-400 block text-[10px]">2. Цена реализации:</span>
                  <span className="font-mono text-cyan-300 font-bold">{form.taxPrice} ₽</span>
                  <div className="text-[9px] text-slate-500 truncate" title={form.syncMeta.realizationPriceMeta?.message}>
                    {form.syncMeta.realizationPriceMeta?.fieldUsed || 'marketing_seller_price'}
                  </div>
                </div>
                <div className="p-2 bg-[#080b11] rounded-lg border border-white/[0.04]">
                  <span className="text-slate-400 block text-[10px]">3. Литраж:</span>
                  <span className="font-mono text-amber-300 font-bold">{form.volumeLiters} л</span>
                  <div className="text-[9px] text-slate-500 truncate" title={form.syncMeta.volumeMeta?.message}>
                    {form.contentVolume ? form.contentVolume.raw : form.syncMeta.volumeMeta?.fieldUsed || 'атрибут'}
                  </div>
                </div>
                <div className="p-2 bg-[#080b11] rounded-lg border border-white/[0.04]">
                  <span className="text-slate-400 block text-[10px]">4. ДРР:</span>
                  <span className="font-mono text-pink-300 font-bold">{form.adSpendPercent}%</span>
                  <div className="text-[9px] text-slate-500 truncate" title={form.syncMeta.drrMeta?.message}>
                    ручной ввод (Performance API)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5 PRIMARY INPUTS CONTAINER */}
          <div className="bg-[#0e1420] border-2 border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_30px_rgb(0_0_0_/_40%)]">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <h2 className="text-sm font-bold text-white tracking-wide">
                  5 Ключевых параметров для ввода (включая цену реализации)
                </h2>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30 font-medium">
                мгновенный авторасчет
              </span>
            </div>

            {/* 1. Предельная цена реализации */}
            <div className="space-y-2 bg-[#080b11] p-4 rounded-xl border border-emerald-500/20">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" /> 1. Предельная цена реализации
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ввод:</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.retailPrice}
                    onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                    className="w-24 px-2.5 py-1 text-right font-mono font-bold text-sm bg-[#121929] border border-emerald-500/50 rounded-lg text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">₽</span>
                </div>
              </div>
              <input
                type="range"
                min="50"
                max="2500"
                step="5"
                value={form.retailPrice}
                onChange={(e) => setForm({ ...form, retailPrice: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>50 ₽</span>
                <span className="font-mono text-slate-200">
                  {form.retailPrice <= 300 ? (
                    <span className="text-emerald-400 font-medium">Порог ≤300 ₽: комиссия Ozon 23%, льготная логистика</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Порог &gt;300 ₽: комиссия Ozon 52%, стандартная логистика</span>
                  )}
                </span>
                <span>2 500 ₽</span>
              </div>

              {/* Cliff alert if applicable */}
              {isCliffPricing && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Эффект порога 300 ₽:</strong> Цена {form.retailPrice} ₽ облагается повышенной комиссией 52% (вместо 23%).
                    При цене 299 ₽ чистая прибыль составила бы больше из-за льготной ставки!
                  </div>
                </div>
              )}
            </div>

            {/* 2. Цена реализации для налога */}
            <div className="space-y-2 bg-[#080b11] p-4 rounded-xl border border-cyan-500/30">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-cyan-400" /> 2. Цена реализации (база налога УСН)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ввод:</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={form.taxPrice ?? form.retailPrice}
                    onChange={(e) => setForm({ ...form, taxPrice: Number(e.target.value) })}
                    className="w-24 px-2.5 py-1 text-right font-mono font-bold text-sm bg-[#121929] border border-cyan-500/50 rounded-lg text-cyan-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">₽</span>
                </div>
              </div>
              <input
                type="range"
                min="50"
                max="2500"
                step="5"
                value={form.taxPrice ?? form.retailPrice}
                onChange={(e) => setForm({ ...form, taxPrice: Number(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>50 ₽</span>
                <span className="font-mono text-cyan-300">
                  Формула УСН: {form.taxPercent}% от {formatCurrency(calc.taxPrice)} = <strong className="text-white font-bold">{formatCurrency(calc.taxRub)}</strong>
                </span>
                <span>2 500 ₽</span>
              </div>
            </div>

            {/* 3. Закупка / себестоимость */}
            <div className="space-y-2 bg-[#080b11] p-4 rounded-xl border border-blue-500/20">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-blue-400" /> 3. Закупка / себестоимость
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ввод:</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={form.cogs}
                    onChange={(e) => setForm({ ...form, cogs: Number(e.target.value) })}
                    className="w-24 px-2.5 py-1 text-right font-mono font-bold text-sm bg-[#121929] border border-blue-500/50 rounded-lg text-blue-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">₽</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(1000, form.retailPrice)}
                step="5"
                value={form.cogs}
                onChange={(e) => setForm({ ...form, cogs: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0 ₽</span>
                <span className="text-slate-300 font-mono">
                  Доля закупки в выручке: {((calc.cogs / (calc.retailPrice || 1)) * 100).toFixed(1)}%
                </span>
                <span>{Math.max(1000, form.retailPrice)} ₽</span>
              </div>
            </div>

            {/* 4. Литраж */}
            <div className="space-y-2 bg-[#080b11] p-4 rounded-xl border border-amber-500/20">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-amber-400" /> 4. Литраж упаковки
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDimensionHelper(!showDimensionHelper)}
                    className="text-[11px] px-2.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
                  >
                    {showDimensionHelper ? 'Скрыть размеры Д×Ш×В' : 'Д×Ш×В коробки'}
                  </button>
                  <span className="text-[11px] text-slate-400">Ввод:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    value={form.volumeLiters}
                    onChange={(e) => setForm({ ...form, volumeLiters: Number(e.target.value) })}
                    className="w-20 px-2 py-1 text-right font-mono font-bold text-sm bg-[#121929] border border-amber-500/50 rounded-lg text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">л</span>
                </div>
              </div>
              <input
                type="range"
                min="0.05"
                max="5.0"
                step="0.05"
                value={form.volumeLiters}
                onChange={(e) => setForm({ ...form, volumeLiters: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0.05 л</span>
                <span className="text-slate-300 font-mono">
                  Тариф логистики Ozon: <strong className="text-white">{calc.baseLogisticsTariff} ₽</strong> (со сборами: {formatCurrency(calc.totalLogisticsRub)})
                </span>
                <span>5.0 л</span>
              </div>

              {/* Dimensions Helper Popover */}
              {showDimensionHelper && (
                <div className="mt-3 p-3.5 bg-[#101625] border border-amber-500/30 rounded-xl space-y-2.5 shadow-inner">
                  <div className="text-[11px] font-semibold text-amber-300">Расчет литража из физических габаритов коробки:</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Длина (см)</label>
                      <input
                        type="number"
                        value={dimL}
                        onChange={(e) => setDimL(Number(e.target.value))}
                        className="w-full p-1.5 text-xs bg-[#080b11] border border-white/[0.08] rounded-lg text-center text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Ширина (см)</label>
                      <input
                        type="number"
                        value={dimW}
                        onChange={(e) => setDimW(Number(e.target.value))}
                        className="w-full p-1.5 text-xs bg-[#080b11] border border-white/[0.08] rounded-lg text-center text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Высота (см)</label>
                      <input
                        type="number"
                        value={dimH}
                        onChange={(e) => setDimH(Number(e.target.value))}
                        className="w-full p-1.5 text-xs bg-[#080b11] border border-white/[0.08] rounded-lg text-center text-white font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-slate-300">
                      Объем: <strong className="text-amber-400 font-bold">{((dimL * dimW * dimH) / 1000).toFixed(2)} л</strong>
                    </span>
                    <button
                      type="button"
                      onClick={applyDimensions}
                      className="px-3 py-1 text-xs bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      Применить в литраж
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Процент рекламы */}
            <div className="space-y-2 bg-[#080b11] p-4 rounded-xl border border-pink-500/20">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-pink-300 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-pink-400" /> 5. Процент рекламы (ДРР %)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Ввод:</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={form.adSpendPercent}
                    onChange={(e) => setForm({ ...form, adSpendPercent: Number(e.target.value) })}
                    className="w-20 px-2.5 py-1 text-right font-mono font-bold text-sm bg-[#121929] border border-pink-500/50 rounded-lg text-pink-200 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={form.adSpendPercent}
                onChange={(e) => setForm({ ...form, adSpendPercent: Number(e.target.value) })}
                className="w-full accent-pink-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>0%</span>
                <span className="text-slate-300 font-mono">
                  Расход на заказ: <strong className="text-white">{formatCurrency(calc.adSpendRub)}</strong> (макс. допустимый: {formatPercent(calc.maxAllowableAdPercent)})
                </span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* ADVANCED SETTINGS ACCORDION */}
          <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Settings2 className="w-4 h-4 text-slate-400" />
                <span>Тарифные константы маркетплейса (из Excel таблицы)</span>
              </div>
              <span className="text-[11px] text-slate-500 underline flex items-center gap-1">
                {showAdvanced ? 'Свернуть' : 'Развернуть параметры'}
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </span>
            </button>

            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">ФФ (руб)</label>
                    <input
                      type="number"
                      value={form.fulfillmentFixed}
                      onChange={(e) => setForm({ ...form, fulfillmentFixed: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Кросс-докинг (руб)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.crossDockFixed}
                      onChange={(e) => setForm({ ...form, crossDockFixed: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Налог % (УСН)</label>
                    <input
                      type="number"
                      value={form.taxPercent}
                      onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Посл. миля %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.lastMilePercent}
                      onChange={(e) => setForm({ ...form, lastMilePercent: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Эквайринг %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.acquiringPercent}
                      onChange={(e) => setForm({ ...form, acquiringPercent: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">План продаж (шт/мес)</label>
                    <input
                      type="number"
                      value={form.plannedSalesUnits}
                      onChange={(e) => setForm({ ...form, plannedSalesUnits: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-400 mb-1">Комиссия ≤300 ₽ (%)</label>
                    <input
                      type="number"
                      value={form.commissionUnder300}
                      onChange={(e) => setForm({ ...form, commissionUnder300: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Комиссия &gt;300 ₽ (%)</label>
                    <input
                      type="number"
                      value={form.commissionOver300}
                      onChange={(e) => setForm({ ...form, commissionOver300: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 font-mono bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Save Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="flex-1 py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              <Save className="w-4 h-4" /> Сохранить изменения в каталог
            </button>
            <button
              onClick={handleSaveNew}
              className="py-3 px-4 bg-[#141b2b] hover:bg-[#1a2338] text-white font-medium border border-white/[0.08] rounded-xl text-xs transition-all cursor-pointer shadow-sm"
            >
              Сохранить как копию
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: LIVE METRICS & WATERFALL */}
        <div className="lg:col-span-5 space-y-6">

          {/* Main Profit Card */}
          <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Чистая прибыль с 1 шт:</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                calc.status === 'profitable'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : calc.status === 'marginal'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              }`}>
                {calc.status === 'profitable' ? 'Прибыльный' : calc.status === 'marginal' ? 'Низкая маржа' : 'Убыточный'}
              </span>
            </div>

            <div className="flex items-baseline justify-between border-b border-white/[0.06] pb-4">
              <div className={`text-4xl font-extrabold font-mono tracking-tight tabular-nums ${
                calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatCurrency(calc.netProfitPerUnit)}
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Выручка 1 шт:</span>
                <span className="font-mono text-base text-white font-bold">{formatCurrency(calc.retailPrice)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[#080b11] rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 block mb-0.5">Маржинальность:</span>
                <span className={`text-xl font-bold font-mono tabular-nums ${
                  calc.marginPercent >= 20 ? 'text-emerald-400' : calc.marginPercent >= 10 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formatPercent(calc.marginPercent)}
                </span>
              </div>
              <div className="p-3.5 bg-[#080b11] rounded-xl border border-white/[0.06]">
                <span className="text-slate-400 block mb-0.5">Рентабельность ROI:</span>
                <span className={`text-xl font-bold font-mono tabular-nums ${
                  calc.roiPercent >= 25 ? 'text-emerald-400' : calc.roiPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {formatPercent(calc.roiPercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Cost Cascade (Waterfall) */}
          <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-6 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Каскад выручки: куда уходят деньги</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">+{formatCurrency(calc.retailPrice)}</span>
            </div>

            {/* Visual stacked bar */}
            <div className="h-4 w-full rounded-lg overflow-hidden flex bg-[#080b11] border border-white/[0.08]">
              <div style={{ width: `${pctCogs}%` }} className="bg-blue-500" title={`Закупка: ${formatCurrency(calc.cogs)}`} />
              <div style={{ width: `${pctLogistics}%` }} className="bg-amber-500" title={`Логистика: ${formatCurrency(calc.totalLogisticsRub)}`} />
              <div style={{ width: `${pctCommission}%` }} className="bg-purple-500" title={`Комиссия: ${formatCurrency(calc.commissionRub)}`} />
              <div style={{ width: `${pctAds}%` }} className="bg-pink-500" title={`Реклама: ${formatCurrency(calc.adSpendRub)}`} />
              <div style={{ width: `${pctFulfillment}%` }} className="bg-teal-500" title={`ФФ/кросс-док: ${formatCurrency(calc.fulfillmentRub + calc.crossDockRub)}`} />
              <div style={{ width: `${pctTax}%` }} className="bg-slate-500" title={`Налог: ${formatCurrency(calc.taxRub + calc.forceMajeureRub)}`} />
              {pctProfit > 0 && (
                <div style={{ width: `${pctProfit}%` }} className="bg-emerald-400" title={`Прибыль: ${formatCurrency(calc.netProfitPerUnit)}`} />
              )}
            </div>

            {/* Cascade list */}
            <div className="space-y-2.5 text-xs pt-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  − Закупка товара (COGS):
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.cogs)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  − Логистика Ozon (тариф {calc.baseLogisticsTariff}₽ + миля + экв.):
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.totalLogisticsRub)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  − Комиссия маркетплейса ({calc.appliedCommissionPercent}%):
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.commissionRub)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  − Рекламный бюджет ({form.adSpendPercent}% ДРР):
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.adSpendRub)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  − Фулфилмент и кросс-докинг:
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.fulfillmentRub + calc.crossDockRub)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  − Налог УСН ({form.taxPercent}% от реализации {formatCurrency(calc.taxPrice)}) + резерв (1%):
                </span>
                <span className="font-mono tabular-nums text-rose-300 font-medium">−{formatCurrency(calc.taxRub + calc.forceMajeureRub)}</span>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between font-bold text-sm">
                <span className="text-white">= Чистый остаток вам:</span>
                <span className={`font-mono text-base tabular-nums ${calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(calc.netProfitPerUnit)}
                </span>
              </div>
            </div>
          </div>

          {/* Strategic Safety Limits */}
          <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl p-6 space-y-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Пороги безопасности для маркетинга и цен
            </h3>

            {/* Break-even */}
            <div className="p-3.5 bg-[#080b11] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Точка безубыточности</div>
                <div className="text-[11px] text-slate-400">Минимальная цена продажи в ноль</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono tabular-nums text-amber-400">
                  {formatCurrency(calc.breakEvenPrice)}
                </div>
                <div className="text-[11px] text-slate-400">
                  макс. скидка: {formatPercent(calc.maxDiscountPercent)}
                </div>
              </div>
            </div>

            {/* Max Allowable Ad Percent */}
            <div className="p-3.5 bg-[#080b11] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Предельный % рекламы</div>
                <div className="text-[11px] text-slate-400">Максимальный ДРР до ухода в минус</div>
              </div>
              <div className="text-right">
                <div className="text-base font-bold font-mono tabular-nums text-pink-400">
                  {formatPercent(calc.maxAllowableAdPercent)}
                </div>
                <div className="text-[11px] text-slate-400">
                  до {formatCurrency(maxAllowableCPO)} на заказ
                </div>
              </div>
            </div>

            {/* Monthly projection */}
            <div className="p-3.5 bg-[#080b11] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">План на месяц ({form.plannedSalesUnits} шт)</div>
                <div className="text-[11px] text-slate-400">
                  Выручка: {formatCurrency(calc.monthlyRevenue)}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-base font-bold font-mono tabular-nums ${
                  calc.monthlyNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {formatCurrency(calc.monthlyNetProfit)}
                </div>
                <div className="text-[11px] text-slate-400">чистая прибыль в месяц</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
