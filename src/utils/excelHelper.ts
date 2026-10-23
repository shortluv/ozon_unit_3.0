import * as XLSX from 'xlsx';
import { ProductUnitData, UnitEconomicsResult } from '../types/unitEconomics';
import { calculateUnitEconomics } from './calculator';

export interface ColumnMapping {
  sku: string;
  title: string;
  category: string;
  
  // 4 Primary inputs requested by user
  retailPrice: string; // Предельная цена реализации
  cogs: string; // Закупка
  adSpendPercent: string; // Процент рекламы
  volumeLiters: string; // Литраж (л)
  
  // Background parameters from Excel unit economics
  taxPrice: string;
  ddvRub: string;
  lpRub: string;
  fulfillmentFixed: string;
  crossDockFixed: string;
  taxPercent: string;
  plannedSalesUnits: string;
}

// Synonyms dictionary for smart column auto-detection
const COLUMN_SYNONYMS: Record<keyof ColumnMapping, string[]> = {
  sku: ['артикул', 'sku', 'код товара', 'код', 'арт', 'id', 'номер'],
  title: ['название товара', 'название', 'наименование', 'товар', 'продукт', 'title', 'name', 'номенклатура'],
  category: ['категория', 'раздел', 'группа', 'category'],
  
  // User's 4 core parameters
  retailPrice: [
    'цена\nпродажи, ₽\nпредельная',
    'цена продажи, ₽ предельная',
    'цена продажи предельная',
    'предельная цена реализации',
    'предельная цена',
    'цена продажи, ₽',
    'цена продажи',
    'розничная цена',
    'цена',
    'price'
  ],
  cogs: [
    'закупка /\nсебест, ₽',
    'закупка / себест, ₽',
    'закупка / себест',
    'закупка',
    'себест, ₽',
    'себест',
    'цена закупки',
    'себестоимость',
    'cogs',
    'закуп'
  ],
  volumeLiters: [
    'литраж,\nл',
    'литраж, л',
    'литраж',
    'объем, л',
    'объем (л)',
    'объем',
    'литры',
    'л',
    'volume'
  ],
  adSpendPercent: [
    'реклама,\n%',
    'реклама, %',
    'реклама %',
    'процент рекламы',
    'дрр, %',
    'дрр %',
    'дрр',
    'реклама',
    'ads'
  ],
  
  taxPrice: [
    'цена\nреализации для налога',
    'цена реализации для налога',
    'цена для налога',
    'цена реализации'
  ],
  ddvRub: ['ддв', 'ддв, расход/ед, ₽', 'доставка до места выдачи', 'доставка доместа выдачи'],
  lpRub: ['лп', 'лп, расход/ед, ₽', 'локальность продаж', 'локальность'],
  fulfillmentFixed: ['фф, ₽', 'фф', 'фулфилмент'],
  crossDockFixed: ['кросс-\nдок, ₽', 'кросс-док, ₽', 'кросс-док', 'кроссдок'],
  taxPercent: ['налог, ₽/\n11%', 'налог, ₽/ 11%', 'налог 11%', 'налог %', 'ставка налога', 'усн %'],
  plannedSalesUnits: ['план продаж', 'продажи шт', 'количество', 'объем продаж', 'продажи в месяц', 'партия'],
};

export function autoDetectColumns(availableHeaders: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    sku: '',
    title: '',
    category: '',
    retailPrice: '',
    cogs: '',
    adSpendPercent: '',
    volumeLiters: '',
    taxPrice: '',
    ddvRub: '',
    lpRub: '',
    fulfillmentFixed: '',
    crossDockFixed: '',
    taxPercent: '',
    plannedSalesUnits: '',
  };

  const normalizedHeaders = availableHeaders.map((h) => ({
    original: h,
    cleaned: String(h).trim().toLowerCase().replace(/\r\n/g, '\n'),
  }));

  for (const [key, synonyms] of Object.entries(COLUMN_SYNONYMS) as [keyof ColumnMapping, string[]][]) {
    // 1. Exact match
    const exact = normalizedHeaders.find((h) => synonyms.includes(h.cleaned));
    if (exact) {
      mapping[key] = exact.original;
      continue;
    }
    // 2. Partial match
    const partial = normalizedHeaders.find((h) =>
      synonyms.some((syn) => h.cleaned.includes(syn) || syn.includes(h.cleaned))
    );
    if (partial) {
      mapping[key] = partial.original;
    }
  }

  return mapping;
}

