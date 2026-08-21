const fs = require('fs');

const fixImport = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('import { ArrowLeft') && !content.includes('Building2')) {
    content = content.replace(
      /import \{ ArrowLeft[^}]+\} from 'lucide-react';/,
      "import { ArrowLeft, Loader2, FileText, CheckCircle, AlertCircle, Edit, Printer, Building2 } from 'lucide-react';"
    );
    fs.writeFileSync(filePath, content);
  }
};

fixImport('frontend/src/app/pm-portal/demand-notes/[id]/page.tsx');
fixImport('frontend/src/app/pd-portal/demand-notes/[id]/page.tsx');
