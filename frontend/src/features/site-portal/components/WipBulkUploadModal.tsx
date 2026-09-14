import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadWipExcel } from '../api/wip.api';
import { API_BASE_URL } from '@/shared/api/axios';

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
  const [stageMessage, setStageMessage] = useState<string>('');

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    
    try {
      setStatus('uploading');
      setProgress(0);
      setError('');
      setResult(null);

      const clientId = Math.random().toString(36).substring(2, 15);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      formData.append('clientId', clientId);

      // Connect to SSE before starting the upload
      const eventSource = new EventSource(`${API_BASE_URL}/api/sse/events?clientId=${clientId}`);
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.progress) setProgress(data.progress);
        if (data.message) setStageMessage(data.message);
        
        if (data.stage === 'COMPLETED' || data.stage === 'ERROR') {
          eventSource.close();
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      const res = await uploadWipExcel(formData);

      eventSource.close();

      setStatus('complete');
      setStageMessage('Complete!');
      setProgress(100);
      setResult(res.data);
      if (res.data?.flagged?.length === 0) {
        onSuccess();
        setTimeout(() => {
          onOpenChange(false);
          setStatus('idle');
          setProgress(0);
          setStageMessage('');
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Select one or more Excel (.xlsx) files. The system will unpivot the data, match contractors and items, and generate WIP Drafts.
            </p>
            <a href="/wip_consumed_bulk_upload_sample.xlsx" download className="shrink-0 ml-3">
              <Button type="button" variant="outline" size="sm" className="bg-white hover:bg-slate-50 text-[#0076f2] border-[#0076f2]/20 text-xs">
                Download Sample
              </Button>
            </a>
          </div>
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
                  {stageMessage || (status === 'uploading' ? 'Uploading files...' : 'Processing...')}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${status === 'complete' ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${progress}%` }}
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
