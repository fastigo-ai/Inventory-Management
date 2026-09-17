import Item from '../modules/items/item.model';

export const validateLineItemsUnit = async (lineItems: any[]) => {
  if (!lineItems || lineItems.length === 0) return { isValid: true };

  const itemIds = lineItems.map(i => i.itemId).filter(Boolean);
  if (itemIds.length === 0) return { isValid: true };

  const masterItems = await Item.find({ _id: { $in: itemIds } }).lean();

  for (const item of lineItems) {
    if (item.itemId && item.unit) {
      const masterItem = masterItems.find(mi => mi._id.toString() === item.itemId.toString());
      if (masterItem) {
        const uom = masterItem.dynamicData?.uom || masterItem.dynamicData?.unit;
        if (uom && uom.toLowerCase() !== item.unit.toLowerCase()) {
          return {
            isValid: false,
            message: `Unit mismatch for item '${masterItem.dynamicData?.sku || masterItem.dynamicData?.name || 'Unknown'}'. Master Item list specifies '${uom}', but you provided '${item.unit}'.`
          };
        }
      }
    }
  }

  return { isValid: true };
};
