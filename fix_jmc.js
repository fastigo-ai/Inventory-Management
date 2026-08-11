const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// The original closing tag for the header was just `</div>`. Now we need to close the `flex items-center gap-4` div as well.
content = content.replace(
  '              <Plus className="w-4 h-4 mr-2" /> Add Item\n            </Button>\n          </div>',
  '              <Plus className="w-4 h-4 mr-2" /> Add Item\n            </Button>\n            </div>\n          </div>'
);

content = content.replace('colSpan={9}', 'colSpan={10}');

fs.writeFileSync(filePath, content);
