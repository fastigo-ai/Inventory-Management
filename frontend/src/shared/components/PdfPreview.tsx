"use client";

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  fileUrl: string;
}

export function PdfPreview({ fileUrl }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 border border-slate-200 rounded p-4 print:p-0 print:border-none print:bg-white overflow-hidden">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col gap-4 items-center w-full"
        loading={<div className="text-sm text-slate-500 py-10">Loading PDF...</div>}
        error={<div className="text-sm text-red-500 py-10">Failed to load PDF.</div>}
      >
        {numPages && Array.from(new Array(numPages), (el, index) => (
          <div key={`page_${index + 1}`} className="shadow-md bg-white border border-slate-200 print:shadow-none print:border-none w-full max-w-full overflow-hidden print:break-inside-avoid print:mb-8">
            <Page
              pageNumber={index + 1}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="max-w-full flex justify-center"
              width={750}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
