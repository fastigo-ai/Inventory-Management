const fs = require('fs');
const path = './frontend/src/app/site-portal/contractor-billing/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update imports
content = content.replace(
  "import { createContractorInvoice } from '@/features/contractor-billing/api/contractor-billing.api';",
  "import { updateContractorInvoice, getContractorInvoiceById } from '@/features/contractor-billing/api/contractor-billing.api';\nimport { use } from 'react';"
);

// Update component signature
content = content.replace(
  "export default function NewContractorBill() {",
  "export default function EditContractorBill({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = use(params);"
);

// Add fetch useEffect
const fetchEffect = `
  useEffect(() => {
    if (id) {
      getContractorInvoiceById(id).then(res => {
        if (res.success && res.data) {
          const inv = res.data;
          setContractorId(inv.contractorId?._id || inv.contractorId);
          setWorkOrderId(inv.workOrderId?._id || inv.workOrderId || '');
          setStage(inv.stage);
          if (inv.lineItems?.length > 0) {
            setGlobalCategory(inv.lineItems[0].billingCategory);
          }
          setJmcDocUrl(inv.jmcDocUrl || '');
          setSignedBillDocUrl(inv.signedBillDocUrl || '');
          
          // Pre-populate line items
          // We need to map them to the format expected by the form
          const mappedItems = inv.lineItems.map((item: any) => ({
            ...item,
            itemId: item.itemId?._id || item.itemId,
            tempCode: '-', // Fetched from WO in view mode, leaving simple here for edit
            loaSrNo: '-',
          }));
          setLineItems(mappedItems);
        }
      }).catch(console.error);
    }
  }, [id]);
`;

content = content.replace(
  "// Items\n  const [lineItems, setLineItems] = useState<any[]>([]);",
  "// Items\n  const [lineItems, setLineItems] = useState<any[]>([]);\n" + fetchEffect
);

// Update submit handler
content = content.replace(
  "const res = await createContractorInvoice(payload);",
  "const res = await updateContractorInvoice(id, payload);"
);
content = content.replace(
  "toast.success('Contractor Invoice created successfully');\n      router.push('/site-portal/contractor-billing');",
  "toast.success('Contractor Invoice updated successfully');\n      router.push(`/site-portal/contractor-billing/${id}`);"
);

// Update header
content = content.replace(
  "<CardTitle className=\"text-2xl font-bold text-slate-800\">Create Contractor Bill</CardTitle>\n            <CardDescription>Generate a new bill for a contractor based on JMC/Erection data.</CardDescription>",
  "<CardTitle className=\"text-2xl font-bold text-slate-800\">Edit Contractor Bill</CardTitle>\n            <CardDescription>Update an existing bill for a contractor.</CardDescription>"
);
content = content.replace(
  "Create Bill",
  "Update Bill"
);

// Remove the strict override of lineItems when workOrderId changes if we already have items from the invoice
// Actually, new/page sets lineItems whenever workOrders or JMC changes.
// To prevent overriding the pre-populated items, we should only set lineItems if it's empty, or add a flag `isEditingLoaded`.
content = content.replace(
  "setLineItems(itemsToSet);",
  "if (lineItems.length === 0) setLineItems(itemsToSet);"
);


fs.writeFileSync(path, content);
console.log('Edit page updated successfully.');
