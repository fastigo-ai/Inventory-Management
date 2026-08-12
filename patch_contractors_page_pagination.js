const fs = require('fs');
const filePath = 'frontend/src/app/ho-billing/contractors/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Import
content = content.replace(
  'import { ContractorImportModal } from "@/features/contractors/components/ContractorImportModal";',
  'import { ContractorImportModal } from "@/features/contractors/components/ContractorImportModal";\nimport { DataTableBottomControls } from "@/shared/components/DataTableControls";'
);

// 2. Add State & Update fetchContractors
const oldFetch = `  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

const newFetch = `  const [contractors, setContractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchContractors = (query = searchQuery, page = currentPage, limit = pageSize) => {
    setLoading(true);
    getContractors(undefined, query, page, limit)
      .then(res => {
        if (res.data && res.data.contractors) {
          setContractors(res.data.contractors);
          setTotalPages(res.data.totalPages);
          setTotalItems(res.data.total);
        } else {
          setContractors(res.data || []);
          setTotalPages(1);
          setTotalItems((res.data || []).length);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchContractors(searchQuery, currentPage, pageSize);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, currentPage, pageSize]);`;

content = content.replace(oldFetch, newFetch);

// 3. Add DataTableBottomControls below table
const oldTableEnd = `            </table>
          )}`;

const newTableEnd = `            </table>
          )}
          {!loading && contractors.length > 0 && (
            <DataTableBottomControls
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalItems={totalItems}
            />
          )}`;

content = content.replace(oldTableEnd, newTableEnd);

fs.writeFileSync(filePath, content);