export function parseExcelFile(file: File): Promise<{ headers: string[]; rawRows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find sheet: either "UNIT по товарам" or the first available sheet
        const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('unit')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // If sheet has title / description on rows 1-2 (as in user file), start reading headers from row 3 (range 2)
        let rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: 2 });
        
        // If row 3 didn't yield columns like SKU/Name, try range 0
        if (!rawJson.length || (!rawJson[0]['Артикул'] && !rawJson[0]['Название товара'] && !rawJson[0]['Цена\nпродажи, ₽\nпредельная'])) {
          const altJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          if (altJson.length) rawJson = altJson;
        }

        if (!rawJson.length) {
          throw new Error('Таблица пустая или не содержит строк с данными');
        }

        // Filter out summary rows like "ИТОГО ПО МАГАЗИНУ"
        const filteredRows = rawJson.filter((r) => {
          const firstVal = String(Object.values(r)[0] || '').toLowerCase();
          const nameVal = String(r['Название товара'] || r['Наименование'] || '').toLowerCase();
          return !firstVal.includes('итого') && !nameVal.includes('итого');
        });

        const headers = Object.keys(filteredRows[0] || rawJson[0]);
        resolve({ headers, rawRows: filteredRows.length ? filteredRows : rawJson });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsArrayBuffer(file);
  });
}

