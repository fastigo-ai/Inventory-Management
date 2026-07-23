import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowUp, ArrowDown, Save, GripVertical } from "lucide-react";
import { FieldMetadata } from "./DynamicForm";

interface ChangeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: FieldMetadata[];
  onSave: (reorderedFields: FieldMetadata[]) => void;
}

export function ChangeOrderModal({ isOpen, onClose, fields, onSave }: ChangeOrderModalProps) {
  const [localFields, setLocalFields] = useState<FieldMetadata[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalFields([...fields].sort((a, b) => a.order - b.order));
    }
  }, [isOpen, fields]);

  if (!isOpen) return null;

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFields = [...localFields];
    const temp = newFields[index - 1];
    newFields[index - 1] = newFields[index];
    newFields[index] = temp;
    setLocalFields(newFields);
  };

  const moveDown = (index: number) => {
    if (index === localFields.length - 1) return;
    const newFields = [...localFields];
    const temp = newFields[index + 1];
    newFields[index + 1] = newFields[index];
    newFields[index] = temp;
    setLocalFields(newFields);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    // For visual feedback
    const target = e.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newFields = [...localFields];
      const draggedFieldContent = newFields.splice(dragItem.current, 1)[0];
      newFields.splice(dragOverItem.current, 0, draggedFieldContent);
      setLocalFields(newFields);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // necessary to allow dropping
  };

  const handleSave = () => {
    const reorderedFields = localFields.map((f, i) => ({ ...f, order: i }));
    onSave(reorderedFields);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">Change Field Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
          <div className="space-y-2">
            {localFields.map((field, index) => (
              <div 
                key={field.name} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                className="flex items-center justify-between bg-white p-3 rounded-md border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <GripVertical className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate mr-2 select-none">{field.label}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  <button 
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => moveDown(index)}
                    disabled={index === localFields.length - 1}
                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0 bg-white rounded-b-lg">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Save Order
          </Button>
        </div>
      </div>
    </div>
  );
}
