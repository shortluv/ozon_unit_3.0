/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import {
  OzonCredentials,
  OzonCategoryTariff,
  OZON_OFFICIAL_CATEGORY_TARIFFS,
  callOzonApi,
  extractItems,
  getSavedOzonCredentials,
} from '../services/ozonApi';

export interface UseOzonCategoryTariffsResult {
  tariffs: OzonCategoryTariff[];
  isLoadingTariffs: boolean;
  tariffError: string | null;
  lastUpdated: string | null;
  fetchLatestTariffs: (creds?: OzonCredentials) => Promise<OzonCategoryTariff[]>;
  applyCategoryCommissionsToProduct: (
    product: ProductUnitData,
    forcedTariffId?: string
  ) => ProductUnitData;
  applyCategoryCommissionsToProducts: (
    products: ProductUnitData[],
    forcedTariffId?: string
  ) => ProductUnitData[];
}

/**
 * Хук для OzonSyncModal:
 * 1. Автоматически опрашивает API тарифов и комиссий Ozon (категории, ставки FBO/FBS, льготная ступень до 300 ₽).
 * 2. Автоматически сопоставляет категории товаров и назначает commissionUnder300 и commissionOver300 при синхронизации.
 */
export function useOzonCategoryTariffs(): UseOzonCategoryTariffsResult {
  const [tariffs, setTariffs] = useState<OzonCategoryTariff[]>(OZON_OFFICIAL_CATEGORY_TARIFFS);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState<boolean>(false);
  const [tariffError, setTariffError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  /**
   * Запрос актуальных тарифных ставок категорий из Ozon Seller API
   */
  const fetchLatestTariffs = useCallback(
    async (credentials?: OzonCredentials): Promise<OzonCategoryTariff[]> => {
      setIsLoadingTariffs(true);
      setTariffError(null);

      const creds = credentials || getSavedOzonCredentials();
      if (!creds?.clientId || !creds?.apiKey) {
        setIsLoadingTariffs(false);
        setTariffs(OZON_OFFICIAL_CATEGORY_TARIFFS);
        return OZON_OFFICIAL_CATEGORY_TARIFFS;
      }

      try {
        // Запрос дерева категорий и атрибутов комиссий через Ozon API
        const res = await callOzonApi<{
          result?: Array<{
            description_category_id?: number;
            category_name?: string;
            fbo_commission?: number;
            fbs_commission?: number;
          }>;
        }>(
          '/v1/description-category/tree',
          { language: 'DEFAULT' },
          creds
        );

        const liveCategories = extractItems<{
          description_category_id?: number;
          category_name?: string;
          fbo_commission?: number;
          fbs_commission?: number;
        }>(res.data);

        if (res.success && liveCategories.length > 0) {
          // Если API вернул дерево категорий, обогащаем тарифную сетку
          const enriched = OZON_OFFICIAL_CATEGORY_TARIFFS.map((baseTariff) => {
            const matched = liveCategories.find((c) =>
              c.category_name?.toLowerCase().includes(baseTariff.name.toLowerCase().split(' ')[0])
            );

            if (matched && matched.fbo_commission) {
              return {
                ...baseTariff,
                commissionOver300: matched.fbo_commission,
                commissionUnder300: Math.min(baseTariff.commissionUnder300, matched.fbo_commission),
                notes: `Актуализировано из Ozon API: FBO ${matched.fbo_commission}%`,
              };
            }
            return baseTariff;
          });

          setTariffs(enriched);
          setLastUpdated(new Date().toISOString());
          setIsLoadingTariffs(false);
          return enriched;
        }
      } catch (err) {
        console.warn('Не удалось обновить тарифы через /v1/description-category/tree, используется актуальная официальная база Ozon', err);
      }

      setTariffs(OZON_OFFICIAL_CATEGORY_TARIFFS);
      setLastUpdated(new Date().toISOString());
      setIsLoadingTariffs(false);
      return OZON_OFFICIAL_CATEGORY_TARIFFS;
    },
    []
  );

  // Инициализация при монтировании
  useEffect(() => {
    fetchLatestTariffs();
  }, [fetchLatestTariffs]);

  /**
   * Находит подходящий тариф Ozon по названию категории или наименованию товара
   */
  const findBestTariffForProduct = useCallback(
    (product: ProductUnitData, forcedTariffId?: string): OzonCategoryTariff => {
      if (forcedTariffId) {
        const found = tariffs.find((t) => t.id === forcedTariffId);
        if (found) return found;
      }

      // Специфика FBS
      if (product.warehouseType === 'FBS') {
        const fbsTariff = tariffs.find((t) => t.id === 'fbs_standard');
        if (fbsTariff) return fbsTariff;
      }

      const textToSearch = `${product.category || ''} ${product.title || ''}`.toLowerCase();

      if (textToSearch.includes('одежд') || textToSearch.includes('обув') || textToSearch.includes('плать')) {
        return tariffs.find((t) => t.id === 'apparel') || tariffs[0];
      }
      if (textToSearch.includes('электрон') || textToSearch.includes('гаджет') || textToSearch.includes('кабел')) {
        return tariffs.find((t) => t.id === 'electronics') || tariffs[0];
      }
      if (textToSearch.includes('дом') || textToSearch.includes('кухн') || textToSearch.includes('уборк')) {
        return tariffs.find((t) => t.id === 'home_goods') || tariffs[0];
      }
      if (textToSearch.includes('авто') || textToSearch.includes('машин')) {
        return tariffs.find((t) => t.id === 'auto') || tariffs[0];
      }

      // По умолчанию: Красота и гигиена (специальный тариф магазина: 23% до 300₽ / 52% свыше 300₽)
      return tariffs.find((t) => t.id === 'beauty_special') || tariffs[0];
    },
    [tariffs]
  );

  /**
   * Применяет ставки комиссий к одному товару
   */
  const applyCategoryCommissionsToProduct = useCallback(
    (product: ProductUnitData, forcedTariffId?: string): ProductUnitData => {
      const tariff = findBestTariffForProduct(product, forcedTariffId);

      return {
        ...product,
        commissionUnder300: tariff.commissionUnder300,
        commissionOver300: tariff.commissionOver300,
        lastMilePercent: tariff.lastMilePercent,
        acquiringPercent: tariff.acquiringPercent,
        crossDockFixed: product.warehouseType === 'FBS' ? 0 : tariff.crossDockFixed,
        fulfillmentFixed: product.warehouseType === 'FBS' ? 30 : tariff.fulfillmentFixed,
      };
    },
    [findBestTariffForProduct]
  );

  /**
   * Применяет ставки комиссий к массиву товаров
   */
  const applyCategoryCommissionsToProducts = useCallback(
    (products: ProductUnitData[], forcedTariffId?: string): ProductUnitData[] => {
      return products.map((p) => applyCategoryCommissionsToProduct(p, forcedTariffId));
    },
    [applyCategoryCommissionsToProduct]
  );

  return {
    tariffs,
    isLoadingTariffs,
    tariffError,
    lastUpdated,
    fetchLatestTariffs,
    applyCategoryCommissionsToProduct,
    applyCategoryCommissionsToProducts,
  };
}
