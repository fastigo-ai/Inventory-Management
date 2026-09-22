const fs = require('fs');
const path = 'frontend/src/app/site-portal/demand-notes/new/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

// Import getContractorWorkOrders and getItemMetrics
content = content.replace(
  /import \{ getContractorWorkOrderById \} from '@\/features\/contractors\/api\/contractorWorkOrder.api';/,
  `import { getContractorWorkOrderById, getContractorWorkOrders } from '@/features/contractors/api/contractorWorkOrder.api';\nimport { getItemMetrics } from '@/features/items/api/items.api';`
);

// Add state for activities
content = content.replace(
  /const \[isItemModalOpen, setIsItemModalOpen\] = useState\(false\);/,
  `const [isItemModalOpen, setIsItemModalOpen] = useState(false);\n  const [currentActivityInput, setCurrentActivityInput] = useState('');\n  const [allActivityStats, setAllActivityStats] = useState<any[]>([]);\n  const [isLoadingItems, setIsLoadingItems] = useState(false);`
);

// Fetch activities when circle changes
content = content.replace(
  /fetchItemsList\(\)\.then\(\(fetchedItems\) => \{/,
  `// Fetch metrics for activities
    getItemMetrics({}).then(res => {
      if (res && res.data && res.data.circleActivityStats) {
        setAllActivityStats(res.data.circleActivityStats);
      }
    }).catch(() => {});

    fetchItemsList().then((fetchedItems) => {`
);

// Add useEffect for fetching work order when contractor, package, circle change
content = content.replace(
  /useEffect\(\(\) => \{\n    if \(workOrderId\) \{\n      fetchWorkOrderData\(workOrderId\);\n    \}\n  \}, \[workOrderId\]\);/,
  `useEffect(() => {
    if (workOrderId) {
      fetchWorkOrderData(workOrderId);
    } else if (formData.contractorId && formData.package && formData.circle) {
      // Auto fetch work order
      getContractorWorkOrders({ 
        filters: { 
          contractorId: formData.contractorId, 
          package: formData.package, 
          circle: formData.circle,
          handoverStatus: 'Active'
        }
      }).then(res => {
        if (res && res.data && res.data.length > 0) {
          setCurrentWorkOrder(res.data[0]);
          if (res.data[0].drawings && res.data[0].drawings.length > 0) {
            setFormData(prev => ({
              ...prev,
              drawingNumber: res.data[0].drawings[0].drawingNumber,
              division: res.data[0].drawings[0].division,
              subDivision: res.data[0].drawings[0].subDivision,
              location: res.data[0].drawings[0].location,
            }));
          }
        } else {
          setCurrentWorkOrder(null);
        }
      }).catch(err => console.error("Failed to fetch WO", err));
    }
  }, [workOrderId, formData.contractorId, formData.package, formData.circle]);`
);

// Add handleAddActivity function
const handleAddActivityFunc = `
  const handleAddActivity = () => {
    if (!currentActivityInput) {
      toast.error('Please select an activity to add');
      return;
    }
    setIsLoadingItems(true);
    getItems({ 
      filters: {
        activity: currentActivityInput, 
        circle: formData.circle, 
        package: formData.package
      },
      limit: 5000 
    }).then(res => {
      const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
      if (fetchedItems.length === 0) {
        toast.info('No items found for this activity in this circle/package');
        return;
      }
      handleAddNewItem(fetchedItems, formData.contractorId);
      setCurrentActivityInput('');
      toast.success(\`Added \${fetchedItems.length} items from activity\`);
    }).catch(err => {
      toast.error('Failed to fetch items for activity');
    }).finally(() => {
      setIsLoadingItems(false);
    });
  };
`;
content = content.replace(
  /const removeItemRow = \(index: number\) => \{/,
  `${handleAddActivityFunc}\n\n  const removeItemRow = (index: number) => {`
);

// Add UI for Activity selection next to "Add Item" button
const addActivityUI = `
          <div className="flex items-center gap-2">
            <select
              value={currentActivityInput}
              onChange={(e) => setCurrentActivityInput(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Select Activity</option>
              {allActivityStats
                .filter((s: any) => s._id?.circle === formData.circle)
                .map((s: any) => s._id?.activity)
                .filter((id: any) => typeof id === 'string' && id.trim() !== '')
                .map((act: string, idx: number) => (
                  <option key={idx} value={act}>{act}</option>
                ))
              }
            </select>
            <Button onClick={handleAddActivity} disabled={!currentActivityInput || isLoadingItems} variant="outline" size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
              {isLoadingItems ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Activity
            </Button>
            <Button onClick={() => setIsItemModalOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
`;

content = content.replace(
  /<Button onClick=\{\(\) => setIsItemModalOpen\(true\)\} variant="outline" size="sm" className="flex items-center gap-2">\n\s*<Plus className="w-4 h-4" \/> Add Item\n\s*<\/Button>/,
  addActivityUI
);

fs.writeFileSync(path, content, 'utf-8');
console.log("Patched demand-notes/new/page.tsx");
