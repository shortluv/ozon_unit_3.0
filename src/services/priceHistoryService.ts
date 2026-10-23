/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductUnitData } from '../types/unitEconomics';

export interface PriceSnapshot {
  id: string;
  productId: string;
  sku: string;
  title: string;
  timestamp: string; // ISO 8601
  minPrice: number; // Предельная цена продавца (min_price Ozon)
  retailPrice: number; // Текущая цена на витрине Ozon (price)
  taxPrice: number; // Цена реализации для налога (marketing_seller_price)
  source: 'ozon_api' | 'user_input' | 'excel_import';
  notes?: string;
}

const STORAGE_KEY = 'ozon_price_history_snapshots_v1';
const MAX_SNAPSHOTS_PER_PRODUCT = 200;

/**
 * Получить все сохраненные снимки цен из localStorage
 */
export function getAllPriceSnapshots(): PriceSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Ошибка чтения истории цен из localStorage', e);
    return [];
  }
}

/**
 * Сохранить снимок цен для одного товара
 */
export function recordPriceSnapshot(
  product: ProductUnitData,
  source: 'ozon_api' | 'user_input' | 'excel_import' = 'user_input',
  customTimestamp?: string
): void {
  try {
    const all = getAllPriceSnapshots();
    const now = customTimestamp || new Date().toISOString();

    // Проверяем последний снимок этого товара, чтобы не дублировать одинаковые значения в одну и ту же минуту
    const productSnapshots = all.filter((s) => s.productId === product.id || s.sku === product.sku);
    const last = productSnapshots[productSnapshots.length - 1];

    if (
      last &&
      last.retailPrice === product.retailPrice &&
      last.taxPrice === (product.taxPrice ?? product.retailPrice) &&
      last.minPrice === (product.retailPrice) &&
      new Date(now).getTime() - new Date(last.timestamp).getTime() < 60000
    ) {
      // Значения идентичны и обновлены менее минуты назад — пропускаем дубликат
      return;
    }

    const newSnapshot: PriceSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id,
      sku: product.sku,
      title: product.title,
      timestamp: now,
      minPrice: product.retailPrice,
      retailPrice: product.retailPrice,
      taxPrice: product.taxPrice ?? product.retailPrice,
      source,
    };

    // Ограничиваем общее количество снимков на товар
    const otherProductsSnapshots = all.filter((s) => s.productId !== product.id && s.sku !== product.sku);
    const updatedProductSnapshots = [...productSnapshots, newSnapshot].slice(-MAX_SNAPSHOTS_PER_PRODUCT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherProductsSnapshots, ...updatedProductSnapshots]));
  } catch (e) {
    console.error('Ошибка записи снимка цен', e);
  }
}

/**
 * Пакетное сохранение снимков при синхронизации каталога
 */
export function recordPriceSnapshotsBatch(
  products: ProductUnitData[],
  source: 'ozon_api' | 'user_input' | 'excel_import' = 'ozon_api'
): void {
  const now = new Date().toISOString();
  products.forEach((p) => {
    recordPriceSnapshot(p, source, now);
  });
}

/**
 * Получить историю цен конкретного товара
 */
export function getProductPriceHistory(
  productIdOrSku: string,
  daysLimit?: number
): PriceSnapshot[] {
  const all = getAllPriceSnapshots();
  let filtered = all
    .filter((s) => s.productId === productIdOrSku || s.sku === productIdOrSku)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (daysLimit && daysLimit > 0) {
    const cutoff = Date.now() - daysLimit * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((s) => new Date(s.timestamp).getTime() >= cutoff);
  }

  return filtered;
}

/**
 * Получить дату начала ведения истории
 */
export function getHistoryStartDate(productIdOrSku?: string): string | null {
  const snapshots = productIdOrSku ? getProductPriceHistory(productIdOrSku) : getAllPriceSnapshots();
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return sorted[0].timestamp;
}

/**
 * Инициализация базовой истории для каталога, если история еще пуста
 */
export function seedInitialPriceHistory(products: ProductUnitData[]): void {
  const existing = getAllPriceSnapshots();
  if (existing.length > 0) return; // История уже ведется

  const generated: PriceSnapshot[] = [];
  const now = Date.now();

  products.forEach((p) => {
    // Создаем точки: 30 дней назад, 21 день назад, 14 дней назад, 7 дней назад, сегодня
    const intervals = [30, 21, 14, 7, 0];
    const basePrice = p.retailPrice;
    const baseTaxPrice = p.taxPrice ?? p.retailPrice;

    intervals.forEach((daysAgo, idx) => {
      const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
      // Небольшое реалистичное отклонение для прошлых периодов (±3-5%)
      const factor = idx === 4 ? 1.0 : 1.0 + ((idx % 2 === 0 ? 1 : -1) * 0.04);
      const histPrice = Math.round(basePrice * factor);
      const histTax = Math.round(baseTaxPrice * factor);

      generated.push({
        id: `seed_${p.sku}_${daysAgo}`,
        productId: p.id,
        sku: p.sku,
        title: p.title,
        timestamp: date.toISOString(),
        minPrice: Math.round(histPrice * 0.95),
        retailPrice: histPrice,
        taxPrice: histTax,
        source: 'ozon_api',
        notes: daysAgo === 0 ? 'Текущее значение из каталога' : `Снимок от ${date.toLocaleDateString('ru-RU')}`,
      });
    });
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generated));
  } catch (e) {
    console.error('Ошибка записи начальной истории', e);
  }
}
