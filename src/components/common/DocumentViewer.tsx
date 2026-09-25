import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Download, ExternalLink, Trash2, Eye, Calendar, User, FileCheck } from 'lucide-react';
import { DocumentRecord } from '../../services/documentService';
import { Modal } from './Modal';

interface DocumentViewerProps {
  documents: DocumentRecord[];
  onDelete?: (doc: DocumentRecord) => void;
  canDelete?: boolean;
  title?: string;
  allowFilter?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  onDelete,
  canDelete = false,
  title = 'Supporting Documents & Evidence',
  allowFilter = true,
}) => {
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredDocs = documents.filter((doc) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'IMAGES') return doc.mimeType.startsWith('image/');
    if (filterType === 'PDFS') return doc.mimeType === 'application/pdf';
    return doc.documentType === filterType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-600" />
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {documents.length} attachment{documents.length === 1 ? '' : 's'} logged in secure laboratory storage.
          </p>
        </div>

        {allowFilter && documents.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({documents.length})
            </button>
            <button
              onClick={() => setFilterType('IMAGES')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                filterType === 'IMAGES' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Images ({documents.filter((d) => d.mimeType.startsWith('image/')).length})
            </button>
            <button
              onClick={() => setFilterType('PDFS')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                filterType === 'PDFS' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              PDFs ({documents.filter((d) => d.mimeType === 'application/pdf').length})
            </button>
          </div>
        )}
      </div>

      {filteredDocs.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No documents or test evidence uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isImage = doc.mimeType.startsWith('image/');
            return (
              <div
                key={doc.id}
                className="group p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-teal-500/50 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                {/* Thumbnail Preview for Images */}
                {isImage && doc.signedUrl ? (
                  <div
                    onClick={() => setPreviewDoc(doc)}
                    className="h-32 w-full rounded-lg bg-slate-900 overflow-hidden cursor-pointer relative group-hover:opacity-95 transition-opacity border border-slate-800"
                  >
                    <img src={doc.signedUrl} alt={doc.fileName} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <Eye className="w-4 h-4" /> View Image
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-3">
                    <div className="p-2 rounded bg-teal-500/10 text-teal-700 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 truncate block">{doc.fileName}</span>
                      <span className="text-[10px] text-slate-500 font-mono block">{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>
                )}

                {/* Metadata Details */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                      {doc.documentType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{formatFileSize(doc.fileSize)}</span>
                  </div>
                  {doc.description && <p className="text-[11px] text-slate-600 line-clamp-2">{doc.description}</p>}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {doc.uploadedByName || 'Officer'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {(doc.uploadedAt || '').substring(0, 10)}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                  {doc.signedUrl && (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-slate-600 hover:text-teal-700 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Open / Download Document"
                    >
                      <Download className="w-3.5 h-3.5" /> Open
                    </a>
                  )}

                  {canDelete && onDelete && (
                    <button
                      onClick={() => onDelete(doc)}
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors"
                      title="Delete Evidence"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Modal Large Preview */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.fileName}
          subtitle={`Type: ${previewDoc.documentType} • Size: ${formatFileSize(previewDoc.fileSize)}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-center">
            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800">
              <img src={previewDoc.signedUrl} alt={previewDoc.fileName} className="max-h-[55vh] object-contain mx-auto" />
            </div>
            {previewDoc.description && <p className="text-xs text-slate-600 italic">{previewDoc.description}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <a
                href={previewDoc.signedUrl}
                download={previewDoc.fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> Download Original Image
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
