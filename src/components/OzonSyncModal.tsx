import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Layers,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Calculator,
  Info,
  Sparkles,
  HelpCircle,
  Eye,
  Check,
  Building2,
  Box,
  Percent,
  Sliders,
  DollarSign,
  ArrowRight,
  TrendingUp,
  Server,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  OzonCredentials,
  getSavedOzonCredentials,
  saveOzonCredentials,
  clearOzonCredentials,
  testOzonConnection,
  fetchLiveOzonProducts,
  fetchOzonWarehouses,
  sanitizeCredential,
  OZON_OFFICIAL_CATEGORY_TARIFFS,
  OzonCategoryTariff,
  DEMO_OZON_LIVE_CATALOG,
  calculateOzonDimensionsLogistics,
  OzonWarehouse,
} from '../services/ozonApi';
import { ProductUnitData } from '../types/unitEconomics';
import {
  STANDARD_WAREHOUSES,
  DEFAULT_WAREHOUSE_NAME,
  calculateUnitEconomics,
  formatCurrency,
  formatPercent,
} from '../utils/calculator';
import { useOzonCategoryTariffs } from '../hooks/useOzonCategoryTariffs';

interface OzonSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProducts: ProductUnitData[];
  onImportProducts: (newItems: ProductUnitData[], mode: 'replace' | 'append') => void;
  onApplyTariffToAll: (tariff: OzonCategoryTariff) => void;
}

