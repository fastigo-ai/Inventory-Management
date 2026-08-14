import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadWipExcel } from '../api/wip.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function WipBulkUploadModal({ open, onOpenChange, onSuccess }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    
    try {
      setStatus('uploading');
      setProgress(0);
      setError('');
      setResult(null);

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await uploadWipExcel(formData, (progressEvent: any) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        setProgress(percentCompleted);
        if (percentCompleted >= 100) {
          setStatus('processing');
        }
      });

      setStatus('complete');
      setResult(res.data);
      if (res.data?.flagged?.length === 0) {
        onSuccess();
        setTimeout(() => {
          onOpenChange(false);
          setStatus('idle');
          setProgress(0);
        }, 2000);
      } else {
        onSuccess(); // Still refresh list for saved records
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading files');
      setStatus('idle');
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (status !== 'uploading' && status !== 'processing') {
        onOpenChange(val);
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload WIP/WIP Sheets</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Select one or more Excel (.xlsx) files. The system will unpivot the data, match contractors and items, and generate WIP Drafts.
          </p>
          <Input 
            type="file" 
            accept=".xlsx" 
            multiple 
            onChange={(e) => setFiles(e.target.files)} 
            disabled={status === 'uploading' || status === 'processing'}
          />

          {(status === 'uploading' || status === 'processing' || status === 'complete') && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>
                  {status === 'uploading' && 'Uploading files...'}
                  {status === 'processing' && 'Processing and importing data...'}
                  {status === 'complete' && 'Complete!'}
                </span>
                <span>{status === 'uploading' ? `${progress}%` : '100%'}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${status === 'complete' ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: status === 'uploading' ? `${progress}%` : '100%' }}
                ></div>
              </div>
            </div>
          )}

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
          
          {result && status === 'complete' && (
            <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-md space-y-2">
              <p className="font-semibold">Successfully imported {result.totalSaved} WIP records.</p>
              {result.flagged?.length > 0 && (
                <div className="mt-2 text-orange-700">
                  <p className="font-semibold mb-1">Warnings ({result.flagged.length}):</p>
                  <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto">
                    {result.flagged.map((f: any, i: number) => (
                      <li key={i}>{f.sourceFile}{f.sheetName ? ` (${f.sheetName})` : ''} - {f.issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setStatus('idle');
              setProgress(0);
              setResult(null);
            }} 
            disabled={status === 'uploading' || status === 'processing'}
          >
            Close
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!files || files.length === 0 || status === 'uploading' || status === 'processing'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {status === 'uploading' ? 'Uploading...' : status === 'processing' ? 'Processing...' : 'Upload & Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
