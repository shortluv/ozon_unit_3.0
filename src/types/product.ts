/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductDimensions, ProductSyncMeta } from './unitEconomics';

/**
 * Строгие типы данных товара и API ответов Ozon Seller API
 */

export interface ProductPriceFields {
  retailPrice: number; // Предельная цена продажи / реализации (руб)
  min_price: number; // Минимальная цена продавца (порог цены из Ozon API price.min_price)
  taxPrice?: number; // Цена реализации для налога (база УСН 11%)
  cogs: number; // Себестоимость закупки (руб)
  oldRetailPrice?: number; // Зачеркнутая цена до скидки
}

export interface ProductVolumeFields {
  volume: number; // Объем содержимого товара в литрах (из характеристик карточки, напр. 0.05 л для 50 мл)
  volumeLiters: number; // Литраж для расчета логистики по тарифной сетке Ozon
  contentVolume?: {
    raw: string; // Строка из карточки, например "50 мл"
    valueLiters: number; // Значение в литрах
    unit: string; // "мл", "л", "г"
    attributeId?: number;
  };
}

export interface ProductMarketingFields {
  drr: number; // Доля рекламных расходов (%)
  adSpendPercent: number; // Процент рекламных расходов от цены реализации
  adSpendRub?: number; // Расход на рекламу в рублях
}

/**
 * Основная модель товара в калькуляторе с обязательными полями retailPrice, min_price, volume, drr
 */
export interface ProductData extends ProductPriceFields, ProductVolumeFields, ProductMarketingFields {
  id: string;
  sku: string; // Артикул продавца (offer_id)
  title: string; // Название товара
  category?: string; // Категория товара
  barcode?: string; // Штрихкод Ozon / EAN
  
  // Склад отгрузки
  warehouse?: string;
  warehouseType?: 'FBO' | 'FBS';
  warehouseId?: string | number;
  
  // Физические габариты упаковки для логистической сетки
  dimensions?: ProductDimensions;
  
  // Тарифные сборы
  fulfillmentFixed: number; // ФФ (10 ₽)
  ddvRub: number; // ДДВ
  lpRub: number; // ЛП
  crossDockFixed: number; // Кросс-докинг (1.63 ₽)
  lastMilePercent: number; // Последняя миля (4.9%)
  acquiringPercent: number; // Эквайринг (1.5%)
  commissionUnder300: number; // Комиссия Ozon до 300 ₽ (%)
  commissionOver300: number; // Комиссия Ozon свыше 300 ₽ (%)
  forceMajeurePercent: number; // Форс-мажор (%)
  taxPercent: number; // Ставка налога (%)
  
  plannedSalesUnits: number; // План продаж в месяц (шт)
  notes?: string;
  
  // Метаданные синхронизации с Ozon API
  syncMeta?: ProductSyncMeta;
}

// ============================================================================
// СТРОГАЯ ТИПИЗАЦИЯ ОТВЕТОВ OZON SELLER API
// ============================================================================

export interface OzonApiPriceDetails {
  price: string | number; // Текущая цена продавца
  old_price: string | number; // Цена до скидок
  min_price?: string | number; // Минимальная цена продавца (порог для автоприменения скидок)
  marketing_seller_price?: string | number; // Цена с учетом скидки продавца
  marketing_price?: string | number; // Устаревшее/отключенное Ozon поле
  retail_price?: string | number;
  currency_code?: string;
}

export interface OzonApiCommissions {
  sales_percent?: number;
  sales_percent_fbo?: number; // Официальная ставка комиссии Ozon FBO
  sales_percent_fbs?: number; // Официальная ставка комиссии Ozon FBS
  fbo_deliv_to_customer_amount?: number; // Базовый тариф логистики
  acquiring?: number; // Ставка эквайринга
}

export interface OzonApiPriceItem {
  product_id: number;
  offer_id: string;
  price: OzonApiPriceDetails;
  commissions?: OzonApiCommissions;
  volume_weight?: number; // Объемный вес (кг)
}

export interface OzonPricesApiResponse {
  result?: {
    items?: OzonApiPriceItem[];
    cursor?: string;
    total?: number;
  };
  items?: OzonApiPriceItem[];
  cursor?: string;
  total?: number;
}

export interface OzonAttributeValue {
  dictionary_id?: number;
  value: string;
}

export interface OzonProductAttribute {
  attribute_id: number;
  complex_id?: number;
  values: OzonAttributeValue[];
}

export interface OzonProductAttributeItem {
  id: number;
  offer_id: string;
  name: string;
  barcode?: string;
  barcodes?: string[];
  category_id?: number;
  depth?: number; // мм
  width?: number; // мм
  height?: number; // мм
  dimension_unit?: string;
  weight?: number; // г
  weight_unit?: string;
  price?: string | number;
  old_price?: string | number;
  min_price?: string | number;
  attributes?: OzonProductAttribute[];
}

export interface OzonProductAttributesApiResponse {
  result?: OzonProductAttributeItem[] | { items?: OzonProductAttributeItem[] };
  items?: OzonProductAttributeItem[];
  total?: number;
  last_id?: string;
}

export interface OzonCategoryCommissionRate {
  categoryId: number;
  categoryName: string;
  commissionUnder300: number; // Комиссия Ozon до 300 ₽ (%)
  commissionOver300: number; // Комиссия Ozon свыше 300 ₽ (%)
  fboPercent: number;
  fbsPercent: number;
  acquiringPercent?: number;
}
