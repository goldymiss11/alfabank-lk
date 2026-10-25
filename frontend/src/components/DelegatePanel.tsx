import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import {
  UserPlus,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  UploadCloud,
  FileText,
  Loader2,
  X,
  ShieldCheck,
  Check,
  AlertTriangle,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../api/client';
import { useAppStore } from '../store/appStore';

interface Props {
  applicationId: string;
  onDelegated: () => void;
}

export function DelegatePanel({ applicationId, onDelegated }: Props) {
  const { isDelegated, setIsDelegated, setUserRole } = useAppStore();
  const [done, setDone] = useState(isDelegated);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function delegate() {
    setLoading(true);
    setError('');
    try {
      await api.post(`/applications/${applicationId}/delegate`, {
        accountant_name: 'Елена Кузнецова',
        accountant_email: 'accountant@company.ru',
      });
      setDone(true);
      setIsDelegated(true);
      onDelegated();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось делегировать задачу бухгалтеру.'));
    } finally {
      setLoading(false);
    }
  }

  if (done || isDelegated) {
    return (
      <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-neutral-900 tracking-tight">
              Задача делегирована бухгалтеру
            </h4>
            <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
              Елена Кузнецова получила защищённую ссылку для загрузки финансовой отчётности
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setUserRole('ACCOUNTANT');
            onDelegated();
          }}
          className="bg-neutral-900 hover:bg-[#EF3124] text-white py-2 px-4 rounded-full font-bold text-xs transition-colors shrink-0 flex items-center gap-2 self-stretch sm:self-auto justify-center alfa-btn"
        >
          <span>Переключиться в роль бухгалтера</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 alfa-card-hover">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
          <UserPlus className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-neutral-900 tracking-tight">
            Делегировать сбор отчётности главному бухгалтеру
          </h4>
          <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
            Сэкономьте время: отправьте защищённую ссылку бухгалтеру для прикрепления ОСВ и налоговых выписок
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={delegate}
        disabled={loading}
        className="bg-neutral-900 hover:bg-[#EF3124] text-white py-2 px-4 rounded-full font-bold text-xs transition-colors shrink-0 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed self-stretch sm:self-auto justify-center alfa-btn"
      >
        {loading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Поручение отправляется...</span>
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            <span>Поручить бухгалтеру</span>
          </>
        )}
      </button>
      </div>
    </div>
  );
}

// Panel shown to accountant when task is delegated
export function AccountantTaskPanel({
  applicationId,
  onUploaded,
}: {
  applicationId: string;
  onUploaded: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('OSV_51');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lastUploadedName, setLastUploadedName] = useState<string>('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypes = [
    { id: 'OSV_51', label: 'ОСВ по счёту 51 (1С)' },
    { id: 'BALANCE_SHEET', label: 'Бухгалтерский баланс (форма №1)' },
    { id: 'TAX_DECLARATION', label: 'Налоговая декларация' },
  ];

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  }

  async function handleSend() {
    setUploading(true);
    setError('');
    try {
      if (selectedFiles.length > 0) {
        // Upload user selected files
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('doc_type', selectedDocType);
          formData.append('uploaded_by', 'CLIENT_ACCOUNTANT');
          await api.post(`/applications/${applicationId}/documents`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }
        setLastUploadedName(selectedFiles.map((f) => f.name).join(', '));
      } else {
        // Default express upload for accountant workflow
        const docName =
          selectedDocType === 'OSV_51'
            ? 'osv_schet_51_2025.xlsx'
            : selectedDocType === 'BALANCE_SHEET'
            ? 'buh_balans_form1.pdf'
            : 'tax_declaration_2025.pdf';

        const formData = new FormData();
        const blob = new Blob([`Бухгалтерская отчётность: ${selectedDocType}`], {
          type: 'text/plain',
        });
        formData.append('file', blob, docName);
        formData.append('doc_type', selectedDocType);
        formData.append('uploaded_by', 'CLIENT_ACCOUNTANT');
        await api.post(`/applications/${applicationId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setLastUploadedName(docName);
      }
      setDone(true);
      onUploaded();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Не удалось отправить документы в банк.'));
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white border border-emerald-200/80 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Отчётность успешно отправлена в банк</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Защищённый контур Альфа-Бизнес</span>
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            Бухгалтерские данные приняты конвейером
          </h3>
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
            Документы успешно прикреплены к заявке. Кредитный конвейер Альфа-Банка пересчитывает лимит в автоматическом режиме.
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-50 border border-neutral-200/70 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-neutral-800 truncate">
                {lastUploadedName || 'osv_schet_51_2025.xlsx'}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 shrink-0">
              <Check className="w-3 h-3" /> Передано в конвейер
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-[11px] text-neutral-500">
            При необходимости вы можете дополнить пакет документов
          </p>
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setSelectedFiles([]);
            }}
            className="px-4 py-2 rounded-full border border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-xs transition-colors shrink-0"
          >
            Прикрепить ещё документ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-amber-200/80 p-6 shadow-xs space-y-4 alfa-card-hover">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold">
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
          <span>Поручение от собственника компании</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800/80">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Ожидает загрузки документов</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
          Загрузка бухгалтерской отчётности для кредитного конвейера
        </h3>
        <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
          Требуется прикрепить ОСВ по счёту 51 за последние 4 квартала или налоговую декларацию за прошлый год для экспресс-подтверждения выручки
        </p>
      </div>

      {/* Document Type Selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Тип прикрепляемого документа
        </label>
        <div className="flex flex-wrap gap-2">
          {docTypes.map((dt) => {
            const isSelected = selectedDocType === dt.id;
            return (
              <button
                key={dt.id}
                type="button"
                onClick={() => setSelectedDocType(dt.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all alfa-btn ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700'
                }`}
              >
                {dt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        accept=".pdf,.xlsx,.xls,.xml,.txt,.csv"
      />

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-neutral-300 hover:border-[#EF3124]/40 rounded-2xl p-5 text-center cursor-pointer bg-neutral-50/60 hover:bg-red-50/10 transition-all group ${
          isDragging ? 'border-[#EF3124] bg-red-50/20' : ''
        }`}
      >
        <UploadCloud
          className={`w-8 h-8 mx-auto mb-2 transition-colors ${
            isDragging ? 'text-[#EF3124]' : 'text-neutral-400 group-hover:text-[#EF3124]'
          }`}
        />
        <p className="text-xs font-semibold text-neutral-800">
          Перетащите файлы 1С или выписки в формате PDF / Excel
        </p>
        <p className="text-[11px] text-neutral-400 mt-1">
          или нажмите для выбора файлов на компьютере (.xlsx, .pdf, .xml до 25 МБ)
        </p>
      </div>

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Выбранные файлы ({selectedFiles.length}):
          </p>
          <div className="space-y-1">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-neutral-100 text-xs text-neutral-800"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="text-[10px] text-neutral-400">
                    ({(file.size / 1024).toFixed(0)} КБ)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="p-1 hover:text-[#EF3124] text-neutral-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={uploading}
        className="w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3 px-6 rounded-full font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 alfa-btn disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Передача отчётности в банк...</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-4 h-4" />
            <span>Отправить отчётность в банк</span>
          </>
        )}
      </button>
    </div>
  );
}