function cleanNumeric(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

export function convertRowsToProducts(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping
): ProductUnitData[] {
  return rawRows.map((row, index) => {
    const sku = mapping.sku && row[mapping.sku] ? String(row[mapping.sku]).trim() : `OZN-${1000 + index}`;
    const title = mapping.title && row[mapping.title] ? String(row[mapping.title]).trim() : `Товар ${index + 1}`;
    const category = mapping.category && row[mapping.category] ? String(row[mapping.category]).trim() : 'Красота и гигиена';
    
    // 4 Primary inputs requested by user
    const retailPrice = cleanNumeric(mapping.retailPrice ? row[mapping.retailPrice] : 0, 250);
    const cogs = cleanNumeric(mapping.cogs ? row[mapping.cogs] : 0, 45);
    
    // Ads % (handles both decimals like 0.16 and percentage strings like "16%")
    let adSpendPercent = 16;
    if (mapping.adSpendPercent && row[mapping.adSpendPercent] !== undefined && row[mapping.adSpendPercent] !== '') {
      const rawAds = cleanNumeric(row[mapping.adSpendPercent], 16);
      adSpendPercent = rawAds <= 1.0 ? Number((rawAds * 100).toFixed(1)) : rawAds;
    }

    // Liters
    const volumeLiters = cleanNumeric(mapping.volumeLiters ? row[mapping.volumeLiters] : 0, 0.1);

    // Tax price (E)
    const taxPrice = mapping.taxPrice && row[mapping.taxPrice] !== undefined && row[mapping.taxPrice] !== ''
      ? cleanNumeric(row[mapping.taxPrice], retailPrice)
      : retailPrice;

    // DDV & LP
    const ddvRub = mapping.ddvRub && row[mapping.ddvRub] !== undefined && row[mapping.ddvRub] !== ''
      ? cleanNumeric(row[mapping.ddvRub], 7.5)
      : 7.5;

    const lpRub = mapping.lpRub && row[mapping.lpRub] !== undefined && row[mapping.lpRub] !== ''
      ? cleanNumeric(row[mapping.lpRub], 0.1)
      : 0.1;

    const fulfillmentFixed = mapping.fulfillmentFixed && row[mapping.fulfillmentFixed] !== undefined && row[mapping.fulfillmentFixed] !== ''
      ? cleanNumeric(row[mapping.fulfillmentFixed], 10)
      : 10;

    const crossDockFixed = mapping.crossDockFixed && row[mapping.crossDockFixed] !== undefined && row[mapping.crossDockFixed] !== ''
      ? cleanNumeric(row[mapping.crossDockFixed], 1.63)
      : 1.63;

    let taxPercent = 11;
    if (mapping.taxPercent && row[mapping.taxPercent] !== undefined && row[mapping.taxPercent] !== '') {
      const rawTax = cleanNumeric(row[mapping.taxPercent], 11);
      taxPercent = rawTax <= 1.0 ? Number((rawTax * 100).toFixed(1)) : rawTax;
    }

    const plannedSalesUnits = mapping.plannedSalesUnits && row[mapping.plannedSalesUnits] !== undefined && row[mapping.plannedSalesUnits] !== ''
      ? cleanNumeric(row[mapping.plannedSalesUnits], 150)
      : 150;

    return {
      id: `imported_${Date.now()}_${index}`,
      sku,
      title,
      category,
      retailPrice,
      cogs,
      volumeLiters,
      adSpendPercent,
      taxPrice,
      ddvRub,
      lpRub,
      fulfillmentFixed,
      crossDockFixed,
      lastMilePercent: 4.9,
      acquiringPercent: 1.5,
      commissionUnder300: 23,
      commissionOver300: 52,
      forceMajeurePercent: 1.0,
      taxPercent,
      plannedSalesUnits,
    };
  });
}

// Generate sample Excel template matching user's real Ozon store spreadsheet
export function generateSampleTemplateExcel(): void {
  const sampleData = [
    {
      '№': 1,
      'Название товара': 'Китайская чудо мазь зеленая',
      'Артикул': 'OZN3493060723',
      'Цена продажи, ₽ предельная': 240,
      'Цена реализации для налога': 216,
      'Закупка / себест, ₽': 40,
      'Литраж, л': 0.29,
      'Реклама, %': '16%',
      'ДДВ, ₽': 7.91,
      'ЛП, ₽': 0.14,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 300,
    },
    {
      '№': 2,
      'Название товара': 'Тушь Hyper Curl',
      'Артикул': 'OZN4497059559',
      'Цена продажи, ₽ предельная': 275,
      'Цена реализации для налога': 228,
      'Закупка / себест, ₽': 50,
      'Литраж, л': 0.10,
      'Реклама, %': '16%',
      'ДДВ, ₽': 6.95,
      'ЛП, ₽': 0.04,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 250,
    },
    {
      '№': 3,
      'Название товара': 'Крем роллер Sadoer золотой',
      'Артикул': 'OZN3492926989',
      'Цена продажи, ₽ предельная': 280,
      'Цена реализации для налога': 228,
      'Закупка / себест, ₽': 63,
      'Литраж, л': 0.18,
      'Реклама, %': '10%',
      'ДДВ, ₽': 8.36,
      'ЛП, ₽': 0.13,
      'Кросс-док, ₽': 1.63,
      'ФФ, ₽': 10,
      'Налог, %': '11%',
      'План продаж (шт)': 150,
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'UNIT по товарам');
  XLSX.writeFile(wb, 'Юнит_Экономика_Ozon_Шаблон.xlsx');
}

// Export calculated products with complete financial breakdown to Excel
export function exportProductsToExcel(products: ProductUnitData[]): void {
  const exportRows = products.map((prod, index) => {
    const calc: UnitEconomicsResult = calculateUnitEconomics(prod);

    return {
      '№': index + 1,
      'Название товара': prod.title,
      'Артикул': prod.sku,
      'Штрихкод': prod.barcode || '',
      'Склад': calc.warehouse,
      
      // 5 Изменяемых параметров пользователя
      'Цена продажи предельная, ₽': calc.retailPrice,
      'Цена для налога (база 11%), ₽': calc.taxPrice,
      'Закупка / себест, ₽': calc.cogs,
      'Литраж, л': prod.volumeLiters,
      'Реклама, %': `${prod.adSpendPercent}%`,
      
      // Расходы
      'Тариф лог, ₽': calc.baseLogisticsTariff,
      'Посл. миля, ₽': Number(calc.lastMileRub.toFixed(2)),
      'Эквайринг, ₽': Number(calc.acquiringRub.toFixed(2)),
      'Кросс-док, ₽': Number(calc.crossDockRub.toFixed(2)),
      'ДДВ, ₽': Number(calc.ddvRub.toFixed(2)),
      'ЛП, ₽': Number(calc.lpRub.toFixed(2)),
      'Логистика ИТОГО, ₽': Number(calc.totalLogisticsRub.toFixed(2)),
      
      'Комиссия Ozon, ₽': Number(calc.commissionRub.toFixed(2)),
      'ФФ, ₽': calc.fulfillmentRub,
      'Реклама, ₽': Number(calc.adSpendRub.toFixed(2)),
      'Налог, ₽': Number(calc.taxRub.toFixed(2)),
      'Форс-мажор, ₽': Number(calc.forceMajeureRub.toFixed(2)),
      
      // Итоговые результаты
      'ИТОГО расходов, ₽': Number(calc.totalExpensesRub.toFixed(2)),
      'ПРИБЫЛЬ ед, ₽': Number(calc.netProfitPerUnit.toFixed(2)),
      'ROI %': `${calc.roiPercent.toFixed(1)}%`,
      'Маржа %': `${calc.marginPercent.toFixed(1)}%`,
      'Точка безубыточности, ₽': Number(calc.breakEvenPrice.toFixed(0)),
      'Предельный % рекламы': `${calc.maxAllowableAdPercent.toFixed(1)}%`,
      
      'План продаж в мес (шт)': prod.plannedSalesUnits,
      'Чистая прибыль в месяц (₽)': Number(calc.monthlyNetProfit.toFixed(0)),
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'UNIT по товарам');
  
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Юнит_Экономика_Магазина_${dateStr}.xlsx`);
}
