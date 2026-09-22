const fs = require('fs');
const path = 'frontend/src/app/pd-portal/demand-notes/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

// The conflict has two parts:
// <<<<<<< HEAD
// ... grouped items logic ...
// <<<<<<< HEAD
//                 ));
//               })()}
//             </tbody>
// =======
//                 ))
//               ) : (
//                 <tr>
//                   <td colSpan={15} className="px-6 py-8 text-center text-slate-500">
//                     No items found in this Demand Note
//                   </td>
//                 </tr>
//               )}</tbody>
// >>>>>>> ...

content = content.replace(/<<<<<<< HEAD\n/g, '');
content = content.replace(/=======\n[\s\S]*?>>>>>>>[^\n]*\n/g, '');

fs.writeFileSync(path, content, 'utf-8');
