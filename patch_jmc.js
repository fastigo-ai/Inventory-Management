const fs = require('fs');
const filePath = 'frontend/src/app/site-portal/jmc-register/new/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
if (!content.includes('import Select')) {
  content = content.replace(
    'import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";',
    'import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";\nimport Select from "react-select";\nimport { getItems } from "@/features/items/api/items.api";'
  );
}

// Add state for availableItems
if (!content.includes('const [availableItems, setAvailableItems]')) {
  content = content.replace(
    'const [submitting, setSubmitting] = useState(false);',
    'const [submitting, setSubmitting] = useState(false);\n  const [availableItems, setAvailableItems] = useState<any[]>([]);'
  );
}

// Add useEffect for fetching items
if (!content.includes('useEffect(() => {\n    if (formData.package')) {
  content = content.replace(
    '  useEffect(() => {\n    fetchContractors();',
    `  useEffect(() => {\n    if (formData.package && formData.circle) {\n      getItems({ filters: { package: formData.package, circle: formData.circle }, limit: 1000 }).then(res => {\n        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];\n        setAvailableItems(fetched);\n      }).catch(console.error);\n    } else {\n      getItems({ limit: 1000 }).then(res => {\n        const fetched = res?.items || res?.data?.items || (Array.isArray(res) ? res : res.data) || [];\n        setAvailableItems(fetched);\n      }).catch(console.error);\n    }\n  }, [formData.package, formData.circle]);\n\n  useEffect(() => {\n    fetchContractors();`
  );
}

// Replace the Input with Select
const inputToReplace = `<Input \n                        value={item.activity} \n                        onChange={e => handleItemChange(index, 'activity', e.target.value)} \n                        className="h-8 text-sm"\n                        placeholder="Activity"\n                      />`;

const selectReplacement = `<Select
                        options={availableItems.map(ai => ({ value: ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name, label: ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name })).filter(o => o.value)}
                        value={item.activity ? { value: item.activity, label: item.activity } : null}
                        onChange={(selected: any) => {
                          if (selected) {
                            handleItemChange(index, 'activity', selected.value);
                            // Auto-fill description/unit if possible
                            const found = availableItems.find(ai => (ai.dynamicData?.description || ai.dynamicData?.itemDescription || ai.dynamicData?.name) === selected.value);
                            if (found && !item.description) {
                               handleItemChange(index, 'description', found.dynamicData?.description || found.dynamicData?.itemDescription || found.dynamicData?.name || '');
                            }
                            if (found && !item.unit) {
                               handleItemChange(index, 'unit', found.dynamicData?.unit || found.dynamicData?.uom || '');
                            }
                          } else {
                            handleItemChange(index, 'activity', '');
                          }
                        }}
                        onInputChange={(inputValue, { action }) => {
                          if (action === 'input-change') handleItemChange(index, 'activity', inputValue);
                        }}
                        placeholder="Select or Type Activity"
                        isClearable
                        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                        styles={{
                          control: (base) => ({ ...base, minHeight: '32px', height: '32px', fontSize: '14px', backgroundColor: 'transparent', border: '1px solid #e2e8f0', boxShadow: 'none' }),
                          valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                          input: (base) => ({ ...base, margin: 0, padding: 0 }),
                          indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          menu: (base) => ({ ...base, fontSize: '14px', minWidth: '300px' }),
                          option: (base) => ({ ...base, padding: '8px 12px' })
                        }}
                      />`;

if (content.includes(inputToReplace)) {
  content = content.replace(inputToReplace, selectReplacement);
}

fs.writeFileSync(filePath, content);
console.log('Patched JMC successfully.');
