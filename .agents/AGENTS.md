# Antigravity CLI Agent Directives

## 1. Code Standards & Production Readiness
- **Production-Grade**: Write modular, clean, type-safe, and fully handle errors.
- **Zero Extraneous Code**: Do NOT generate placeholder comments, unrequested mock data, unused helper functions, or unnecessary log statements.
- **Strictly Modern & Minimal**: Use current best practices and minimal dependencies.

## 2. Directory Structure & Architecture
- Maintain strict modular separation of concerns (e.g., controllers/services/models or domain-driven folders).
- Place files according to the established structure below. Do not generate single-file code dumps unless explicitly asked.

## 3. Verification
- Validate code using existing tests or linters before marking a task complete.

## Store Receipt & Inward Registration Workflow
- **Purchase Receives (PR)**: When modifying or interacting with `pr.controller.ts` (Purchase Invoices/Receives), always remember that creating a PR must automatically generate corresponding `StoreInwardEntry` records.
- **Store Receipts**: These generated inward entries must be populated with `status: 'PENDING_RECEIPT'` to appear in the Store Manager's Store Receipts tab.
- **Inward Registration**: The flow strictly follows: PR Generation -> Store Receipt (Pending) -> Store Manager Approval -> Inward Registration (Prefilled). Any modifications to item mappings or schemas must account for this end-to-end data flow to prevent broken states in the UI.
