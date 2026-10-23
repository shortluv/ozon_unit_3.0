export interface MarketplacePreset {
  id: string;
  name: string;
  description: string;
  commissionUnder300: number; // Комиссия Ozon до 300 ₽ (23%)
  commissionOver300: number; // Комиссия Ozon свыше 300 ₽ (52%)
  lastMilePercent: number; // Последняя миля (4.9%)
  acquiringPercent: number; // Эквайринг (1.5%)
  crossDockFixed: number; // Кросс-докинг (1.63 ₽)
  fulfillmentFixed: number; // Фулфилмент (10 ₽)
  forceMajeurePercent: number; // Форс-мажор (1%)
  taxPercent: number; // Налог УСН (11% или 6%)
}

export interface ProductDimensions {
  depth: number; // Глубина / Длина, мм или см
  width: number; // Ширина, мм или см
  height: number; // Высота, мм или см
  weight: number; // Вес, г или кг
  unit: string; // мм, см
  weightUnit?: string; // г, кг
}

export interface ProductUnitData {
  id: string;
  sku: string; // Артикул (напр. OZN3493060723)
  title: string; // Название товара
  category?: string; // Категория
  barcode?: string; // Штрихкод Ozon / EAN
  
  // ========================================================
  // СКЛАД ОТГРУЗКИ / КЛАСТЕР OZON
  // ========================================================
  warehouse?: string; // Название склада (напр. "Склад FBO Тула / Москва (Кластер Центр)")
  warehouseType?: 'FBO' | 'FBS'; // Тип размещения: FBO или FBS
  warehouseId?: string | number; // ID склада Ozon (если FBS)
  
  // ========================================================
  // ФИЗИЧЕСКИЕ ПАРАМЕТРЫ УПАКОВКИ ИЗ OZON API
  // ========================================================
  dimensions?: ProductDimensions;
  
  // ========================================================
  // 5 ГЛАВНЫХ ИЗМЕНЯЕМЫХ ПАРАМЕТРОВ (ВВОД СЕЛЛЕРА)
  // ========================================================
  retailPrice: number; // 1. Предельная цена продажи / реализации, ₽
  min_price?: number; // Минимальная цена продавца (порог цены Ozon API)
  taxPrice?: number; // 2. Цена реализации для налога (база УСН 11%, колонка E в Excel)
  cogs: number; // 3. Закупка / себестоимость, ₽
  volumeLiters: number; // 4. Литраж упаковки, л (рассчитан из габаритов Ozon)
  volume?: number; // Литраж содержимого из характеристик
  adSpendPercent: number; // 5. Процент рекламы (ДРР %)
  drr?: number; // ДРР % (алиас adSpendPercent)
  
  // ========================================================
  // ДАННЫЕ ИЗ EXCEL ТАБЛИЦЫ ЮНИТ-ЭКОНОМИКИ
  // ========================================================
  oldRetailPrice?: number; // Доскидочная цена на Ozon
  fulfillmentFixed: number; // ФФ, ₽ (10 ₽ для FBO)
  ddvRub: number; // ДДВ (доставка до места выдачи, ₽)
  lpRub: number; // ЛП (локальность продаж, ₽)
  crossDockFixed: number; // Кросс-докинг, ₽ (1.63 ₽)
  lastMilePercent: number; // Последняя миля, % (4.9%)
  acquiringPercent: number; // Эквайринг, % (1.5%)
  commissionUnder300: number; // Комиссия до 300 ₽, % (23%)
  commissionOver300: number; // Комиссия свыше 300 ₽, % (52% или FBO ставка Ozon)
  forceMajeurePercent: number; // Форс-мажор, % (1%)
  taxPercent: number; // Налог, % (11%)
  
  plannedSalesUnits: number; // План продаж в месяц, шт
  notes?: string;

  // ========================================================
  // ПРОЗРАЧНОСТЬ И ИСТОЧНИКИ ДАННЫХ OZON API
  // ========================================================
  contentVolume?: {
    raw: string; // Строковое значение из атрибутов (например, "50 мл")
    valueLiters: number; // Нормализованное значение в литрах (0.05 л)
    unit: string; // Единица измерения (мл, л, г)
    attributeId?: number;
  };
  syncMeta?: ProductSyncMeta;
}

export interface FieldSyncInfo {
  sourceMethod: string; // e.g. 'POST /v5/product/info/prices', 'POST /v4/product/info/attributes', 'POST /v2/finance/realization', 'manual'
  fieldUsed: string; // e.g. 'price.min_price', 'price.price', 'attributes[4389].value', 'price.marketing_seller_price'
  updatedAt: string; // ISO timestamp
  status: 'synced' | 'fallback_seller_price' | 'kept_previous' | 'unavailable' | 'manual';
  message?: string;
  rawValue?: string | number | null;
}

export interface ProductSyncMeta {
  lastSyncDate?: string;
  limitPriceMeta?: FieldSyncInfo;
  realizationPriceMeta?: FieldSyncInfo;
  volumeMeta?: FieldSyncInfo;
  drrMeta?: FieldSyncInfo;
}

export interface UnitEconomicsResult {
  retailPrice: number; // Предельная цена реализации
  taxPrice: number; // Цена реализации для налога (столбец E)
  cogs: number; // Закупка
  volumeLiters: number; // Литраж
  adSpendPercent: number; // Процент рекламы
  
  // Склад
  warehouse: string;
  warehouseType: 'FBO' | 'FBS';
  
  // Логистика по тарифной сетке Ozon / Склада
  baseLogisticsTariff: number; // Тариф лог (по литражу и цене до/свыше 300₽)
  lastMileRub: number; // Последняя миля в ₽ (4.9%)
  acquiringRub: number; // Эквайринг в ₽ (1.5%)
  crossDockRub: number; // Кросс-докинг в ₽ (1.63 ₽)
  ddvRub: number; // ДДВ в ₽
  lpRub: number; // ЛП в ₽
  totalLogisticsRub: number; // Логистика ИТОГО в ₽ (H + I + J + K + L + M)
  
  // Комиссия и прочее
  appliedCommissionPercent: number; // 23% или 52% (в зависимости от цены <= 300 или > 300)
  commissionRub: number; // Комиссия Ozon в ₽
  fulfillmentRub: number; // ФФ в ₽ (10 ₽)
  adSpendRub: number; // Реклама в ₽
  taxRub: number; // Налог в ₽ (11%)
  forceMajeureRub: number; // Форс-мажор в ₽ (1%)
  
  // Итоги
  totalExpensesRub: number; // ИТОГО расходов в ₽
  netProfitPerUnit: number; // ПРИБЫЛЬ ед в ₽ (D - U)
  roiPercent: number; // ROI % ((D - U) / F * 100)
  marginPercent: number; // Маржа % ((D - U) / D * 100)
  drrPercent: number; // ДРР % (R / D * 100)
  
  // Пороги безубыточности
  breakEvenPrice: number; // Точка безубыточности (цена при прибыли = 0)
  maxAllowableAdPercent: number; // Предельно допустимый % рекламы до нуля
  maxDiscountPercent: number; // Максимальная скидка до нуля
  
  // Месячные показатели
  monthlyRevenue: number;
  monthlyTotalExpenses: number;
  monthlyNetProfit: number;
  
  status: 'profitable' | 'marginal' | 'loss';
}
