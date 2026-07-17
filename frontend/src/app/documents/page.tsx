"use client";

import { useEffect, useState, useRef } from "react";
import { getDocuments, uploadDocument, deleteDocument } from "@/features/documents/api/documents.api";
import { Button } from "@/components/ui/button";
import { 
  ScanLine, 
  Settings, 
  Puzzle, 
  ChevronDown, 
  MoreVertical,
  FileImage,
  FileText,
  File as FileIcon,
  Loader2,
  Upload,
  Eye,
  Download,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await getDocuments(statusFilter !== "All" ? { status: statusFilter } : {});
      setDocuments(res.data || []);
    } catch (error) {
      console.error("Failed to load documents", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await uploadDocument(formData);
      fetchDocuments(); // Refresh list
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload document. Make sure Cloudinary is configured.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDocument(id);
      fetchDocuments();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5 text-[#0076f2]" />;
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <FileIcon className="w-5 h-5 text-slate-500" />;
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      
      {/* Header */}
      <div className="h-16 px-6 bg-white flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-slate-900">Files</h1>
        
        <div className="flex items-center space-x-3 text-sm">
          <Button variant="secondary" className="bg-blue-50 hover:bg-blue-100 text-[#0076f2] border-0 h-9 rounded">
            <ScanLine className="w-4 h-4 mr-2" />
            Available Autoscans: 2
          </Button>
          
          <Button variant="secondary" className="bg-blue-50 hover:bg-blue-100 text-[#0076f2] border-0 h-9 rounded">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
          
          <div className="flex items-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded h-9">
            <Puzzle className="w-4 h-4 text-blue-500 mr-2" />
            <span className="text-slate-700 font-medium mr-2">Use Advanced Autoscan.</span>
            <a href="#" className="text-[#0076f2] font-semibold hover:underline">Buy Addon <span className="ml-1">›</span></a>
          </div>

          <div className="flex">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#4285f4] hover:bg-[#3367d6] text-white h-9 rounded-l rounded-r-none px-4"
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload File
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-[#4285f4] hover:bg-[#3367d6] text-white rounded-l-none px-2 border-l border-[#3367d6] inline-flex shrink-0 items-center justify-center h-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>Upload File</DropdownMenuItem>
                <DropdownMenuItem>Upload Folder</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Button variant="outline" size="icon" className="border-slate-200 h-9 w-9 rounded">
            <MoreVertical className="w-4 h-4 text-slate-600" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-y border-slate-100 bg-slate-50/50 flex items-center text-[13px]">
        <span className="text-slate-600 mr-2">Filter By :</span>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-slate-700 font-medium hover:text-slate-900 outline-none">
            Status: <span className="text-slate-900 ml-1">{statusFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#0076f2]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter("All")}>All</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Unreadable")}>Unreadable</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Pending")}>Pending</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("Processed")}>Processed</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 w-10">
                  <input type="checkbox" className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]" />
                </th>
                <th className="px-4 py-3 font-semibold">FILE NAME</th>
                <th className="px-4 py-3 font-semibold">DETAILS</th>
                <th className="px-4 py-3 font-semibold">UPLOADED BY</th>
                <th className="px-4 py-3 font-semibold">UPLOADED ON</th>
                <th className="px-4 py-3 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <p className="text-[15px] text-slate-500">No files found.</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc: any) => (
                  <tr key={doc._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-slate-300 text-[#0076f2] focus:ring-[#0076f2]" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-[13px]">{doc.fileName}</p>
                          {doc.status === 'Unreadable' && (
                            <span className="inline-block mt-1 px-2 py-0.5 border border-orange-200 text-orange-500 bg-orange-50 text-[11px] rounded font-medium">
                              Unreadable
                            </span>
                          )}
                          {doc.status === 'Pending' && (
                            <span className="inline-block mt-1 px-2 py-0.5 border border-slate-200 text-slate-500 bg-slate-50 text-[11px] rounded font-medium">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[13px] text-slate-600">
                      {doc.sourceType ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[11px] font-medium">
                          {doc.sourceType} {doc.sourceId ? `#${doc.sourceId.substring(0,6)}` : ''}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-slate-800 font-medium">
                      {doc.uploadedBy?.name || 'Me'}
                    </td>
                    <td className="px-4 py-4 text-[13px] text-slate-600">
                      {new Date(doc.uploadedOn).toLocaleString('en-GB', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', hour12: true 
                      })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={doc.url} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                        <a href={doc.url} download={doc.fileName} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button onClick={() => handleDelete(doc._id)} variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}