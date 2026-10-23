import React, { useState } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import {
  calculateUnitEconomics,
  formatCurrency,
  formatPercent,
  MARKETPLACE_PRESETS,
  STANDARD_WAREHOUSES,
  DEFAULT_WAREHOUSE_NAME,
} from '../utils/calculator';
import {
  Search,
  SlidersHorizontal,
  Calculator,
  Copy,
  Trash2,
  ArrowUpDown,
  Tag,
  DollarSign,
  Box,
  Percent,
  ChevronDown,
  ChevronUp,
  Info,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  X,
  Building2,
  Sparkles,
  Zap,
  Sliders,
  Check,
  RotateCcw,
  Flame,
} from 'lucide-react';

interface ProductTableProps {
  products: ProductUnitData[];
  onUpdateProduct: (product: ProductUnitData) => void;
  onDeleteProduct: (id: string) => void;
  onDuplicateProduct: (product: ProductUnitData) => void;
  onSelectForDeepDive: (product: ProductUnitData) => void;
  onApplyPresetToAll: (presetId: string) => void;
  onUpdateWarehouseAll?: (warehouseName: string, warehouseType: 'FBO' | 'FBS') => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onUpdateProduct,
  onDeleteProduct,
  onDuplicateProduct,
  onSelectForDeepDive,
  onApplyPresetToAll,
  onUpdateWarehouseAll,
  activeFilter,
  setActiveFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'profit' | 'margin' | 'revenue' | 'price' | 'sku' | 'volume'>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [selectedWarehousePreset, setSelectedWarehousePreset] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [showFormulaGuide, setShowFormulaGuide] = useState<boolean>(false);

  // Динамические виджеты: Live-симулятор сценариев цен и ДРР
  const [simPriceDelta, setSimPriceDelta] = useState<number>(0);
  const [simDrrDelta, setSimDrrDelta] = useState<number>(0);
  const [isSimSuccess, setIsSimSuccess] = useState<string>('');

  // 4 Primary interactive fields requested by user
  const handlePriceChange = (product: ProductUnitData, newPrice: number) => {
    onUpdateProduct({
      ...product,
      retailPrice: Math.max(0, newPrice),
    });
  };

  const handleTaxPriceChange = (product: ProductUnitData, newTaxPrice: number) => {
    onUpdateProduct({
      ...product,
      taxPrice: Math.max(0, newTaxPrice),
    });
  };

  const handleCogsChange = (product: ProductUnitData, newCogs: number) => {
    onUpdateProduct({
      ...product,
      cogs: Math.max(0, newCogs),
    });
  };

  const handleVolumeChange = (product: ProductUnitData, newVolume: number) => {
    onUpdateProduct({
      ...product,
      volumeLiters: Math.max(0.01, newVolume),
    });
  };

  const handleAdSpendChange = (product: ProductUnitData, newAdSpend: number) => {
    onUpdateProduct({
      ...product,
      adSpendPercent: Math.max(0, Math.min(100, newAdSpend)),
    });
  };

  // Показатели для динамических виджетов
  const under300Count = products.filter((p) => p.retailPrice <= 300).length;
  const over300Count = products.filter((p) => p.retailPrice > 300).length;
  const cliffCount = products.filter((p) => p.retailPrice > 300 && p.retailPrice <= 350).length;
  const highDrrCount = products.filter((p) => p.adSpendPercent >= 18).length;
  const microVolumeCount = products.filter((p) => p.volumeLiters <= 0.1).length;

  // Расчет динамической дельты симулятора (What-if)
  const currentTotalMonthlyProfit = products.reduce((acc, p) => acc + calculateUnitEconomics(p).monthlyNetProfit, 0);
  const simulatedTotalMonthlyProfit = products.reduce((acc, p) => {
    const simPrice = Math.max(10, p.retailPrice + simPriceDelta);
    const simDrr = Math.max(0, Math.min(100, p.adSpendPercent + simDrrDelta));
    return (
      acc +
      calculateUnitEconomics({
        ...p,
        retailPrice: simPrice,
        adSpendPercent: simDrr,
      }).monthlyNetProfit
    );
  }, 0);
  const profitDelta = simulatedTotalMonthlyProfit - currentTotalMonthlyProfit;

  const handleApplySimulation = () => {
    if (simPriceDelta === 0 && simDrrDelta === 0) return;
    products.forEach((p) => {
      onUpdateProduct({
        ...p,
        retailPrice: Math.max(10, p.retailPrice + simPriceDelta),
        adSpendPercent: Math.max(0, Math.min(100, p.adSpendPercent + simDrrDelta)),
      });
    });
    setIsSimSuccess(`Сценарий успешно применен ко всем ${products.length} товарам!`);
    setSimPriceDelta(0);
    setSimDrrDelta(0);
    setTimeout(() => setIsSimSuccess(''), 3500);
  };

  const handleResetSimulation = () => {
    setSimPriceDelta(0);
    setSimDrrDelta(0);
  };

