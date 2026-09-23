const fs = require('fs');
const path = 'frontend/src/app/ho-billing/contractor-work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const oldHandleStr = `  const handleHandoverSubmit = async () => {
    if (!handoverContractorId) return toast.error('Please select a new contractor');
    setIsHandovering(true);
    try {
      await api.post(\`/contractor-work-orders/\${id}/handover\`, {
        newContractorId: handoverContractorId,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful! Drafts created.');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to process handover');
    } finally {
      setIsHandovering(false);
    }
  };`;

const newHandleStr = `  const handleHandoverSubmit = async () => {
    try {
      setIsHandovering(true);
      const assignmentsArr = Object.entries(handoverAssignments).map(([idx, cId]) => ({
        itemIndex: Number(idx),
        contractorId: cId
      }));
      
      await api.post(\`/contractor-work-orders/\${workOrder._id}/handover\`, {
        assignments: assignmentsArr,
        materialDisposition: 'TRANSFER_TO_NEW_CONTRACTOR'
      });
      toast.success('Handover successful');
      setIsHandoverModalOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error('Failed to complete handover');
    } finally {
      setIsHandovering(false);
    }
  };
  
  const handleAssignmentChange = (index: number, cId: string) => {
    setHandoverAssignments(prev => ({ ...prev, [index]: cId }));
  };
  
  const handleAssignAll = (cId: string) => {
    const newAss: Record<number, string> = {};
    if (workOrder?.items) {
       workOrder.items.forEach((_: any, idx: number) => {
         newAss[idx] = cId;
       });
    }
    setHandoverAssignments(newAss);
  };`;

code = code.replace(oldHandleStr, newHandleStr);
fs.writeFileSync(path, code);
console.log('Fixed handleHandoverSubmit');
