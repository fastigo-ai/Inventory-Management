'use client';

import { FileText, ExternalLink, Image as ImageIcon, File } from 'lucide-react';

interface DocumentAttachmentProps {
  url: string;
  label?: string;
}

const getFileType = (url: string): 'pdf' | 'image' | 'other' => {
  const lower = url.toLowerCase();
  if (lower.includes('.pdf') || lower.includes('pdf')) return 'pdf';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)/) || lower.includes('image')) return 'image';
  return 'other';
};

const getFilename = (url: string): string => {
  try {
    const parts = url.split('/');
    const last = parts[parts.length - 1];
    // Strip Cloudinary version prefix and query params
    return decodeURIComponent(last.split('?')[0].replace(/^v\d+\//, ''));
  } catch {
    return 'Attached Document';
  }
};

export function DocumentAttachment({ url, label }: DocumentAttachmentProps) {
  if (!url) return null;

  const fileType = getFileType(url);
  const filename = label || getFilename(url);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        Attached Document
      </h2>

      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors group">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          {fileType === 'pdf' && <FileText className="w-6 h-6 text-red-500" />}
          {fileType === 'image' && <ImageIcon className="w-6 h-6 text-blue-500" />}
          {fileType === 'other' && <File className="w-6 h-6 text-slate-500" />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate" title={filename}>
            {filename}
          </p>
          <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wide font-medium">
            {fileType === 'pdf' ? 'PDF Document' : fileType === 'image' ? 'Image File' : 'Attached File'}
          </p>
        </div>

        {/* Open button */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shrink-0"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View
        </a>
      </div>

      {/* Inline image preview */}
      {fileType === 'image' && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 max-h-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={filename}
            className="w-full h-full object-contain bg-slate-100"
          />
        </div>
      )}
    </div>
  );
}
