const fs = require('fs');
const filePath = 'frontend/src/app/ho-billing/contractors/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add searchQuery state and update fetchContractors
const oldFetch = `  const fetchContractors = () => {
    setLoading(true);
    getContractors()
      .then(res => setContractors(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContractors();
  }, []);`;

const newFetch = `  const [searchQuery, setSearchQuery] = useState("");

  const fetchContractors = (query = "") => {
    setLoading(true);
    getContractors(undefined, query)
      .then(res => setContractors(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchContractors(searchQuery);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);`;
content = content.replace(oldFetch, newFetch);

// 2. Add search input to UI
const oldHeaderRight = `<div className="flex items-center gap-3">
            <Button 
              variant="outline"
              className="bg-white"`;

const newHeaderRight = `<div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contractor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 rounded-md border border-slate-200 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Button 
              variant="outline"
              className="bg-white"`;
content = content.replace(oldHeaderRight, newHeaderRight);

fs.writeFileSync(filePath, content);
