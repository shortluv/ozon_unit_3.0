/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProductUnitData } from './types/unitEconomics';
import { DEMO_OZON_LIVE_CATALOG, getSavedOzonCredentials } from './services/ozonApi';
import { MARKETPLACE_PRESETS } from './utils/calculator';
import { exportProductsToExcel } from './utils/excelHelper';
import { recordPriceSnapshot, recordPriceSnapshotsBatch } from './services/priceHistoryService';
import { Header } from './components/Header';
import { MetricsOverview } from './components/MetricsOverview';
import { ProductTable } from './components/ProductTable';
import { LiveAnalytics } from './components/LiveAnalytics';
import { SingleCalculator } from './components/SingleCalculator';
import { SensitivityMatrix } from './components/SensitivityMatrix';
import { EconomicsAdvisor } from './components/EconomicsAdvisor';
import { OzonSyncModal } from './components/OzonSyncModal';
import { ImportModal } from './components/ImportModal';
import { NewProductModal } from './components/NewProductModal';
import { RefreshCw, Info, ShieldCheck, Database, Layers } from 'lucide-react';

const STORAGE_KEY = 'unit_economics_products_v3';

export default function App() {
  // Products storage with initial fallback to DEMO_OZON_LIVE_CATALOG
  const [products, setProducts] = useState<ProductUnitData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Не удалось загрузить товары из локального хранилища, загружаем эталонный каталог', e);
    }
    return DEMO_OZON_LIVE_CATALOG;
  });

  // Navigation and active view
  const [activeTab, setActiveTab] = useState<'catalog' | 'live_analytics' | 'single' | 'matrix' | 'advisor'>('catalog');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<ProductUnitData | null>(null);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isOzonSyncOpen, setIsOzonSyncOpen] = useState(false);

  // Saved credentials status
  const [isOzonConnected, setIsOzonConnected] = useState(false);

  useEffect(() => {
    const creds = getSavedOzonCredentials();
    setIsOzonConnected(Boolean(creds?.clientId && creds?.apiKey));
  }, [isOzonSyncOpen]);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Ошибка сохранения товаров в localStorage', e);
    }
  }, [products]);

  // CRUD & Updates
  const handleUpdateProduct = (updated: ProductUnitData) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProduct?.id === updated.id) {
      setSelectedProduct(updated);
    }
    // Фиксируем снимок цены для графика истории
    recordPriceSnapshot(updated, 'user_input');
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (selectedProduct?.id === id) {
      setSelectedProduct(null);
    }
  };

  const handleDuplicateProduct = (prod: ProductUnitData) => {
    const duplicated: ProductUnitData = {
      ...prod,
      id: `copy_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sku: `${prod.sku}-COPY`,
      title: `${prod.title} (Копия)`,
    };
    setProducts((prev) => [duplicated, ...prev]);
    recordPriceSnapshot(duplicated, 'user_input');
  };

  const handleAddProduct = (newProd: ProductUnitData) => {
    setProducts((prev) => [newProd, ...prev]);
    setIsNewProductOpen(false);
    recordPriceSnapshot(newProd, 'user_input');
  };

  const handleImportProducts = (newItems: ProductUnitData[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setProducts(newItems);
    } else {
      // Append mode: merge existing by SKU / ID or append new
      setProducts((prev) => {
        const existingMap = new Map(prev.map((p) => [p.sku, p]));
        newItems.forEach((item) => {
          existingMap.set(item.sku, item);
        });
        return Array.from(existingMap.values());
      });
    }
    recordPriceSnapshotsBatch(newItems, 'excel_import');
  };

  const handleApplyPresetToAll = (presetId: string) => {
    const preset = MARKETPLACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        commissionUnder300: preset.commissionUnder300,
        commissionOver300: preset.commissionOver300,
        lastMilePercent: preset.lastMilePercent,
        acquiringPercent: preset.acquiringPercent,
        crossDockFixed: preset.crossDockFixed,
        fulfillmentFixed: preset.fulfillmentFixed,
        forceMajeurePercent: preset.forceMajeurePercent,
        taxPercent: preset.taxPercent,
      }))
    );
  };

  const handleUpdateWarehouseAll = (warehouseName: string, warehouseType: 'FBO' | 'FBS') => {
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        warehouse: warehouseName,
        warehouseType: warehouseType,
        crossDockFixed: warehouseType === 'FBS' ? 0 : 1.63,
        fulfillmentFixed: warehouseType === 'FBS' ? 30 : 10,
      }))
    );
  };

  const handleApplyTariffToAll = (tariff: {
    name: string;
    commissionUnder300: number;
    commissionOver300: number;
    lastMilePercent: number;
    acquiringPercent: number;
    crossDockFixed: number;
    fulfillmentFixed: number;
  }) => {
    setProducts((prev) =>
      prev.map((item) => ({
        ...item,
        commissionUnder300: tariff.commissionUnder300,
        commissionOver300: tariff.commissionOver300,
        lastMilePercent: tariff.lastMilePercent,
        acquiringPercent: tariff.acquiringPercent,
        crossDockFixed: tariff.crossDockFixed,
        fulfillmentFixed: tariff.fulfillmentFixed,
      }))
    );
  };

  const handleSelectForDeepDive = (product: ProductUnitData) => {
    setSelectedProduct(product);
    setActiveTab('single');
  };

  const handleExport = () => {
    exportProductsToExcel(products);
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenImport={() => setIsImportOpen(true)}
        onExport={handleExport}
        onNewProduct={() => setIsNewProductOpen(true)}
        onOpenOzonSync={() => setIsOzonSyncOpen(true)}
        isOzonConnected={isOzonConnected}
        productCount={products.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Metrics Strip (visible on catalog, single, advisor) */}
        {activeTab !== 'live_analytics' && (
          <MetricsOverview
            products={products}
            onFilterLosses={() => setActiveFilter(activeFilter === 'loss' ? 'all' : 'loss')}
            activeFilter={activeFilter}
          />
        )}

        {/* Tab 1: Interactive Table & Widgets */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* ЭТАП 2: Честный информационный баннер источников данных (исправлен по результатам аудита) */}
            <div className="bg-[#0e1420] border border-white/[0.08] rounded-xl p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Честный аудит источников данных и логики расчета Ozon
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Данные о товарах, ценах (min_price), габаритах, складах и тарифах категорий загружаются из{' '}
                  <strong className="text-emerald-400 font-medium">Ozon Seller API</strong>. Себестоимость закупки и плановый ДРР задаются селлером. Логистика, комиссионная ступень 300 ₽ и налоги рассчитываются по регламенту Ozon 2025/2026 и формулам юнит-экономики. Источник и актуальность каждого показателя отображаются отдельно.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setIsOzonSyncOpen(true)}
                  className="px-3 py-1.5 text-[11px] font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Синхронизация API</span>
                </button>
              </div>
            </div>

            <ProductTable
              products={products}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onDuplicateProduct={handleDuplicateProduct}
              onSelectForDeepDive={handleSelectForDeepDive}
              onApplyPresetToAll={handleApplyPresetToAll}
              onUpdateWarehouseAll={handleUpdateWarehouseAll}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
          </div>
        )}

        {/* Tab 2: НОВАЯ ВКЛАДКА «ЖИВАЯ АНАЛИТИКА» (ЭТАПЫ 4, 5, 6, 7) */}
        {activeTab === 'live_analytics' && (
          <LiveAnalytics
            products={products}
            onOpenOzonSync={() => setIsOzonSyncOpen(true)}
            isOzonConnected={isOzonConnected}
            onSelectProductForDeepDive={handleSelectForDeepDive}
          />
        )}

        {/* Tab 3: Single Product Deep Dive Calculator */}
        {activeTab === 'single' && (
          <SingleCalculator
            products={products}
            selectedProduct={selectedProduct}
            onSaveProduct={handleUpdateProduct}
            onSaveAsNew={handleAddProduct}
          />
        )}

        {/* Tab 4: Sensitivity Matrix */}
        {activeTab === 'matrix' && (
          <SensitivityMatrix
            products={products}
            selectedProduct={selectedProduct}
          />
        )}

        {/* Tab 5: AI & Algorithmic Unit Economics Advisor */}
        {activeTab === 'advisor' && (
          <EconomicsAdvisor
            products={products}
            onSelectProduct={handleSelectForDeepDive}
          />
        )}
      </main>

      {/* Modals */}
      <OzonSyncModal
        isOpen={isOzonSyncOpen}
        onClose={() => setIsOzonSyncOpen(false)}
        currentProducts={products}
        onImportProducts={handleImportProducts}
        onApplyTariffToAll={handleApplyTariffToAll}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportProducts={handleImportProducts}
      />

      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        onAddProduct={handleAddProduct}
      />
    </div>
  );
}