export const OzonSyncModal: React.FC<OzonSyncModalProps> = ({
  isOpen,
  onClose,
  currentProducts,
  onImportProducts,
  onApplyTariffToAll,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'preview' | 'tariffs' | 'dimensions'>('api');

  // Credentials
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [customProxyUrl, setCustomProxyUrl] = useState('');
  const [savedCreds, setSavedCreds] = useState<OzonCredentials | null>(null);

  // States
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ text: string; percent: number } | null>(null);
  const [showKeyInstructions, setShowKeyInstructions] = useState(false);
  const [showProxySettings, setShowProxySettings] = useState(false);
  const [proxyPingStatus, setProxyPingStatus] = useState<{
    loading?: boolean;
    ok?: boolean;
    message?: string;
  } | null>(null);

  // Warehouse selection
  const [selectedWarehouseName, setSelectedWarehouseName] = useState<string>(DEFAULT_WAREHOUSE_NAME);
  const [selectedWarehouseType, setSelectedWarehouseType] = useState<'FBO' | 'FBS'>('FBO');
  const [liveWarehouses, setLiveWarehouses] = useState<OzonWarehouse[]>([]);

  // Default values for editable parameters on new items
  const [defaultCogsPercent, setDefaultCogsPercent] = useState<number>(25);
  const [defaultTaxRatio, setDefaultTaxRatio] = useState<number>(1.0); // 1.0 = taxPrice equals retailPrice, 0.9 = 90%
  const [defaultAdSpend, setDefaultAdSpend] = useState<number>(16);

  // Preview products buffer before pushing into main table
  const [previewProducts, setPreviewProducts] = useState<ProductUnitData[]>([]);

  const [connectionStatus, setConnectionStatus] = useState<{
    success?: boolean;
    message?: string;
    sellerName?: string;
    totalProducts?: number;
    warehousesCount?: number;
  } | null>(null);

  const [syncSummary, setSyncSummary] = useState<{
    totalSynced: number;
    pricesUpdated: number;
    dimensionsUpdated: number;
    commissionsUpdated: number;
  } | null>(null);

  const [syncMode, setSyncMode] = useState<'append' | 'replace'>('append');

  // Selected category tariff
  const [selectedTariffId, setSelectedTariffId] = useState<string>('beauty_special');

  // Hook for category commissions and live tariffs from Ozon API endpoints
  const {
    tariffs: categoryTariffs,
    isLoadingTariffs,
    lastUpdated: tariffsLastUpdated,
    fetchLatestTariffs,
    applyCategoryCommissionsToProducts,
  } = useOzonCategoryTariffs();

  // Dimensions calculator
  const [dimLength, setDimLength] = useState<number>(10);
  const [dimWidth, setDimWidth] = useState<number>(6);
  const [dimHeight, setDimHeight] = useState<number>(4);
  const [dimPrice, setDimPrice] = useState<number>(550);

  useEffect(() => {
    const creds = getSavedOzonCredentials();
    if (creds) {
      setSavedCreds(creds);
      setClientId(creds.clientId || '');
      setApiKey(creds.apiKey || '');
      if (creds.customProxyUrl) {
        setCustomProxyUrl(creds.customProxyUrl);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle sanitized paste / change
  const handleClientIdChange = (val: string) => {
    setClientId(sanitizeCredential(val));
    setConnectionStatus(null);
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(sanitizeCredential(val));
    setConnectionStatus(null);
  };

  // Ping proxy test
  const handlePingProxy = async () => {
    setProxyPingStatus({ loading: true });
    try {
      const proxyBase = customProxyUrl.trim() || '/api/ozon';
      const res = await fetch(proxyBase);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok) {
        setProxyPingStatus({
          ok: true,
          message: `Прокси отвечает штатно (HTTP ${res.status}). Соединение с сервером установлено!`,
        });
      } else if (res.status === 404 && contentType.includes('text/html')) {
        setProxyPingStatus({
          ok: false,
          message: `Ошибка 404 (HTML): Маршрут ${proxyBase} не найден на хостинге. ` +
            `Для Vercel: отправьте файлы vercel.json и api/ozon/[...path].ts в ваш GitHub-репозиторий.`,
        });
      } else {
        setProxyPingStatus({
          ok: false,
          message: `Сервер вернул статус HTTP ${res.status}. Проверьте конфигурацию хостинга.`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setProxyPingStatus({
        ok: false,
        message: `Сетевая ошибка при проверке прокси: ${msg}`,
      });
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus(null);
    setSyncSummary(null);

    const cleanCId = sanitizeCredential(clientId);
    const cleanKey = sanitizeCredential(apiKey);
    const cleanProxy = customProxyUrl.trim() || undefined;

    try {
      const result = await testOzonConnection({
        clientId: cleanCId,
        apiKey: cleanKey,
        customProxyUrl: cleanProxy,
      });
      setConnectionStatus(result);

      if (result.success) {
        if (result.warehouses && result.warehouses.length > 0) {
          setLiveWarehouses(result.warehouses);
        }
        const updated: OzonCredentials = {
          clientId: cleanCId,
          apiKey: cleanKey,
          keyType: 'admin_read_only',
          lastSync: new Date().toISOString(),
          sellerName: result.sellerName,
          totalProducts: result.totalProducts,
          warehousesCount: result.warehousesCount,
          customProxyUrl: cleanProxy,
        };
        saveOzonCredentials(updated);
        setSavedCreds(updated);
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Live Sync from Ozon
  const handleLiveSync = async () => {
    setIsSyncing(true);
    setConnectionStatus(null);
    setSyncSummary(null);
    setSyncProgress({ text: 'Инициализация подключения к Ozon Seller API...', percent: 5 });

    const cleanCId = sanitizeCredential(clientId);
    const cleanKey = sanitizeCredential(apiKey);
    const cleanProxy = customProxyUrl.trim() || undefined;

    try {
      const res = await fetchLiveOzonProducts(
        { clientId: cleanCId, apiKey: cleanKey, customProxyUrl: cleanProxy },
        currentProducts,
        {
          selectedWarehouse: selectedWarehouseName,
          selectedWarehouseType: selectedWarehouseType,
          defaultCogsPercent: defaultCogsPercent,
          defaultTaxPriceRatio: defaultTaxRatio,
          defaultAdSpendPercent: defaultAdSpend,
        },
        (text, percent) => {
          setSyncProgress({ text, percent });
        }
      );

      setConnectionStatus({
        success: res.success,
        message: res.message,
      });

      if (res.warehouses && res.warehouses.length > 0) {
        setLiveWarehouses(res.warehouses);
      }

      if (res.success && res.products && res.products.length > 0) {
        // Automatically map category commission rates from Ozon tariff API endpoints to commissionUnder300 & commissionOver300
        const productsWithTariffs = applyCategoryCommissionsToProducts(res.products);
        setPreviewProducts(productsWithTariffs);
        if (res.stats) {
          setSyncSummary({
            totalSynced: productsWithTariffs.length,
            pricesUpdated: res.stats.pricesUpdated,
            dimensionsUpdated: res.stats.dimensionsUpdated,
            commissionsUpdated: res.stats.commissionsUpdated,
          });
        }
        setSavedCreds(getSavedOzonCredentials());
        setActiveTab('preview'); // Automatically open preview so user inspects all fields
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Demo sync (mock Ozon live store)
  const handleDemoSync = () => {
    const rawDemoItems = DEMO_OZON_LIVE_CATALOG.map((item) => ({
      ...item,
      warehouse: selectedWarehouseName,
      warehouseType: selectedWarehouseType,
    }));
    // Map official category tariffs automatically
    const demoItems = applyCategoryCommissionsToProducts(rawDemoItems);
    setPreviewProducts(demoItems);
    setConnectionStatus({
      success: true,
      message: `Успешно загружено ${demoItems.length} эталонных товаров Ozon (Красота и косметика) с актуальными ценами, реальными габаритами и рассчитанным литражом!`,
    });
    setSyncSummary({
      totalSynced: demoItems.length,
      pricesUpdated: demoItems.length,
      dimensionsUpdated: demoItems.length,
      commissionsUpdated: demoItems.length,
    });
    setActiveTab('preview');
  };

  // Apply preview items to main table
  const handleConfirmImport = () => {
    if (previewProducts.length === 0) return;
    onImportProducts(previewProducts, syncMode);
    onClose();
  };

  // Bulk update COGS in preview
  const handleBulkUpdateCogs = (percent: number) => {
    setPreviewProducts((prev) =>
      prev.map((p) => ({
        ...p,
        cogs: Math.round(p.retailPrice * (percent / 100)),
      }))
    );
  };

  // Bulk update Tax Price in preview
  const handleBulkUpdateTaxPrice = (ratio: number) => {
    setPreviewProducts((prev) =>
      prev.map((p) => ({
        ...p,
        taxPrice: Math.round(p.retailPrice * ratio),
      }))
    );
  };

  // Bulk update Warehouse in preview
  const handleBulkUpdateWarehouse = (whName: string, whType: 'FBO' | 'FBS') => {
    setSelectedWarehouseName(whName);
    setSelectedWarehouseType(whType);
    setPreviewProducts((prev) =>
      prev.map((p) => ({
        ...p,
        warehouse: whName,
        warehouseType: whType,
        crossDockFixed: whType === 'FBS' ? 0 : 1.63,
        fulfillmentFixed: whType === 'FBS' ? 30 : 10,
      }))
    );
  };

  // Update single preview product field
  const handleUpdatePreviewItem = (id: string, updates: Partial<ProductUnitData>) => {
    setPreviewProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  // Clear keys
  const handleClear = () => {
    clearOzonCredentials();
    setSavedCreds(null);
    setClientId('');
    setApiKey('');
    setConnectionStatus(null);
    setSyncSummary(null);
    setPreviewProducts([]);
  };

  // Apply selected category tariff
  const handleApplyTariff = () => {
    const tariff = categoryTariffs.find((t) => t.id === selectedTariffId) || categoryTariffs[0];
    if (!tariff) return;
    onApplyTariffToAll(tariff);
    setConnectionStatus({
      success: true,
      message: `Тариф «${tariff.name}» успешно применен ко всем ${currentProducts.length} товарам в вашей таблице!`,
    });
  };

  // Dimensions calculator result
  const calculatedDim = calculateOzonDimensionsLogistics(dimLength, dimWidth, dimHeight, dimPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#0c111c] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0e1524]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <RefreshCw className="w-5 h-5 text-blue-400 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Синхронизация с Ozon Seller API
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Read-Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Выгрузка товаров, всех изменяемых параметров (цены, себестоимость, литраж), сборов Ozon и склада
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 pt-2 border-b border-white/[0.06] bg-[#0c111c] gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'api'
                ? 'border-blue-400 text-blue-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>1. Подключение и склад</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'preview'
                ? 'border-emerald-400 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              2. Предпросмотр данных {previewProducts.length > 0 && `(${previewProducts.length})`}
            </span>
            {previewProducts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tariffs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tariffs'
                ? 'border-blue-400 text-blue-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Сетка сборов Ozon (2025)</span>
          </button>

          <button
            onClick={() => setActiveTab('dimensions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dimensions'
                ? 'border-blue-400 text-blue-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>4. Калькулятор габаритов</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Status banner */}
          {connectionStatus && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 animate-in fade-in text-xs ${
                connectionStatus.success
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
              }`}
            >
              {connectionStatus.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="flex-1 space-y-1">
                <div className="font-medium leading-relaxed">{connectionStatus.message}</div>
                {connectionStatus.success && connectionStatus.totalProducts !== undefined && (
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-emerald-400/90 font-mono">
                    <span className="flex items-center gap-1">
                      <Box className="w-3.5 h-3.5" />
                      Позиций в каталоге: <b>{connectionStatus.totalProducts}</b>
                    </span>
                    {connectionStatus.warehousesCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        Складов продавца: <b>{connectionStatus.warehousesCount}</b>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Режим: <b>Admin Read-Only (Безопасно)</b>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: API CONNECTION & WAREHOUSE CONFIG */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Security & Key Type Info Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#0e172a] to-emerald-950/20 border border-blue-500/25 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-white">
                      Поддерживается тип ключа: «Администратор (только чтение)» / Admin Read-Only
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                    100% Безопасно
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ключ типа <b className="text-white">«Администратор (только чтение)»</b> имеет полные права на чтение:
                  списка товаров, наименований, штрихкодов, физических габаритов упаковки (длина, ширина, высота, вес),
                  автоматического пересчета объема в литрах, цен реализации, официальных ставок комиссий Ozon FBO/FBS и списка складов.
                </p>

                {/* Collapsible Instructions */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    onClick={() => setShowKeyInstructions(!showKeyInstructions)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showKeyInstructions ? 'Скрыть инструкцию по созданию ключа' : 'Инструкция: как создать ключ Admin Read-Only в Ozon Seller'}</span>
                  </button>

                  {showKeyInstructions && (
                    <div className="mt-3 p-3.5 rounded-lg bg-black/40 border border-white/[0.08] text-xs text-slate-300 space-y-2 animate-in fade-in">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                        <span>Пошаговое получение ключа в Ozon Seller:</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300 pl-1 leading-relaxed">
                        <li>Откройте личный кабинет продавца <b>seller.ozon.ru</b></li>
                        <li>Перейдите в <b>Настройки</b> (шестерёнка в меню) → <b>API ключи</b></li>
                        <li>Нажмите кнопку <b>«Сгенерировать ключ»</b></li>
                        <li>В поле <b>«Роль»</b> обязательно выберите <b>«Администратор (только чтение)»</b> (Admin Read-Only)</li>
                        <li>Укажите название ключа (например, <i>Юнит-экономика</i>) и нажмите <b>«Сгенерировать»</b></li>
                        <li>Скопируйте <b>Client-Id</b> (числовой ID магазина) и <b>Api-Key</b> в поля ниже</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input fields */}
              <div className="p-4 rounded-xl bg-[#111827]/70 border border-white/[0.06] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-white">Данные доступа к Ozon API</span>
                  </div>
                  {savedCreds?.lastSync && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Синхронизировано: {new Date(savedCreds.lastSync).toLocaleString('ru-RU')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Client-Id (ID клиента Ozon)
                    </label>
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => handleClientIdChange(e.target.value)}
                      placeholder="Например: 1234567"
                      className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-blue-400 transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Числовой идентификатор магазина из раздела API ключи
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Api-Key (Ключ с ролью «Администратор только чтение»)
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-blue-400 transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Токен API с типом «Admin Read-Only»
                    </p>
                  </div>
                </div>

                {/* Warehouse & Parameters Presets */}
                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      Выбор склада отгрузки и параметров для выгружаемых товаров
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Warehouse dropdown */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Склад отгрузки (Ozon FBO / FBS):
                      </label>
                      <select
                        value={selectedWarehouseName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const foundStd = STANDARD_WAREHOUSES.find((w) => w.name === val);
                          if (foundStd) {
                            setSelectedWarehouseName(foundStd.name);
                            setSelectedWarehouseType(foundStd.type);
                          } else {
                            setSelectedWarehouseName(val);
                            setSelectedWarehouseType('FBS');
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#080c14] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-emerald-400 transition-colors cursor-pointer"
                      >
                        <optgroup label="Кластеры Ozon FBO (со склада маркетплейса)">
                          {STANDARD_WAREHOUSES.filter((w) => w.type === 'FBO').map((w) => (
                            <option key={w.id} value={w.name}>
                              {w.name}
                            </option>
                          ))}
                        </optgroup>
                        {liveWarehouses.length > 0 ? (
                          <optgroup label="Ваши активные склады FBS из Ozon API">
                            {liveWarehouses.map((lw) => (
                              <option key={lw.warehouse_id} value={lw.name}>
                                {lw.name} (FBS Ozon)
                              </option>
                            ))}
                          </optgroup>
                        ) : (
                          <optgroup label="Ozon FBS (со своего склада)">
                            <option value="Склад FBS продавца (Свой склад)">
                              Склад FBS продавца (Свой склад)
                            </option>
                          </optgroup>
                        )}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">
                        По умолчанию: {DEFAULT_WAREHOUSE_NAME} (из вашего Excel файла)
                      </p>
                    </div>

                    {/* Default COGS % for new items */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Себестоимость для новых товаров:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          max="80"
                          value={defaultCogsPercent}
                          onChange={(e) => setDefaultCogsPercent(Number(e.target.value))}
                          className="w-20 px-2.5 py-1.5 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white text-right focus:outline-none focus:border-emerald-400"
                        />
                        <span className="text-xs text-slate-400 font-mono">% от цены</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Для уже добавленных товаров себестоимость строго сохраняется!
                      </p>
                    </div>

                    {/* Default Tax Base ratio */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        База налога (цена реализации):
                      </label>
                      <select
                        value={defaultTaxRatio}
                        onChange={(e) => setDefaultTaxRatio(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-[#080c14] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                      >
                        <option value={1.0}>100% от розничной цены (E = D)</option>
                        <option value={0.9}>90% от розничной цены (с учетом скидок Ozon)</option>
                        <option value={0.85}>85% от розничной цены</option>
                      </select>
                      <p className="text-[10px] text-cyan-400/80 mt-1">
                        Колонка E в Excel, от которой рассчитывается налог 11%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    <span>
                      Ключи сохраняются локально в вашем браузере. Выгрузка доступна по клику ниже.
                    </span>
                  </div>
                  {savedCreds && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Сбросить сохраненные ключи
                    </button>
                  )}
                </div>
              </div>

              {/* Proxy Settings / Vercel Host Diagnostics */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowProxySettings(!showProxySettings)}
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">
                      Настройки прокси API (Vercel Serverless / Локально)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono border border-emerald-500/30">
                      /api/ozon активен
                    </span>
                  </div>
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {showProxySettings ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {showProxySettings ? (
                  <div className="pt-2 border-t border-white/[0.06] space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Для обхода CORS в браузере запросы к Ozon Seller API идут через серверный прокси.
                      В проекте настроена Vercel Serverless Function (папка <code className="text-emerald-300 font-mono">api/ozon/</code> и файл <code className="text-emerald-300 font-mono">vercel.json</code>).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Кастомный базовый URL прокси (по умолчанию: /api/ozon):
                        </label>
                        <input
                          type="text"
                          value={customProxyUrl}
                          onChange={(e) => {
                            setCustomProxyUrl(e.target.value);
                            setProxyPingStatus(null);
                          }}
                          placeholder="/api/ozon или https://ваш-домен.vercel.app/api/ozon"
                          className="w-full px-3 py-1.5 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={handlePingProxy}
                          disabled={proxyPingStatus?.loading}
                          className="w-full px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Zap className={`w-3.5 h-3.5 ${proxyPingStatus?.loading ? 'animate-spin' : ''}`} />
                          <span>{proxyPingStatus?.loading ? 'Проверка...' : 'Проверить прокси'}</span>
                        </button>
                      </div>
                    </div>

                    {proxyPingStatus && (
                      <div
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          proxyPingStatus.ok
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {proxyPingStatus.ok ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        )}
                        <span className="leading-relaxed">{proxyPingStatus.message}</span>
                      </div>
                    )}

                    <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-200/90 space-y-1">
                      <div className="font-semibold text-blue-300 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" />
                        Инструкция для хостинга Vercel:
                      </div>
                      <p>
                        Чтобы на Vercel не возникало ошибки 404, убедитесь, что в репозиторий GitHub отправлены созданные файлы:
                      </p>
                      <ul className="list-disc list-inside font-mono text-[10px] text-slate-300 space-y-0.5 pl-1">
                        <li>vercel.json (правила маршрутизации)</li>
                        <li>api/ozon/[...path].ts (Node.js прокси-функция)</li>
                        <li>api/ozon/index.ts (обработчик корневого пути)</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Базовый адрес: <code className="font-mono text-emerald-400">{customProxyUrl.trim() || '/api/ozon'}</code> (Vercel Serverless)</span>
                    <button
                      type="button"
                      onClick={() => setShowProxySettings(true)}
                      className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer text-[11px]"
                    >
                      Настроить / проверить
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Bar (during live sync) */}
              {isSyncing && syncProgress && (
                <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-200 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      {syncProgress.text}
                    </span>
                    <span className="font-mono font-bold text-blue-400">{syncProgress.percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_10px_#3b82f6]"
                      style={{ width: `${syncProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Mode switch & Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="text-xs text-slate-300">
                  <span className="font-medium text-white block">Режим импорта товаров:</span>
                  <span className="text-slate-400 text-[11px]">
                    {syncMode === 'append'
                      ? 'Добавить новые артикулы к текущей таблице'
                      : 'Полностью заменить таблицу товарами из Ozon'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSyncMode('append')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      syncMode === 'append'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }`}
                  >
                    Дополнить (+добавить)
                  </button>
                  <button
                    onClick={() => setSyncMode('replace')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      syncMode === 'replace'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-white/[0.04] text-slate-400 hover:text-white'
                    }`}
                  >
                    Заменить таблицу
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || isSyncing || !clientId.trim() || !apiKey.trim()}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/[0.12] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isTesting ? 'Проверка прав ключа...' : 'Проверить ключ Admin Read-Only'}</span>
                </button>

                <button
                  onClick={handleLiveSync}
                  disabled={isSyncing || isTesting || !clientId.trim() || !apiKey.trim()}
                  className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Выгрузка всей инфы с Ozon...' : 'Выгрузить всю инфу из Ozon'}</span>
                </button>
              </div>

              {/* Demo fallback */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/30 to-emerald-950/30 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Хотите протестировать без ключа API?</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Загрузите 6 эталонных косметических товаров Ozon с реальными габаритами, рассчитанным литражом, ценами и складом FBO Тула/Москва.
                  </p>
                </div>
                <button
                  onClick={handleDemoSync}
                  className="shrink-0 px-3.5 py-1.5 text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Загрузить демо-товары Ozon
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PREVIEW & INTERACTIVE CUSTOMIZATION OF FETCHED PRODUCTS */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {previewProducts.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Box className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-sm font-semibold text-white">Список выгрузки пока пуст</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Перейдите на вкладку <b>«1. Подключение и склад»</b> и нажмите <b>«Выгрузить всю инфу из Ozon»</b> или загрузите демонстрационный каталог.
                  </p>
                  <button
                    onClick={() => setActiveTab('api')}
                    className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Перейти к подключению
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Toolbar: Bulk actions */}
                  <div className="p-3.5 rounded-xl bg-[#0a0f19] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-semibold text-white">
                        Выгружено товаров из Ozon: <span className="font-mono text-emerald-400">{previewProducts.length} шт.</span>
                      </span>
                    </div>

                    {/* Bulk Tools */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1.5 bg-[#080b11] border border-white/[0.08] px-2 py-1 rounded-lg">
                        <span className="text-[11px] text-slate-400">Себестоимость:</span>
                        <button
                          onClick={() => handleBulkUpdateCogs(20)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200"
                        >
                          20%
                        </button>
                        <button
                          onClick={() => handleBulkUpdateCogs(25)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200"
                        >
                          25%
                        </button>
                        <button
                          onClick={() => handleBulkUpdateCogs(30)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200"
                        >
                          30%
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#080b11] border border-white/[0.08] px-2 py-1 rounded-lg">
                        <span className="text-[11px] text-slate-400">База налога:</span>
                        <button
                          onClick={() => handleBulkUpdateTaxPrice(1.0)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300"
                        >
                          100% (E=D)
                        </button>
                        <button
                          onClick={() => handleBulkUpdateTaxPrice(0.9)}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-white/[0.06] hover:bg-white/[0.12] text-cyan-300"
                        >
                          90%
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 bg-[#080b11] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[11px] text-slate-300 font-medium">
                          {selectedWarehouseName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* High-density preview table */}
                  <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#080b11]">
                    <div className="overflow-x-auto max-h-[380px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#0e1420] border-b border-white/[0.08] text-[10px] uppercase font-bold text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3">Товар / Артикул / Штрихкод</th>
                            <th className="py-2.5 px-2 text-center">Габариты (мм) &rarr; Литраж</th>
                            <th className="py-2.5 px-2 text-right text-emerald-400 bg-emerald-500/[0.04]">
                              1. Цена (₽)
                            </th>
                            <th className="py-2.5 px-2 text-right text-cyan-300 bg-cyan-500/[0.04]">
                              2. Цена налога (₽)
                            </th>
                            <th className="py-2.5 px-2 text-right text-blue-300 bg-blue-500/[0.04]">
                              3. Закупка (₽)
                            </th>
                            <th className="py-2.5 px-2 text-right text-amber-300 bg-amber-500/[0.04]">
                              4. Литраж (л)
                            </th>
                            <th className="py-2.5 px-2 text-right text-pink-300 bg-pink-500/[0.04]">
                              5. Реклама (%)
                            </th>
                            <th className="py-2.5 px-2 text-right">Сборы Ozon</th>
                            <th className="py-2.5 px-3 text-right text-white">Прибыль / Маржа</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {previewProducts.map((p) => {
                            const calc = calculateUnitEconomics(p);
                            const dim = p.dimensions;
                            return (
                              <tr key={p.id} className="hover:bg-white/[0.02]">
                                {/* Product info */}
                                <td className="py-2 px-3 max-w-[200px]">
                                  <div className="font-medium text-white truncate" title={p.title}>
                                    {p.title}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono text-slate-400">{p.sku}</span>
                                    {p.barcode && (
                                      <>
                                        <span className="text-slate-600">&middot;</span>
                                        <span className="font-mono text-slate-500">{p.barcode}</span>
                                      </>
                                    )}
                                  </div>
                                </td>

                                {/* Dimensions & Content Volume */}
                                <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-300">
                                  {p.contentVolume ? (
                                    <div className="text-[11px] text-emerald-300 font-semibold" title={p.syncMeta?.volumeMeta?.message || 'Извлечено из характеристик карточки товара'}>
                                      {p.contentVolume.raw}
                                      <span className="text-[9px] text-slate-400 block font-normal">характеристика</span>
                                    </div>
                                  ) : dim && dim.depth > 0 ? (
                                    <span title={`Длина ${dim.depth} × Ширина ${dim.width} × Высота ${dim.height} ${dim.unit}, Вес ${dim.weight}г`}>
                                      {dim.depth}&times;{dim.width}&times;{dim.height} {dim.unit}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Авторасчет</span>
                                  )}
                                  <div className="text-[10px] text-amber-400/90 font-bold">
                                    {p.volumeLiters} л
                                  </div>
                                </td>

                                {/* 1. Retail Price (Предельная цена) */}
                                <td className="py-2 px-2 text-right font-mono font-bold text-emerald-300 bg-emerald-500/[0.02]">
                                  <div title={p.syncMeta?.limitPriceMeta?.message || 'POST /v5/product/info/prices'}>
                                    {formatCurrency(p.retailPrice)}
                                  </div>
                                  <div className="text-[9px] font-normal text-slate-400">
                                    {p.syncMeta?.limitPriceMeta?.status === 'synced' ? 'min_price' : 'price'}
                                  </div>
                                  {p.oldRetailPrice && (
                                    <div className="text-[9px] text-slate-500 line-through">
                                      {formatCurrency(p.oldRetailPrice)}
                                    </div>
                                  )}
                                </td>

                                {/* 2. Tax Price (Цена реализации) */}
                                <td className="py-2 px-2 text-right bg-cyan-500/[0.02]">
                                  <input
                                    type="number"
                                    min="0"
                                    value={p.taxPrice ?? p.retailPrice}
                                    onChange={(e) =>
                                      handleUpdatePreviewItem(p.id, { taxPrice: Number(e.target.value) })
                                    }
                                    className="w-18 px-1.5 py-0.5 text-right font-mono text-xs text-cyan-300 bg-black/40 border border-cyan-500/30 rounded focus:border-cyan-400 focus:outline-none"
                                    title={p.syncMeta?.realizationPriceMeta?.message || 'База налога УСН 11%'}
                                  />
                                  <div className="text-[9px] text-slate-500 font-mono">
                                    {p.syncMeta?.realizationPriceMeta?.fieldUsed || 'marketing'}
                                  </div>
                                </td>

                                {/* 3. COGS / Закупка (editable) */}
                                <td className="py-2 px-2 text-right bg-blue-500/[0.02]">
                                  <input
                                    type="number"
                                    min="0"
                                    value={p.cogs}
                                    onChange={(e) =>
                                      handleUpdatePreviewItem(p.id, { cogs: Number(e.target.value) })
                                    }
                                    className="w-16 px-1.5 py-0.5 text-right font-mono text-xs text-slate-100 bg-black/40 border border-blue-500/30 rounded focus:border-blue-400 focus:outline-none"
                                  />
                                </td>

                                {/* 4. Volume Liters (Литраж) */}
                                <td className="py-2 px-2 text-right bg-amber-500/[0.02]">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0.01"
                                    value={p.volumeLiters}
                                    onChange={(e) =>
                                      handleUpdatePreviewItem(p.id, { volumeLiters: Number(e.target.value) })
                                    }
                                    className="w-14 px-1 py-0.5 text-right font-mono text-xs text-amber-300 bg-black/40 border border-amber-500/30 rounded focus:border-amber-400 focus:outline-none"
                                    title={p.syncMeta?.volumeMeta?.message || 'Литраж для расчета логистики'}
                                  />
                                </td>

                                {/* 5. Ad spend % (ДРР) */}
                                <td className="py-2 px-2 text-right bg-pink-500/[0.02]">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    max="100"
                                    value={p.adSpendPercent}
                                    onChange={(e) =>
                                      handleUpdatePreviewItem(p.id, { adSpendPercent: Number(e.target.value) })
                                    }
                                    className="w-14 px-1 py-0.5 text-right font-mono text-xs text-pink-300 bg-black/40 border border-pink-500/30 rounded focus:border-pink-400 focus:outline-none"
                                    title="ДРР: настраивается селлером. Статистика кампаний ведется в Ozon Performance API."
                                  />
                                  <div className="text-[9px] text-slate-500 font-mono">
                                    селлера
                                  </div>
                                </td>

                                {/* Ozon Fees */}
                                <td className="py-2 px-2 text-right font-mono text-[11px] text-slate-300">
                                  <div>ком. {calc.appliedCommissionPercent}% ({formatCurrency(calc.commissionRub)})</div>
                                  <div className="text-[10px] text-slate-500">лог. {formatCurrency(calc.totalLogisticsRub)}</div>
                                </td>

                                {/* Profit / Margin */}
                                <td className="py-2 px-3 text-right font-mono">
                                  <div className={`font-bold ${calc.netProfitPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(calc.netProfitPerUnit)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatPercent(calc.marginPercent)} маржа
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Confirm import button */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-950/30 to-blue-950/30 border border-emerald-500/30">
                    <div className="text-xs text-slate-300 space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Все данные и формулы согласованы и готовы к переносу в таблицу</span>
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Склад: <b className="text-emerald-400">{selectedWarehouseName}</b> &middot; Режим: <b>{syncMode === 'append' ? 'Дополнить текущий список' : 'Заменить таблицу'}</b>
                      </p>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                    >
                      <span>Загрузить в рабочую таблицу ({previewProducts.length} поз.)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TARIFFS & LOGISTICS 2025 */}
          {activeTab === 'tariffs' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111827]/60 p-4 rounded-xl border border-white/[0.06]">
                <div className="text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-white mb-1 flex items-center gap-2">
                    <span>Актуальная тарифная сетка Ozon FBO / FBS (Кластер Москва/Тула и регионы)</span>
                    {isLoadingTariffs ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                        Обновление из API Ozon...
                      </span>
                    ) : tariffsLastUpdated ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                        Синхронизировано с API
                      </span>
                    ) : null}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Формулы в приложении автоматически применяют логистику в зависимости от объема в литрах и цены реализации (до или свыше 300 ₽). Выберите категорию для применения базовых комиссий:
                  </p>
                </div>
                <button
                  onClick={() => fetchLatestTariffs()}
                  disabled={isLoadingTariffs}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  title="Опросить актуальные ставки Ozon"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTariffs ? 'animate-spin text-blue-400' : ''}`} />
                  <span>Обновить тарифы</span>
                </button>
              </div>

              {/* Category Tariffs Radio Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryTariffs.map((tariff) => {
                  const isSelected = selectedTariffId === tariff.id;
                  return (
                    <div
                      key={tariff.id}
                      onClick={() => setSelectedTariffId(tariff.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-white">{tariff.name}</div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1 shadow-[0_0_6px_#60a5fa]" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
                          <span className="text-slate-400 block text-[10px]">Комиссия до 300₽:</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {tariff.commissionUnder300}%
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
                          <span className="text-slate-400 block text-[10px]">Комиссия &gt; 300₽:</span>
                          <span className="font-mono font-bold text-amber-400">
                            {tariff.commissionOver300}%
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
                          <span className="text-slate-400 block text-[10px]">Посл. миля:</span>
                          <span className="font-mono font-medium text-slate-200">
                            {tariff.lastMilePercent}%
                          </span>
                        </div>
                        <div className="p-1.5 rounded bg-white/[0.03] border border-white/[0.04]">
                          <span className="text-slate-400 block text-[10px]">Кросс-докинг / ФФ:</span>
                          <span className="font-mono font-medium text-slate-200">
                            {tariff.crossDockFixed} ₽ / {tariff.fulfillmentFixed} ₽
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 mt-2 italic">{tariff.notes}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={handleApplyTariff}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer"
                >
                  Применить выбранный тариф ко всей таблице
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: DIMENSIONS CALCULATOR */}
          {activeTab === 'dimensions' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 leading-relaxed bg-[#111827]/60 p-4 rounded-xl border border-white/[0.06]">
                <p className="font-semibold text-white mb-1">
                  Калькулятор физических габаритов упаковки и расчета логистики Ozon
                </p>
                <p className="text-slate-400 text-[11px]">
                  Формула Ozon: Объем (л) = (Длина см &times; Ширина см &times; Высота см) / 1000. Введите габариты для проверки тарифа логистики:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Длина (см):</label>
                  <input
                    type="number"
                    value={dimLength}
                    onChange={(e) => setDimLength(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Ширина (см):</label>
                  <input
                    type="number"
                    value={dimWidth}
                    onChange={(e) => setDimWidth(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Высота (см):</label>
                  <input
                    type="number"
                    value={dimHeight}
                    onChange={(e) => setDimHeight(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Цена продажи (₽):</label>
                  <input
                    type="number"
                    value={dimPrice}
                    onChange={(e) => setDimPrice(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-xs font-mono bg-[#080c14] border border-white/[0.1] rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Рассчитанный объем упаковки:</span>
                  <span className="text-xl font-bold font-mono text-amber-300">
                    {calculatedDim.volumeLiters} л
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Базовый тариф логистики Ozon:</span>
                  <span className="text-xl font-bold font-mono text-emerald-400">
                    {calculatedDim.baseTariff} ₽
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