  // Filter and sort items
  const filteredProducts = products.filter((prod) => {
    const calc = calculateUnitEconomics(prod);
    
    // Status filter
    if (activeFilter === 'loss' && calc.status !== 'loss') return false;
    if (activeFilter === 'marginal' && calc.status !== 'marginal') return false;
    if (activeFilter === 'profitable' && calc.status !== 'profitable') return false;
    if (activeFilter === 'cliff' && !(prod.retailPrice > 300 && prod.retailPrice <= 350)) return false;
    if (activeFilter === 'under_300' && !(prod.retailPrice <= 300)) return false;
    if (activeFilter === 'micro_volume' && !(prod.volumeLiters <= 0.1)) return false;
    if (activeFilter === 'high_drr' && !(prod.adSpendPercent >= 18)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSku = prod.sku.toLowerCase().includes(q);
      const matchTitle = prod.title.toLowerCase().includes(q);
      const matchCategory = prod.category?.toLowerCase().includes(q) || false;
      return matchSku || matchTitle || matchCategory;
    }

    return true;
  });

  // Sort
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const calcA = calculateUnitEconomics(a);
    const calcB = calculateUnitEconomics(b);

    let comp = 0;
    if (sortBy === 'profit') comp = calcA.netProfitPerUnit - calcB.netProfitPerUnit;
    else if (sortBy === 'margin') comp = calcA.marginPercent - calcB.marginPercent;
    else if (sortBy === 'revenue') comp = calcA.monthlyRevenue - calcB.monthlyRevenue;
    else if (sortBy === 'price') comp = calcA.retailPrice - calcB.retailPrice;
    else if (sortBy === 'volume') comp = (a.volumeLiters || 0) - (b.volumeLiters || 0);
    else if (sortBy === 'sku') comp = a.sku.localeCompare(b.sku);

