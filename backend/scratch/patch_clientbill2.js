const fs = require('fs');

let content = fs.readFileSync('backend/src/modules/client-billing/clientBill.controller.ts', 'utf8');

const regex = /for\s*\(const\s*r\s*of\s*billRows\)\s*\{([\s\S]*?)items\.push\(\{([\s\S]*?)\}\);\s*\}/g;

const replacer = (match, p1, p2) => {
  return `let billValid = true;
      for (const r of billRows) {
         const circleFromCsv = String(r.circle || r.circlename || '').trim();
         const mhrovNo = String(r.mhrovno || r.mhrovnumber || r.sourceref || '').trim();
         if (mhrovNo) mhrovNumbers.add(mhrovNo);
         
         const loaSrNo = String(r.loasrno || r.loaserialno || r.loa || '').trim();
         const tempCode = String(r.tempcode || r.code || '').trim();
         const itemName = String(r.itemname || r.description || '').trim();
         const diNo = String(r.dino || r.dinumber || '').trim();
         const diQty = Number(r.diqty || 0);
         
         // User circle validation
         const assignedCircle = user.assignedCircle;
         const allowedCircles = assignedCircle ? (expandCircle(assignedCircle) || [assignedCircle]) : null;
         
         // 1. Validate Circle
         if (allowedCircles && circleFromCsv && !allowedCircles.includes(circleFromCsv)) {
            results.failed++;
            results.errors.push({ raBillNo, reason: \`Circle mismatch in row. Expected \${assignedCircle}, got \${circleFromCsv}\` });
            billValid = false;
            break;
         }

         // 2. Validate Item
         let itemIdObj = allItems.find(i => 
           (i.dynamicData?.tempCode && String(i.dynamicData.tempCode).trim().toLowerCase() === tempCode.toLowerCase()) || 
           (i.dynamicData?.sku && String(i.dynamicData.sku).trim().toLowerCase() === loaSrNo.toLowerCase())
         );
         
         if (!itemIdObj) {
            results.failed++;
            results.errors.push({ raBillNo, reason: \`Item not found in master data for LOA Sr No: \${loaSrNo}, TempCode: \${tempCode}\` });
            billValid = false;
            break;
         }

         // 3. Validate DI
         if (diNo) {
             const diDoc = allDIs.find(d => String(d.diNumber).trim().toLowerCase() === diNo.toLowerCase());
             if (!diDoc) {
                 results.failed++;
                 results.errors.push({ raBillNo, reason: \`DI '\${diNo}' not found in database\` });
                 billValid = false;
                 break;
             }
             // check if DI has this item and circle matches
             const diItemMatch = diDoc.lineItems?.find((li: any) => String(li.loaSerialNo) === String(loaSrNo) || String(li.tempCode) === String(tempCode));
             if (!diItemMatch) {
                 results.failed++;
                 results.errors.push({ raBillNo, reason: \`DI '\${diNo}' does not contain LOA Sr No '\${loaSrNo}'\` });
                 billValid = false;
                 break;
             }
             if (circleFromCsv && diItemMatch.circle && diItemMatch.circle !== circleFromCsv) {
                 results.failed++;
                 results.errors.push({ raBillNo, reason: \`DI '\${diNo}' circle ('\${diItemMatch.circle}') does not match CSV circle ('\${circleFromCsv}')\` });
                 billValid = false;
                 break;
             }
         }

         // 4. Validate MHROV
         if (referenceType === 'MHROV' && mhrovNo) {
             const mhrovDoc = allMhrovs.find(m => String(m.mhrovNumber).trim().toLowerCase() === mhrovNo.toLowerCase());
             if (!mhrovDoc) {
                 results.failed++;
                 results.errors.push({ raBillNo, reason: \`MHROV '\${mhrovNo}' not found in database\` });
                 billValid = false;
                 break;
             }
             if (circleFromCsv && mhrovDoc.circle && mhrovDoc.circle !== circleFromCsv) {
                 results.failed++;
                 results.errors.push({ raBillNo, reason: \`MHROV '\${mhrovNo}' circle ('\${mhrovDoc.circle}') does not match CSV circle ('\${circleFromCsv}')\` });
                 billValid = false;
                 break;
             }
             // (MHROV items have .itemId reference normally, but they might not be populated in lean array, so skip deep item check here to avoid complexity unless necessary)
         }

         // Extract DI Date safely
         let diDate: Date | undefined;
         if (r.didate) {
           diDate = new Date(r.didate);
           if (isNaN(diDate.getTime())) {
             if (typeof r.didate === 'number') {
               diDate = new Date(Math.round((r.didate - 25569) * 86400 * 1000));
             }
           }
         }
         
         const sourceDoneQty = Number(r.mhrovqty || r.sourcedoneqty || r.jmcqty || 0);
         const raBillQty = Number(r.rabillqty || r.billqty || 0);
         const boqRate = Number(r.boqrate || r.rate || 0);
         
         // Auto-calculate
         const percentage = parseInt(stage.replace('%', '')) || 100;
         const totalAmount = Number((raBillQty * boqRate * (percentage / 100)).toFixed(2));
         
         let gstAmount = 0;
         if (billType === 'Supply' && stage === '60%') {
           gstAmount = Number((raBillQty * boqRate * 0.18).toFixed(2));
         } else if (billType === 'Erection' && stage === '90%') {
           gstAmount = Number((raBillQty * boqRate * 0.18).toFixed(2));
         }
         
         items.push({
           loaSrNo,
           itemId: itemIdObj._id,
           tempCode,
           refNumber: mhrovNo,
           itemName,
           diNo,
           diDate: diDate && !isNaN(diDate.getTime()) ? diDate : undefined,
           diQty,
           sourceDoneQty,
           raBillQty,
           boqRate,
           totalAmount,
           gstAmount
         });
      }
      
      if (!billValid) continue;
`;
};

content = content.replace(regex, replacer);
fs.writeFileSync('backend/src/modules/client-billing/clientBill.controller.ts', content);
