const fs = require('fs');
const path = 'frontend/src/app/site-portal/contractor-billing/new/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Revert the useEffect logic
const badUseEffect = `  useEffect(() => {
    if (!user) return;
    
    let pkg = user?.assignedPackage;
    let cir = user?.assignedCircle;
    
    const filters: any = {};
    if (pkg) filters.package = pkg;
    if (cir) filters.circle = cir;

    getItems({ 
      filters, 
      limit: 50000 
    }).then(res => {
      const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
      
      // Also manually extract full item objects from all JMCs just in case they aren't in the global list
      const extraItems = new Map<string, any>();
      availableJmcs.forEach((jmc: any) => {
        if (jmc.items) {
          jmc.items.forEach((it: any) => {
            if (it.itemId && typeof it.itemId === 'object') {
              extraItems.set(String(it.itemId._id), it.itemId);
            }
          });
        }
      });
      
      const allItemsMap = new Map<string, any>();
      fetchedItems.forEach((i: any) => allItemsMap.set(String(i._id), i));
      extraItems.forEach((val, key) => {
        if (!allItemsMap.has(key)) allItemsMap.set(key, val);
      });
      
      setAvailableItems(Array.from(allItemsMap.values()));
    }).catch(console.error);
  }, [user, availableJmcs]);`;

const goodUseEffect = `  useEffect(() => {
    let pkg = user?.assignedPackage;
    let cir = user?.assignedCircle;

    if (pkg && cir) {
      getItems({ 
        filters: { 
          package: pkg, 
          circle: cir 
        }, 
        limit: 50000 
      }).then(res => {
        const fetchedItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];
        setAvailableItems(fetchedItems);
      });
    } else {
      setAvailableItems([]);
    }
  }, [user]);`;

code = code.replace(badUseEffect, goodUseEffect);

// Create a combined items list right before uniqueActivities
const combinedItemsLogic = `  // Combine global items with JMC specific items
  const combinedItems = useMemo(() => {
    const allItemsMap = new Map<string, any>();
    
    availableItems.forEach((i: any) => allItemsMap.set(String(i._id), i));
    
    if (selectedJmcId) {
      const jmc = availableJmcs.find(j => String(j._id) === String(selectedJmcId));
      if (jmc && jmc.items) {
        jmc.items.forEach((it: any) => {
          if (it.itemId && typeof it.itemId === 'object') {
            if (!allItemsMap.has(String(it.itemId._id))) {
              allItemsMap.set(String(it.itemId._id), it.itemId);
            }
          }
        });
      }
    }
    
    return Array.from(allItemsMap.values());
  }, [availableItems, availableJmcs, selectedJmcId]);

  const uniqueActivities = useMemo(() => {`;

code = code.replace('  const uniqueActivities = useMemo(() => {', combinedItemsLogic);

// Replace availableItems with combinedItems in uniqueActivities
code = code.replace(/availableItems\.forEach\(ai/g, 'combinedItems.forEach(ai');

// In the item dropdown, replace availableItems with combinedItems
code = code.replace(/{availableItems\n                          \.filter\(ai/g, '{combinedItems\n                          .filter(ai');

fs.writeFileSync(path, code);
