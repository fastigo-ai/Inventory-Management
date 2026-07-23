import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { assignContractorLocations } from '../api/contractors.api';
import { Loader2 } from 'lucide-react';

interface AssignContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractor: any | null;
  onSuccess: () => void;
}

const AVAILABLE_CIRCLES = ['Solan', 'Nahan', 'Rampur', 'Rohru'];

export function AssignContractorModal({ isOpen, onClose, contractor, onSuccess }: AssignContractorModalProps) {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (contractor && isOpen) {
      setSelectedLocations(contractor.assignedLocations || []);
    }
  }, [contractor, isOpen]);

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const handleSave = async () => {
    if (!contractor) return;
    
    setIsSubmitting(true);
    try {
      await assignContractorLocations(contractor._id, selectedLocations);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign locations', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!contractor) return null;

  const displayName = contractor.dynamicData?.displayName || 'Contractor';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Circles to {displayName}</DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <p className="text-sm text-slate-500 mb-4">
            Select the circles where this contractor is active.
          </p>
          <div className="space-y-4">
            {AVAILABLE_CIRCLES.map(circle => (
              <div key={circle} className="flex items-center space-x-2">
                <Checkbox 
                  id={`circle-${circle}`} 
                  checked={selectedLocations.includes(circle)}
                  onCheckedChange={() => toggleLocation(circle)}
                />
                <label 
                  htmlFor={`circle-${circle}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {circle}
                </label>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="bg-[#0076f2] hover:bg-blue-600">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
