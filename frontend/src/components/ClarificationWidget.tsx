import { useState, useRef, type DragEvent } from 'react';
import {
  FileQuestion,
  MessageSquare,
  UploadCloud,
  Send,
  CheckCircle2,
  FileText,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../api/client';
import type { Clarification } from '../types';
import { formatDate } from '../utils';

interface Props {
  clarifications: Clarification[];
  applicationId: string;
  onResponded: () => void;
}

interface ItemProps {
  clarification: Clarification;
  applicationId: string;
  onResponded: () => void;
}

function ClarificationCard({ clarification, applicationId, onResponded }: ItemProps) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadDoc(file: File) {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append(
        'doc_type',
        clarification.required_document_type && clarification.required_document_type !== 'OTHER'
          ? clarification.required_document_type
          : 'OSV'
      );
      fd.append('uploaded_by', 'CLIENT_OWNER');
      const { data } = await api.post(`/applications/${applicationId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocId(data.document_id);
      setFileName(file.name);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Не удалось загрузить документ.'));
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadDoc(file);
    }
  }

  async function respond() {
    if (!text.trim() && !docId) return;
    setSending(true);
    setError('');
    try {
      await api.post(`/clarifications/${clarification.id}/respond`, {
        response_text: text || 'Документ прикреплён',
        document_ids: docId ? [docId] : [],
      });
      onResponded();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Не удалось отправить ответ на уточнение.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-amber-200/80 p-6 shadow-xs space-y-4 alfa-card-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
              Запрос дополнительных документов от кредитного эксперта
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Для вынесения решения банку требуются пояснения или закрывающие документы
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200/80 shrink-0">
          Ожидает ответа
        </span>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bank message card */}
      <div className="rounded-2xl bg-amber-50/60 border border-amber-100 p-4 text-xs text-amber-900 leading-relaxed font-medium space-y-2">
        <div className="flex items-start gap-2.5">
          <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <p className="text-xs font-semibold text-amber-950 leading-relaxed">
              {clarification.question_text}
            </p>
            {clarification.required_document_type && clarification.required_document_type !== 'OTHER' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/90 text-amber-900 text-[11px] font-semibold border border-amber-200">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                <span>
                  Запрашиваемый тип документа: <strong>{clarification.required_document_type}</strong>
                </span>
              </div>
            )}
            <p className="text-[10px] text-amber-700/80 font-normal">
              Запрос сформирован: {formatDate(clarification.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Response form */}
      <div className="space-y-3">
        {/* Explanation textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите пояснения для эксперта банка по запрошенным пунктам..."
          rows={3}
          className="rounded-2xl bg-[#F4F5F7] p-3 text-xs border border-transparent focus:bg-white focus:border-neutral-300 outline-none w-full text-neutral-900 placeholder:text-neutral-400 transition-all resize-none leading-relaxed"
        />

        {/* Drag and Drop attachment zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#EF3124] bg-red-50/20'
              : 'border-neutral-200 hover:border-[#EF3124]/40 bg-neutral-50/50 hover:bg-red-50/10'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadDoc(e.target.files[0])}
          />

          {uploading ? (
            <div className="flex flex-col items-center justify-center py-2 text-neutral-600 space-y-1.5">
              <Loader2 className="w-6 h-6 animate-spin text-[#EF3124]" />
              <p className="text-xs font-semibold">Загрузка документа на сервер...</p>
            </div>
          ) : docId ? (
            <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#2FA84F] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-950 truncate">
                    {fileName || 'Документ прикреплён'}
                  </p>
                  <p className="text-[10px] text-emerald-700">Файл успешно загружен и привязан к заявке</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDocId(null);
                  setFileName(null);
                }}
                className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="Удалить файл"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="py-1">
              <UploadCloud className="w-7 h-7 mx-auto text-neutral-400 group-hover:text-[#EF3124] transition-colors mb-1.5" />
              <p className="text-xs font-semibold text-neutral-800">
                Перетащите файлы сюда (договоры, выписки) или выберите на диске
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                Поддерживаются форматы PDF, PNG, JPG, XLSX (до 25 МБ)
              </p>
            </div>
          )}
        </div>

        {/* Action row with Submit button */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            onClick={respond}
            disabled={sending || uploading || (!text.trim() && !docId)}
            className="bg-[#EF3124] hover:bg-[#D9261A] text-white py-3 px-6 rounded-full font-bold text-xs shadow-xs transition-all alfa-btn flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Отправка ответа в банк...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Отправить ответ эксперту</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClarificationWidget({ clarifications, applicationId, onResponded }: Props) {
  const safeClarifs = clarifications ?? [];
  const pending = safeClarifs.filter((c) => c.status === 'PENDING');

  if (!pending.length) return null;

  return (
    <div className="space-y-4">
      {pending.map((c) => (
        <ClarificationCard
          key={c.id}
          clarification={c}
          applicationId={applicationId}
          onResponded={onResponded}
        />
      ))}
    </div>
  );
}
