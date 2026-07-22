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
  const [hasError, setHasError] = useState(false);

  // Cloudinary often restricts direct fetching of PDFs for rendering via fetch() (which react-pdf uses),
  // leading to noisy 401 Unauthorized errors in the console. 
  // Since Cloudinary can automatically convert PDFs to images by changing the extension,
  // we immediately bypass react-pdf and render the JPG version for Cloudinary URLs.
  if (fileUrl.includes('res.cloudinary.com')) {
    const jpgUrl = fileUrl.replace(/\.pdf$/i, '.jpg');
    return (
      <div className="w-full flex justify-center bg-slate-50 border border-slate-200 rounded p-2 overflow-hidden print:bg-white print:border-none">
        <img src={jpgUrl} alt="Document Preview" className="max-w-full object-contain" />
      </div>
    );
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Failed to load PDF:", error);
    setHasError(true);
  }

  if (hasError) {
    // Show a small error text without the huge box
    return (
      <div className="text-sm text-slate-500 py-2 text-center w-full bg-slate-50 rounded border border-slate-200">
        Preview not available in this view. Please click the link above to open.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center bg-slate-50 border border-slate-200 rounded p-4 print:p-0 print:border-none print:bg-white overflow-hidden">
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        className="flex flex-col gap-4 items-center w-full"
        loading={<div className="text-sm text-slate-500 py-10">Loading PDF...</div>}
        error={<div className="text-sm text-slate-500 py-10">Preview not available.</div>}
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
