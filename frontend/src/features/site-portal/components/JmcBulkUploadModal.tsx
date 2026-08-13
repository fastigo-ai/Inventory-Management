import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadJmcExcel } from '../api/jmc.api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function JmcBulkUploadModal({ open, onOpenChange, onSuccess }: Props) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!files || files.length === 0) return;
    
    try {
      setUploading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await uploadJmcExcel(formData);
      setResult(res.data);
      if (res.data?.flagged?.length === 0) {
        onSuccess();
        setTimeout(() => onOpenChange(false), 2000);
      } else {
        onSuccess(); // Still refresh list for saved records
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading files');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload JMC/WIP Sheets</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Select one or more Excel (.xlsx) files. The system will unpivot the data, match contractors and items, and generate JMC Drafts.
          </p>
          <Input 
            type="file" 
            accept=".xlsx" 
            multiple 
            onChange={(e) => setFiles(e.target.files)} 
            disabled={uploading}
          />

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
          
          {result && (
            <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-md space-y-2">
              <p className="font-semibold">Successfully imported {result.totalSaved} JMC records.</p>
              {result.flagged?.length > 0 && (
                <div className="mt-2 text-orange-700">
                  <p className="font-semibold mb-1">Warnings ({result.flagged.length}):</p>
                  <ul className="list-disc pl-4 space-y-1 max-h-32 overflow-y-auto">
                    {result.flagged.map((f: any, i: number) => (
                      <li key={i}>{f.sourceFile} - {f.issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Close
          </Button>
          <Button onClick={handleUpload} disabled={!files || files.length === 0 || uploading}>
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