    return sortOrder === 'desc' ? -comp : comp;
  });

  const toggleSort = (field: 'profit' | 'margin' | 'revenue' | 'price' | 'sku' | 'volume') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* High-Tech Flow Guide (Uptic Style) */}
      {showFormulaGuide && (
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] relative overflow-hidden transition-all">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Цепочка расчета юнит-экономики единицы товара
              </h2>
            </div>
            <button
              onClick={() => setShowFormulaGuide(false)}
              className="text-[11px] text-slate-500 hover:text-slate-300 p-1 transition-colors cursor-pointer"
              title="Скрыть подсказку"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Visual Formula Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
            {/* Step 1: Retail Price */}
            <div className="p-3 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-0.5">
                <Tag className="w-3.5 h-3.5" />
                <span>1. Цена</span>
              </div>
              <div className="text-[11px] text-slate-300">Предельная Ozon</div>
              <div className="text-[10px] text-emerald-400/90 font-mono mt-1 font-medium">Ozon API / ввод</div>
            </div>

            {/* Step 2: Tax Realization Price */}
            <div className="p-3 rounded-lg bg-cyan-500/[0.07] border border-cyan-500/20">
              <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-0.5">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Реализация</span>
              </div>
              <div className="text-[11px] text-slate-300">База налога УСН</div>
              <div className="text-[10px] text-cyan-400/90 font-mono mt-1 font-medium">Ozon / ввод (₽)</div>
            </div>

            {/* Step 3: COGS */}
            <div className="p-3 rounded-lg bg-blue-500/[0.07] border border-blue-500/20">
              <div className="flex items-center gap-1.5 text-blue-300 font-semibold mb-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                <span>3. Закупка</span>
              </div>
              <div className="text-[11px] text-slate-300">Себестоимость</div>
              <div className="text-[10px] text-blue-400/90 font-mono mt-1 font-medium">Ввод селлера (₽)</div>
            </div>

            {/* Step 4: Volume */}
            <div className="p-3 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
              <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-0.5">
                <Box className="w-3.5 h-3.5" />
                <span>4. Литраж</span>
              </div>
              <div className="text-[11px] text-slate-300">Объем упаковки</div>
              <div className="text-[10px] text-amber-400/90 font-mono mt-1 font-medium">Ozon API / ввод</div>
            </div>

            {/* Step 5: Ad Spend */}
            <div className="p-3 rounded-lg bg-pink-500/[0.07] border border-pink-500/20">
              <div className="flex items-center gap-1.5 text-pink-300 font-semibold mb-0.5">
                <Percent className="w-3.5 h-3.5" />
                <span>5. Реклама</span>
              </div>
              <div className="text-[11px] text-slate-300">ДРР % на заказ</div>
              <div className="text-[10px] text-pink-400/90 font-mono mt-1 font-medium">Ввод селлера (%)</div>
            </div>

            {/* Step 6: Logistics & Comm */}
            <div className="p-3 rounded-lg bg-[#080b11] border border-white/[0.06]">
              <div className="text-slate-300 font-semibold mb-0.5">
                − Логистика и сбор
              </div>
              <div className="text-[11px] text-slate-400">Тариф Ozon + миля</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Регламент Ozon</div>
            </div>

            {/* Step 7: Fulfillment & Tax */}
            <div className="p-3 rounded-lg bg-[#080b11] border border-white/[0.06]">
              <div className="text-slate-300 font-semibold mb-0.5">
                − ФФ и налог
              </div>
              <div className="text-[11px] text-slate-400">УСН 11% / 6%</div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">Налоговый режим</div>
            </div>

            {/* Step 8: Net Profit */}
            <div className="p-3 rounded-lg bg-emerald-500/[0.12] border border-emerald-500/30">
              <div className="text-emerald-300 font-bold mb-0.5">
                = Прибыль ед.
              </div>
              <div className="text-[11px] text-white">Чистый доход</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-1 font-semibold">Юнит-экономика</div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Widgets Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Widget 1: Ozon 300 ₽ Radar & Ступени комиссий */}
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Радар Ozon 300 ₽</h3>
                <p className="text-[10px] text-slate-400">Льготная комиссия 23% vs полная 52%</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-300">
              {products.length} SKU
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2">
            <button
              onClick={() => setActiveFilter(activeFilter === 'under_300' ? 'all' : 'under_300')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeFilter === 'under_300'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-500/[0.06] border-emerald-500/20 text-slate-200 hover:bg-emerald-500/[0.12]'
              }`}
            >
              <div className="text-[10px] text-emerald-400/80 font-medium">Товары ≤ 300 ₽</div>
              <div className="text-base font-bold font-mono text-emerald-400">{under300Count} шт.</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Комиссия ~23%</div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'cliff' ? 'all' : 'cliff')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeFilter === 'cliff'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-amber-500/[0.06] border-amber-500/20 text-slate-200 hover:bg-amber-500/[0.12]'
              }`}
            >
              <div className="text-[10px] text-amber-400/80 font-medium">Зона обрыва 301–350₽</div>
              <div className="text-base font-bold font-mono text-amber-300 flex items-center gap-1">
                <span>{cliffCount} шт.</span>
                {cliffCount > 0 && <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">Комиссия скачет до 52%</div>
            </button>
          </div>

          {cliffCount > 0 ? (
            <div className="text-[10px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-md p-1.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>{cliffCount} товаров теряют до 87₽ маржи из-за цены чуть выше 300₽!</span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Товары &gt; 350 ₽: <b className="text-slate-200 font-mono">{products.filter((p) => p.retailPrice > 350).length} шт.</b></span>
              <span className="text-emerald-400">Ценовая сетка оптимальна</span>
            </div>
          )}
        </div>

        {/* Widget 2: Live What-if Simulator */}
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">What-If Симулятор</h3>
                <p className="text-[10px] text-slate-400">Мгновенный стресс-тест цен и рекламы</p>
              </div>
            </div>

            {(simPriceDelta !== 0 || simDrrDelta !== 0) && (
              <button
                onClick={handleResetSimulation}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                title="Сбросить изменения симулятора"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс</span>
              </button>
            )}
          </div>

          {/* Quick Sim Controls */}
          <div className="space-y-2 my-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Сдвиг цены:</span>
              <div className="flex items-center gap-1">
                {[-50, -20, 0, 20, 50, 100].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSimPriceDelta(d)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                      simPriceDelta === d
                        ? 'bg-blue-500 text-white font-bold'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    {d > 0 ? `+${d}` : d === 0 ? '0' : d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Сдвиг ДРР (%):</span>
              <div className="flex items-center gap-1">
                {[-5, -2, 0, 2, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setSimDrrDelta(d)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                      simDrrDelta === d
                        ? 'bg-pink-500 text-white font-bold'
                        : 'bg-white/[0.05] text-slate-300 hover:bg-white/[0.1]'
                    }`}
                  >
                    {d > 0 ? `+${d}%` : d === 0 ? '0%' : `${d}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Profit Impact Summary & Apply Button */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-slate-400">Итог чистой прибыли:</div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-white">
                  {formatCurrency(simulatedTotalMonthlyProfit)}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                    profitDelta > 0
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : profitDelta < 0
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {profitDelta > 0 ? '+' : ''}{formatCurrency(profitDelta)}
                </span>
              </div>
            </div>

            <button
              onClick={handleApplySimulation}
              disabled={simPriceDelta === 0 && simDrrDelta === 0}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                simPriceDelta === 0 && simDrrDelta === 0
                  ? 'bg-white/[0.06] text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>Применить</span>
            </button>
          </div>
          {isSimSuccess && (
            <div className="text-[10px] text-emerald-400 font-medium mt-1 animate-in fade-in">
              {isSimSuccess}
            </div>
          )}
        </div>

        {/* Widget 3: Logistics & Dimensions Analytics */}
        <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Габариты &amp; Литраж</h3>
                <p className="text-[10px] text-slate-400">Логистика FBO/FBS по объему коробки</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300">
              Среднее {(products.reduce((acc, p) => acc + (p.volumeLiters || 0), 0) / (products.length || 1)).toFixed(2)} л
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2">
            <button
              onClick={() => setActiveFilter(activeFilter === 'micro_volume' ? 'all' : 'micro_volume')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeFilter === 'micro_volume'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-medium">Мини-тара (&le; 0.1 л)</div>
              <div className="text-base font-bold font-mono text-amber-400">{microVolumeCount} шт.</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Базовый тариф 43.5 ₽</div>
            </button>

            <button
              onClick={() => setActiveFilter(activeFilter === 'high_drr' ? 'all' : 'high_drr')}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                activeFilter === 'high_drr'
                  ? 'bg-pink-500/20 border-pink-500/40 text-pink-300'
                  : 'bg-white/[0.03] border-white/[0.06] text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              <div className="text-[10px] text-slate-400 font-medium">Высокий ДРР (&ge; 18%)</div>
              <div className="text-base font-bold font-mono text-pink-400">{highDrrCount} шт.</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Тратит &gt;18% на рекламу</div>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Стандартный объем (&gt; 0.1 л): <b className="text-slate-200 font-mono">{products.length - microVolumeCount} шт.</b></span>
            <span className="text-slate-400">+15 ₽ за доп. литр</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_8px_30px_rgb(0_0_0_/_40%)]">
        {/* Control Toolbar */}
        <div className="p-4 border-b border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0a0f19]">
          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search bar */}
            <div className="relative min-w-[260px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по артикулу, названию или бренду..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#080b11] border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans"
              />
            </div>

            {/* Segmented Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#080b11] border border-white/[0.06] rounded-xl">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Все ({products.length})
              </button>
              <button
                onClick={() => setActiveFilter('profitable')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'profitable'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Прибыльные
              </button>
              <button
                onClick={() => setActiveFilter('marginal')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'marginal'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Маржа &lt; 12%
              </button>
              <button
                onClick={() => setActiveFilter('loss')}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === 'loss'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Убыточные
              </button>
            </div>
          </div>

          {/* Global Preset Applicator & Guide Toggle */}
          <div className="flex items-center gap-3">
            {!showFormulaGuide && (
              <button
                onClick={() => setShowFormulaGuide(true)}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Цепочка формул</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                Тарифы:
              </span>
              <select
                value={selectedPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPreset(val);
                  if (val) {
                    onApplyPresetToAll(val);
                    setSelectedPreset('');
                  }
                }}
                className="text-xs bg-[#080b11] border border-white/[0.08] text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="">Применить маркетплейс...</option>
                {MARKETPLACE_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Selector for all */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Склад:
              </span>
              <select
                value={selectedWarehousePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedWarehousePreset(val);
                  if (val && onUpdateWarehouseAll) {
                    const found = STANDARD_WAREHOUSES.find((w) => w.id === val);
                    if (found) {
                      onUpdateWarehouseAll(found.name, found.type);
                    }
                    setSelectedWarehousePreset('');
                  }
                }}
                className="text-xs bg-[#080b11] border border-white/[0.08] text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/60 cursor-pointer"
              >
                <option value="">Склад для всех позиций...</option>
                {STANDARD_WAREHOUSES.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* High-Density Spreadsheet Table with Grouped Column Headers */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Group Header Row */}
              <tr className="border-b border-white/[0.08] text-[10px] uppercase font-bold tracking-wider">
                <th colSpan={2} className="py-2.5 px-4 bg-[#080b11] text-slate-300 border-r border-white/[0.1] sticky left-0 z-30 shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  Товар (закреплен)
                </th>
                <th colSpan={5} className="py-2.5 px-3 bg-emerald-500/[0.08] text-emerald-400 text-center border-r border-emerald-500/20">
                  5 изменяемых параметров (ввод селлера)
                </th>
                <th colSpan={2} className="py-2.5 px-3 bg-[#080b11] text-slate-400 text-center border-r border-white/[0.06] hidden xl:table-cell">
                  Сборы Ozon и склад
                </th>
                <th colSpan={3} className="py-2.5 px-4 bg-[#080b11] text-slate-200 text-center">
                  Финансовый результат
                </th>
              </tr>

              {/* Specific Column Header Row */}
              <tr className="bg-[#0b101b] border-b border-white/[0.06] text-slate-400">
                {/* Expander col - STICKY */}
                <th className="py-3 px-2 w-10 min-w-[40px] max-w-[40px] text-center sticky left-0 z-30 bg-[#0b101b]" />

                {/* SKU & Title - STICKY */}
                <th className="py-3 px-3 font-semibold whitespace-nowrap border-r border-white/[0.1] sticky left-[40px] z-30 bg-[#0b101b] w-64 min-w-[240px] max-w-[260px] shadow-[4px_0_12px_rgba(0,0,0,0.5)]">
                  <button
                    onClick={() => toggleSort('sku')}
                    className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Артикул и наименование</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </button>
                </th>
                
                {/* 1. Предельная цена реализации */}
                <th className="py-3 px-3 font-bold text-emerald-400 whitespace-nowrap text-right bg-emerald-500/[0.05] border-r border-emerald-500/10">
                  <button
                    onClick={() => toggleSort('price')}
                    className="flex items-center justify-end gap-1 w-full hover:text-white transition-colors cursor-pointer"
                    title="Розничная цена продажи на Ozon (предельная)"
                  >
                    <span>1. Предельная цена (₽)</span>
                    <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                  </button>
                </th>

                {/* 2. Цена реализации для налога */}
                <th className="py-3 px-3 font-bold text-cyan-300 whitespace-nowrap text-right bg-cyan-500/[0.05] border-r border-cyan-500/10">
                  <span title="Цена реализации товара — база расчета налога УСН 11% (колонка E в Excel файле)">
                    2. Цена реализации (₽)
                  </span>
                </th>

                {/* 3. Закупка */}
                <th className="py-3 px-3 font-bold text-blue-300 whitespace-nowrap text-right bg-blue-500/[0.05] border-r border-blue-500/10">
                  <span title="Себестоимость единицы товара у поставщика">3. Закупка (₽)</span>
                </th>

                {/* 4. Литраж */}
                <th className="py-3 px-3 font-bold text-amber-300 whitespace-nowrap text-right bg-amber-500/[0.05] border-r border-amber-500/10">
                  <button
                    onClick={() => toggleSort('volume')}
                    className="flex items-center justify-end gap-1 w-full hover:text-white transition-colors cursor-pointer"
                    title="Объем упаковки в литрах"
                  >
                    <span>4. Литраж (л)</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-500" />
                  </button>
                </th>

                {/* 5. Процент рекламы */}
                <th className="py-3 px-3 font-bold text-pink-300 whitespace-nowrap text-right bg-pink-500/[0.05] border-r border-white/[0.06]">
                  <span title="Доля рекламных расходов (ДРР %) от цены реализации">5. Реклама (%)</span>
                </th>

                {/* Logistics */}
                <th className="py-3 px-3 font-medium whitespace-nowrap text-right hidden xl:table-cell border-r border-white/[0.06]">
                  <span title="Логистика по литражу + последняя миля 4.9% + эквайринг 1.5% + кросс-док">Логистика Итого</span>
                </th>

                {/* All expenses */}
                <th className="py-3 px-3 font-medium whitespace-nowrap text-right hidden xl:table-cell border-r border-white/[0.06]">
                  <span title="Все расходы суммарно: закупка + логистика + комиссия + реклама + налог + ФФ">Все расходы</span>
                </th>

                {/* Net profit per unit */}
                <th className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap text-right">
                  <button
                    onClick={() => toggleSort('profit')}
                    className="flex items-center justify-end gap-1 w-full hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Прибыль / 1 шт</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </button>
                </th>

                {/* Margin % */}
                <th className="py-3 px-3 font-bold text-slate-100 whitespace-nowrap text-right">
                  <button
                    onClick={() => toggleSort('margin')}
                    className="flex items-center justify-end gap-1 w-full hover:text-white transition-colors cursor-pointer"
                  >
                    <span>Маржа %</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </button>
                </th>

                {/* Break-even Price */}
                <th className="py-3 px-3 font-medium whitespace-nowrap text-right hidden md:table-cell border-r border-white/[0.06]">
                  <span title="Минимальная цена, ниже которой товар продается в убыток">Безубыток (₽)</span>
                </th>

                {/* Action buttons */}
                <th className="py-3 px-3 font-medium text-center whitespace-nowrap">
                  <span>Действия</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    По вашему запросу товаров не найдено
                  </td>
                </tr>
              ) : (
                sortedProducts.map((prod) => {
                  const calc = calculateUnitEconomics(prod);
                  const isExpanded = expandedRowId === prod.id;

                  return (
                    <React.Fragment key={prod.id}>
                      <tr
                        className={`group hover:bg-white/[0.03] transition-colors ${
                          calc.status === 'loss' ? 'bg-rose-950/[0.12]' : ''
                        } ${isExpanded ? 'bg-white/[0.02]' : ''}`}
                      >
                        {/* Toggle expand chevron - STICKY */}
                        <td
                          className={`py-2.5 px-2 text-center sticky left-0 z-20 w-10 min-w-[40px] max-w-[40px] transition-colors ${
                            calc.status === 'loss'
                              ? 'bg-[#180f19] group-hover:bg-[#201524]'
                              : isExpanded
                              ? 'bg-[#121927] group-hover:bg-[#162032]'
                              : 'bg-[#0e1420] group-hover:bg-[#141d2f]'
                          }`}
                        >
                          <button
                            onClick={() => setExpandedRowId(isExpanded ? null : prod.id)}
                            className="p-1 text-slate-500 hover:text-slate-200 rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
                            title={isExpanded ? 'Свернуть детализацию' : 'Раскрыть подробную структуру расходов'}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        {/* Item Details - STICKY */}
                        <td
                          className={`py-2.5 px-3 w-64 min-w-[240px] max-w-[260px] border-r border-white/[0.1] sticky left-[40px] z-20 shadow-[4px_0_12px_rgba(0,0,0,0.5)] transition-colors ${
                            calc.status === 'loss'
                              ? 'bg-[#180f19] group-hover:bg-[#201524]'
                              : isExpanded
                              ? 'bg-[#121927] group-hover:bg-[#162032]'
                              : 'bg-[#0e1420] group-hover:bg-[#141d2f]'
                          }`}
                        >
                          <div className="font-medium text-white truncate" title={prod.title}>
                            {prod.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-slate-400 font-semibold">{prod.sku}</span>
                            {prod.barcode && (
                              <span className="text-[10px] font-mono text-slate-400 bg-white/[0.04] px-1 py-0.2 rounded" title="Штрихкод Ozon">
                                {prod.barcode}
                              </span>
                            )}
                            {prod.category && (
                              <span className="truncate max-w-[85px] text-slate-500">{prod.category}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                prod.warehouseType === 'FBS'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                              }`}
                              title={`Склад отгрузки: ${calc.warehouse}`}
                            >
                              <Building2 className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[130px]">{calc.warehouse}</span>
                            </span>
                            {prod.dimensions && prod.dimensions.depth > 0 && (
                              <span
                                className="text-[10px] font-mono text-slate-400"
                                title={`Габариты упаковки: ${prod.dimensions.depth}×${prod.dimensions.width}×${prod.dimensions.height} ${prod.dimensions.unit}, вес ${prod.dimensions.weight}г`}
                              >
                                {prod.dimensions.depth}&times;{prod.dimensions.width}&times;{prod.dimensions.height}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 1. Предельная цена реализации (Input) */}
                        <td className="py-2.5 px-3 text-right bg-emerald-500/[0.02] border-r border-emerald-500/10">
                          <div className="inline-flex items-center justify-end relative">
                            <input
                              type="number"
                              step="10"
                              min="0"
                              value={prod.retailPrice}
                              onChange={(e) => handlePriceChange(prod, Number(e.target.value))}
                              className="w-24 pl-2 pr-5 py-1 text-right font-mono tabular-nums text-xs font-bold bg-[#080b11] border border-emerald-500/40 hover:border-emerald-500 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 rounded-lg text-emerald-300 focus:outline-none transition-all"
                              title="Предельная цена реализации"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-emerald-500/70 pointer-events-none">
                              ₽
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {prod.retailPrice <= 300 ? 'ком. 23%' : 'ком. 52%'}
                          </div>
                        </td>

                        {/* 2. Цена реализации для налога (Input) */}
                        <td className="py-2.5 px-3 text-right bg-cyan-500/[0.02] border-r border-cyan-500/10">
                          <div className="inline-flex items-center justify-end relative">
                            <input
                              type="number"
                              step="5"
                              min="0"
                              value={prod.taxPrice ?? prod.retailPrice}
                              onChange={(e) => handleTaxPriceChange(prod, Number(e.target.value))}
                              className="w-24 pl-2 pr-5 py-1 text-right font-mono tabular-nums text-xs font-semibold bg-[#080b11] border border-cyan-500/40 hover:border-cyan-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-lg text-cyan-300 focus:outline-none transition-all"
                              title="Цена реализации для налога (колонка E в Excel, база для УСН)"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-400/70 pointer-events-none">
                              ₽
                            </span>
                          </div>
                          <div className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                            налог: {formatCurrency(calc.taxRub)}
                          </div>
                        </td>

                        {/* 3. Закупка (Input) */}
                        <td className="py-2.5 px-3 text-right bg-blue-500/[0.02] border-r border-blue-500/10">
                          <div className="inline-flex items-center justify-end relative">
                            <input
                              type="number"
                              step="5"
                              min="0"
                              value={prod.cogs}
                              onChange={(e) => handleCogsChange(prod, Number(e.target.value))}
                              className="w-20 pl-2 pr-5 py-1 text-right font-mono tabular-nums text-xs font-semibold bg-[#080b11] border border-blue-500/40 hover:border-blue-500 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30 rounded-lg text-slate-200 focus:outline-none transition-all"
                              title="Закупка (себестоимость товара)"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-blue-400/70 pointer-events-none">
                              ₽
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {((calc.cogs / (calc.retailPrice || 1)) * 100).toFixed(0)}% от цены
                          </div>
                        </td>

                        {/* 4. Литраж (Input) */}
                        <td className="py-2.5 px-3 text-right bg-amber-500/[0.02] border-r border-amber-500/10">
                          <div className="inline-flex items-center justify-end relative">
                            <input
                              type="number"
                              step="0.05"
                              min="0.01"
                              value={prod.volumeLiters}
                              onChange={(e) => handleVolumeChange(prod, Number(e.target.value))}
                              className="w-18 pl-2 pr-5 py-1 text-right font-mono tabular-nums text-xs font-semibold bg-[#080b11] border border-amber-500/40 hover:border-amber-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-lg text-amber-300 focus:outline-none transition-all"
                              title="Литраж упаковки"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-amber-500/70 pointer-events-none">
                              л
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            тариф {calc.baseLogisticsTariff}₽
                          </div>
                        </td>

                        {/* 5. Процент рекламы (Input) */}
                        <td className="py-2.5 px-3 text-right bg-pink-500/[0.02] border-r border-white/[0.06]">
                          <div className="inline-flex items-center justify-end relative">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={prod.adSpendPercent}
                              onChange={(e) => handleAdSpendChange(prod, Number(e.target.value))}
                              className="w-18 pl-2 pr-5 py-1 text-right font-mono tabular-nums text-xs font-semibold bg-[#080b11] border border-pink-500/40 hover:border-pink-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400/30 rounded-lg text-pink-300 focus:outline-none transition-all"
                              title="Процент рекламы (ДРР %)"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-pink-400/70 pointer-events-none">
                              %
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {formatCurrency(calc.adSpendRub)}
                          </div>
                        </td>

                        {/* Calculated Logistics */}
                        <td className="py-2.5 px-3 text-right hidden xl:table-cell font-mono tabular-nums text-slate-300 border-r border-white/[0.06]">
                          <div className="font-semibold">{formatCurrency(calc.totalLogisticsRub)}</div>
                          <div className="text-[10px] text-slate-500">
                            база {calc.baseLogisticsTariff}₽ + миля/экв
                          </div>
                        </td>

                        {/* Total Expenses */}
                        <td className="py-2.5 px-3 text-right hidden xl:table-cell font-mono tabular-nums text-slate-300 border-r border-white/[0.06]">
                          <div className="font-medium text-rose-300/90">{formatCurrency(calc.totalExpensesRub)}</div>
                          <div className="text-[10px] text-slate-500">
                            комиссия {formatCurrency(calc.commissionRub)}
                          </div>
                        </td>

                        {/* Net Profit per Unit */}
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                          <span className={`text-sm ${calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(calc.netProfitPerUnit)}
                          </span>
                        </td>

                        {/* Margin % */}
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                          <span
                            className={
                              calc.marginPercent >= 20
                                ? 'text-emerald-400'
                                : calc.marginPercent >= 10
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }
                          >
                            {formatPercent(calc.marginPercent)}
                          </span>
                          <div className="text-[10px] text-slate-500 font-normal">
                            ROI: {formatPercent(calc.roiPercent)}
                          </div>
                        </td>

                        {/* Break-even Price */}
                        <td className="py-2.5 px-3 text-right hidden md:table-cell font-mono tabular-nums text-slate-300 border-r border-white/[0.06]">
                          <div className="font-medium">{formatCurrency(calc.breakEvenPrice)}</div>
                          <div className="text-[10px] text-slate-500">
                            макс. ДРР {formatPercent(calc.maxAllowableAdPercent)}
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onSelectForDeepDive(prod)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                              title="Открыть экспресс-калькулятор для этой позиции"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDuplicateProduct(prod)}
                              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                              title="Дублировать строку"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteProduct(prod.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
                              title="Удалить товар"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Itemized Breakdown Card (Uptic-style cascade) */}
                      {isExpanded && (
                        <tr className="bg-[#080b11]/80 border-b border-white/[0.08]">
                          <td colSpan={13} className="p-4">
                            <div className="sticky left-0 max-w-[calc(100vw-3.5rem)] lg:max-w-7xl bg-[#0e1420] border border-white/[0.08] rounded-xl p-4.5 space-y-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                                <div className="flex items-center gap-2">
                                  <Info className="w-4 h-4 text-emerald-400" />
                                  <span className="font-semibold text-white text-xs">
                                    Полная калькуляция на 1 шт: куда уходит выручка с товара {prod.title}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                  <span>Выручка: <strong className="text-emerald-400 font-mono">{formatCurrency(calc.retailPrice)}</strong></span>
                                  <span className="text-slate-600" aria-hidden="true">·</span>
                                  <span>База налога: <strong className="text-cyan-400 font-mono">{formatCurrency(calc.taxPrice)}</strong></span>
                                  <span className="text-slate-600" aria-hidden="true">·</span>
                                  <span>Чистый остаток: <strong className={`font-mono ${calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(calc.netProfitPerUnit)}</strong></span>
                                </div>
                              </div>

                              {/* Breakdown Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">1. Закупка (COGS)</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.cogs)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {((calc.cogs / (calc.retailPrice || 1)) * 100).toFixed(1)}% от цены
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">2. Логистика (по литражу)</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.totalLogisticsRub)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {prod.volumeLiters}л (тариф {calc.baseLogisticsTariff}₽)
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">3. Комиссия маркетплейса</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.commissionRub)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {calc.appliedCommissionPercent}% от цены
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">4. Реклама (ДРР)</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.adSpendRub)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {prod.adSpendPercent}% от цены
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">5. Фулфилмент и кросс-док</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.fulfillmentRub + calc.crossDockRub)}</div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    ФФ {calc.fulfillmentRub}₽ + кросс-док {calc.crossDockRub}₽
                                  </div>
                                </div>

                                <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06]">
                                  <div className="text-slate-400 text-[11px] mb-1">6. Налог УСН + резерв</div>
                                  <div className="font-mono font-bold text-white text-sm">{formatCurrency(calc.taxRub + calc.forceMajeureRub)}</div>
                                  <div className="text-[10px] text-cyan-400/90 mt-1 font-mono">
                                    УСН {prod.taxPercent}% от {formatCurrency(calc.taxPrice)}: {formatCurrency(calc.taxRub)}
                                  </div>
                                </div>
                              </div>

                              {/* Warehouse & Official Ozon Logistics Details Bar */}
                              <div className="p-3 rounded-xl bg-[#080b11] border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>Склад: {calc.warehouse} ({calc.warehouseType})</span>
                                  </span>
                                  <span className="text-slate-600">&middot;</span>
                                  <span className="text-slate-300">
                                    Тариф логистики ({prod.volumeLiters}л): <strong className="text-white font-mono">{calc.baseLogisticsTariff} ₽</strong>
                                  </span>
                                  <span className="text-slate-600">&middot;</span>
                                  <span className="text-slate-300">
                                    Последняя миля (4.9%): <strong className="text-white font-mono">{formatCurrency(calc.lastMileRub)}</strong>
                                  </span>
                                  <span className="text-slate-600">&middot;</span>
                                  <span className="text-slate-300">
                                    Эквайринг (1.5%): <strong className="text-white font-mono">{formatCurrency(calc.acquiringRub)}</strong>
                                  </span>
                                  <span className="text-slate-600">&middot;</span>
                                  <span className="text-slate-300">
                                    Кросс-докинг: <strong className="text-white font-mono">{formatCurrency(calc.crossDockRub)}</strong>
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-slate-400">
                                  Суммарные сборы Ozon: <strong className="text-amber-400">{formatCurrency(calc.totalLogisticsRub + calc.commissionRub + calc.fulfillmentRub)}</strong>
                                </div>
                              </div>

                              {/* Ozon API Sources & Transparency Bar (when synced via API) */}
                              {prod.syncMeta && (
                                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] border-b border-blue-500/15 pb-1">
                                    <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                      Прозрачность источников Ozon API (Admin Read-Only)
                                    </span>
                                    {prod.syncMeta.lastSyncDate && (
                                      <span className="text-slate-400 font-mono text-[10px]">
                                        Обновлено: {new Date(prod.syncMeta.lastSyncDate).toLocaleTimeString('ru-RU')}
                                      </span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
                                    <div className="p-1.5 rounded bg-black/30 border border-white/[0.04]">
                                      <span className="text-slate-400 block text-[10px]">1. Предельная цена:</span>
                                      <span className="font-mono text-emerald-400 font-medium">{prod.retailPrice} ₽</span>
                                      <div className="text-[9px] text-slate-500 truncate" title={prod.syncMeta.limitPriceMeta?.message}>
                                        {prod.syncMeta.limitPriceMeta?.fieldUsed || 'price.min_price'} ({prod.syncMeta.limitPriceMeta?.status === 'synced' ? 'min_price' : 'price'})
                                      </div>
                                    </div>
                                    <div className="p-1.5 rounded bg-black/30 border border-white/[0.04]">
                                      <span className="text-slate-400 block text-[10px]">2. Цена реализации:</span>
                                      <span className="font-mono text-cyan-300 font-medium">{prod.taxPrice} ₽</span>
                                      <div className="text-[9px] text-slate-500 truncate" title={prod.syncMeta.realizationPriceMeta?.message}>
                                        {prod.syncMeta.realizationPriceMeta?.fieldUsed || 'marketing_seller_price'}
                                      </div>
                                    </div>
                                    <div className="p-1.5 rounded bg-black/30 border border-white/[0.04]">
                                      <span className="text-slate-400 block text-[10px]">3. Литраж товара:</span>
                                      <span className="font-mono text-amber-300 font-medium">
                                        {prod.contentVolume ? `${prod.contentVolume.raw} (${prod.volumeLiters} л)` : `${prod.volumeLiters} л`}
                                      </span>
                                      <div className="text-[9px] text-slate-500 truncate" title={prod.syncMeta.volumeMeta?.message}>
                                        {prod.syncMeta.volumeMeta?.status === 'synced' ? 'из характеристик' : 'по габаритам упаковки'}
                                      </div>
                                    </div>
                                    <div className="p-1.5 rounded bg-black/30 border border-white/[0.04]">
                                      <span className="text-slate-400 block text-[10px]">4. ДРР (реклама):</span>
                                      <span className="font-mono text-pink-300 font-medium">{prod.adSpendPercent}%</span>
                                      <div className="text-[9px] text-slate-500 truncate" title={prod.syncMeta.drrMeta?.message}>
                                        ручной ввод (Ozon Performance API)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Strategic Safety Alerts */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400 border-t border-white/[0.04]">
                                <div className="flex items-center gap-4">
                                  <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Точка безубыточности:
                                    <strong className="text-white font-mono ml-1">{formatCurrency(calc.breakEvenPrice)}</strong>
                                  </span>
                                  <span className="text-slate-600" aria-hidden="true">·</span>
                                  <span className="flex items-center gap-1.5 text-pink-400 font-medium">
                                    Предельный ДРР:
                                    <strong className="text-white font-mono ml-1">{formatPercent(calc.maxAllowableAdPercent)}</strong>
                                  </span>
                                </div>

                                <button
                                  onClick={() => onSelectForDeepDive(prod)}
                                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>Моделировать в экспресс-калькуляторе со слайдерами</span>
                                  <span>→</span>
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-3.5 bg-[#080b11] border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            Нажмите на стрелочку <span className="text-slate-300 font-bold">⌄</span> слева от товара, чтобы раскрыть подробную калькуляцию всех расходов.
          </div>
          <div className="font-mono tabular-nums text-slate-400">
            Показано строк: {sortedProducts.length} из {products.length}
          </div>
        </div>
      </div>
    </div>
  );
};
