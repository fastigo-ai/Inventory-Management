const fs = require('fs');
const path = 'frontend/src/app/site-portal/contractor-billing/new/page.tsx';
let code = fs.readFileSync(path, 'utf8');

const autoPopulateBlock = `  // Auto-populate line items when a JMC is selected
  useEffect(() => {
    if (selectedJmcId && billingCategory === 'Contractor Bill') {
      const jmc = availableJmcs.find(j => String(j._id) === String(selectedJmcId));
      if (jmc && jmc.items) {
        const newItems = jmc.items.map((item: any) => {
          const tc = String(item.tempCode || (typeof item.itemId === 'object' ? item.itemId.dynamicData?.tempCode : '')).trim();
          const loaNo = String(item.loaSrNo || item.loaSerialNo || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.loaSrNo || item.itemId.dynamicData?.sku) : '')).trim();
          const key = \`\${tc}_\${loaNo}\`;
          
          const maxQty = Math.max(0, (jmcItemMap[key] || 0) - (prevBilledJmcMap[key] || 0));
          
          const act = item.activity || (typeof item.itemId === 'object' ? item.itemId.dynamicData?.activity : '');
          const itemName = item.description || (typeof item.itemId === 'object' ? (item.itemId.dynamicData?.itemName || item.itemId.dynamicData?.description || item.itemId.itemName) : '');
          const unit = item.unit || (typeof item.itemId === 'object' ? item.itemId.dynamicData?.unit : '');
          const rate = item.rate || (typeof item.itemId === 'object' ? item.itemId.dynamicData?.rate : 0);
          
          return {
            itemId: typeof item.itemId === 'object' ? item.itemId._id : item.itemId,
            activity: act,
            description: itemName,
            rate: rate,
            jmcDoneQty: maxQty,
            erectedQty: maxQty,
            gstRate: 18,
            tempCode: tc,
            loaSerialNo: loaNo,
            loaQty: item.totalLoaQty || 0
          };
        });
        
        // Filter out items that have 0 maxQty if we want, or keep them. Let's keep them so the user sees everything but 0 qty.
        setLineItems(newItems);
      }
    } else if (billingCategory === 'Contractor Bill' && !selectedJmcId) {
      setLineItems([]);
    }
  }, [selectedJmcId, availableJmcs, billingCategory, jmcItemMap, prevBilledJmcMap]);

`;

// Remove it from its current position
code = code.replace(autoPopulateBlock, '');

// Insert it right before handleAddItem
code = code.replace('  const handleAddItem = () => {', autoPopulateBlock + '  const handleAddItem = () => {');

fs.writeFileSync(path, code);
console.log("Moved auto-populate block.");
