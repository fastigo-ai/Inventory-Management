# Backend Architecture and Clean Code Rules

## Controller-Service Architecture
- **Do not write fat controllers:** Controllers should ONLY handle HTTP requests, responses, status codes, and basic validation.
- **Business Logic in Services:** All core business logic, database queries, and transformations must be split into dedicated service files (e.g., `feature.service.ts`).
- **Clean Code (Senior Dev Standards):** 
  - Keep functions small and focused on a single responsibility.
  - Apply DRY principles—extract reusable code into utility functions or shared services.
  - Always use clear, descriptive naming for variables and functions.
  - Implement robust error handling and ensure type safety throughout the codebase.
