import React, { useState, useRef } from 'react';
import { ProductUnitData } from '../types/unitEconomics';
import {
  parseExcelFile,
  autoDetectColumns,
  convertRowsToProducts,
  generateSampleTemplateExcel,
  ColumnMapping
} from '../utils/excelHelper';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Download,
  HelpCircle,
  Tag,
  DollarSign,
  Box,
  Percent
} from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProducts: (products: ProductUnitData[], mode: 'replace' | 'append') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportProducts,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
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
  });

  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (selectedFile: File) => {
    try {
      setLoading(true);
      setError(null);
      setFile(selectedFile);

      const { headers: parsedHeaders, rawRows: parsedRows } = await parseExcelFile(selectedFile);
      setHeaders(parsedHeaders);
      setRawRows(parsedRows);

      // Auto-detect columns using synonyms
      const detected = autoDetectColumns(parsedHeaders);
      setMapping(detected);

      setStep('mapping');
    } catch (err: any) {
      setError(err?.message || 'Ошибка чтения файла. Проверьте формат .xlsx, .xls или .csv');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFinalImport = () => {
    const products = convertRowsToProducts(rawRows, mapping);
    onImportProducts(products, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#080b11]/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border border-white/[0.08] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_25px_50px_-12px_rgba(0,0,0,0.8)]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between bg-[#0a0f19]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Импорт таблицы Excel с юнит-экономикой</h2>
              <p className="text-xs text-slate-400">
                Загрузите вашу таблицу — сервис подтянет все данные для точного расчета
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-4">
              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/[0.12] hover:border-emerald-500/50 rounded-2xl p-10 text-center cursor-pointer transition-all bg-[#080b11] hover:bg-[#0a0f1b]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                  <Upload className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-sm font-bold text-white">
                  Перетащите сюда ваш файл Excel или кликните для выбора
                </div>
                <div className="text-xs text-slate-400 mt-1.5">
                  Поддерживаются файлы Excel (.xlsx, .xls, .csv) с юнит-экономикой
                </div>
              </div>

              {/* Sample Template Download */}
              <div className="p-4.5 bg-[#080b11] border border-white/[0.06] rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-white">
                    Шаблон с полями: Предельная цена, Закупка, Литраж, Реклама
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Скачайте готовый образец таблицы с формулами и заполненными тарифами
                  </div>
                </div>
                <button
                  type="button"
                  onClick={generateSampleTemplateExcel}
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать шаблон Excel</span>
                </button>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#080b11] border border-white/[0.06] rounded-xl text-xs text-slate-300">
                Загружен файл: <strong className="text-white font-mono">{file?.name}</strong> (позиций: {rawRows.length}).
                Проверьте сопоставление столбцов. 5 ключевых параметров выделены цветом:
              </div>

              {/* 5 Primary Inputs Mappers */}
              <div className="p-4 bg-[#080b11] border border-emerald-500/30 rounded-xl space-y-3.5">
                <div className="text-xs font-bold text-emerald-400">
                  5 ключевых параметров для динамического расчета (включая цену реализации):
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  {/* Retail Price */}
                  <div>
                    <label className="block text-emerald-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" /> 1. Предельная цена реализации (₽) *
                    </label>
                    <select
                      value={mapping.retailPrice}
                      onChange={(e) => setMapping({ ...mapping, retailPrice: e.target.value })}
                      className="w-full bg-[#121929] border border-emerald-500/40 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-400 font-medium cursor-pointer"
                    >
                      <option value="">(Не выбран / По умолчанию)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tax Realization Price */}
                  <div>
                    <label className="block text-cyan-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-cyan-400" /> 2. Цена реализации для налога (₽)
                    </label>
                    <select
                      value={mapping.taxPrice}
                      onChange={(e) => setMapping({ ...mapping, taxPrice: e.target.value })}
                      className="w-full bg-[#121929] border border-cyan-500/40 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400 font-medium cursor-pointer"
                    >
                      <option value="">(Если пуст — равна предельной цене)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* COGS (Закупка) */}
                  <div>
                    <label className="block text-blue-300 font-semibold mb-1 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-blue-400" /> 3. Закупка (себестоимость) (₽) *
                    </label>
                    <select
                      value={mapping.cogs}
                      onChange={(e) => setMapping({ ...mapping, cogs: e.target.value })}
                      className="w-full bg-[#121929] border border-blue-500/40 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 font-medium cursor-pointer"
                    >
                      <option value="">(Не выбран / По умолчанию)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Volume Liters */}
                  <div>
                    <label className="block text-amber-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-amber-400" /> 4. Литраж (объем в литрах, л)
                    </label>
                    <select
                      value={mapping.volumeLiters}
                      onChange={(e) => setMapping({ ...mapping, volumeLiters: e.target.value })}
                      className="w-full bg-[#121929] border border-amber-500/40 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400 font-medium cursor-pointer"
                    >
                      <option value="">(По умолчанию 0.25 л)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Ad Spend % */}
                  <div>
                    <label className="block text-pink-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-pink-400" /> 5. Процент рекламы (ДРР %)
                    </label>
                    <select
                      value={mapping.adSpendPercent}
                      onChange={(e) => setMapping({ ...mapping, adSpendPercent: e.target.value })}
                      className="w-full bg-[#121929] border border-pink-500/40 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-pink-400 font-medium cursor-pointer"
                    >
                      <option value="">(По умолчанию 5%)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Background Tariffs from Excel */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400">
                  Остальные столбцы юнит-экономики (если есть в файле):
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#080b11] p-3.5 rounded-xl border border-white/[0.06] text-xs">
                  {/* SKU */}
                  <div>
                    <label className="block text-slate-400 mb-1">Артикул</label>
                    <select
                      value={mapping.sku}
                      onChange={(e) => setMapping({ ...mapping, sku: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(Автонумерация)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-slate-400 mb-1">Наименование</label>
                    <select
                      value={mapping.title}
                      onChange={(e) => setMapping({ ...mapping, title: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(Автоимя)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Fulfillment */}
                  <div>
                    <label className="block text-slate-400 mb-1">ФФ (руб)</label>
                    <select
                      value={mapping.fulfillmentFixed}
                      onChange={(e) => setMapping({ ...mapping, fulfillmentFixed: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(По умолчанию 10 ₽)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Cross dock */}
                  <div>
                    <label className="block text-slate-400 mb-1">Кросс-докинг (руб)</label>
                    <select
                      value={mapping.crossDockFixed}
                      onChange={(e) => setMapping({ ...mapping, crossDockFixed: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(По умолчанию 1.63 ₽)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="block text-slate-400 mb-1">Налог УСН (%)</label>
                    <select
                      value={mapping.taxPercent}
                      onChange={(e) => setMapping({ ...mapping, taxPercent: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(По умолчанию 11%)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Planned units */}
                  <div>
                    <label className="block text-slate-400 mb-1">План продаж (шт/мес)</label>
                    <select
                      value={mapping.plannedSalesUnits}
                      onChange={(e) => setMapping({ ...mapping, plannedSalesUnits: e.target.value })}
                      className="w-full bg-[#121929] border border-white/[0.08] text-white rounded-lg px-2.5 py-1.5 cursor-pointer"
                    >
                      <option value="">(По умолчанию 100 шт)</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Import Mode */}
              <div className="flex items-center gap-5 text-xs text-slate-300 pt-2">
                <span className="text-slate-400 font-medium">Режим:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-emerald-500"
                  />
                  <span>Добавить к текущему списку</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-emerald-500"
                  />
                  <span>Заменить все товары</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4.5 border-t border-white/[0.06] bg-[#0a0f19] flex items-center justify-between">
          {step === 'mapping' ? (
            <button
              onClick={() => setStep('upload')}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              ← Назад к выбору файла
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Отмена
            </button>

            {step === 'mapping' && (
              <button
                onClick={handleFinalImport}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer"
              >
                <span>Импортировать {rawRows.length} позиций</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
