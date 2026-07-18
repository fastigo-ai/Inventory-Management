import React, { useState } from 'react';
import { useController } from 'react-hook-form';
import { api } from '@/shared/api/axios';
import { Loader2, UploadCloud, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadWidgetProps {
  control: any;
  name: string;
}

export function FileUploadWidget({ control, name }: FileUploadWidgetProps) {
  const { field } = useController({ name, control });
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success && response.data.data) {
        field.onChange(response.data.data.url);
      } else {
        setError('Upload failed');
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err?.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      {field.value ? (
        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-slate-50">
          <div className="flex items-center space-x-3 overflow-hidden">
            <File className="w-5 h-5 text-blue-500 shrink-0" />
            <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline truncate">
              {field.value.split('/').pop()}
            </a>
          </div>
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"
            onClick={() => field.onChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <div className={`flex items-center justify-center p-4 border-2 border-dashed rounded-md transition-colors ${isUploading ? 'border-blue-300 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}>
            {isUploading ? (
              <div className="flex items-center space-x-2 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-slate-500">
                <UploadCloud className="w-5 h-5" />
                <span className="text-sm font-medium">Click or drag file to upload</span>
              </div>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
