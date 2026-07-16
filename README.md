# Enterprise ERP / Inventory Management System

## Project Overview
This project is a scalable, modular, and enterprise-grade monorepo foundation for an ERP / Inventory Management System. It contains the structure for a Next.js frontend and a Node.js/Express backend.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Axios, Zustand, React Hook Form, Zod, Lucide React.
- **Backend**: Node.js, Express.js, TypeScript, MongoDB, Mongoose, Helmet, Morgan, CORS, Cookie Parser, Compression, dotenv.

## Folder Structure
```
erp-system/
├── frontend/             # Next.js 15 App
├── backend/              # Node.js Express API
├── docs/                 # Documentation files
├── docker/               # Additional Docker resources
├── .gitignore            # Git ignore rules
├── docker-compose.yml    # Local development docker compose
└── README.md             # Project documentation
```

## Installation Guide

### Prerequisites
- Node.js (v18 or higher recommended)
- Docker & Docker Compose (for local development via containers)

### Steps
1. Clone the repository.
2. Navigate to the root directory `cd erp-system`.
3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```
4. Install backend dependencies:
   ```bash
   cd ../backend
   npm install
   ```

## Environment Variables
Create `.env` files in both the `frontend` and `backend` directories.

**Frontend (`frontend/.env`)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=ERP Inventory System
```

**Backend (`backend/.env`)**:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/erp_system
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CLIENT_URL=http://localhost:3000
```
*(Note: Change MONGO_URI to `mongodb://mongodb:27017/erp_system` if using Docker Compose).*

## Running Frontend
```bash
cd frontend
npm run dev
```

## Running Backend
```bash
cd backend
npm run dev
```

## Running with Docker
To spin up the entire application (Frontend, Backend, MongoDB) using Docker:
```bash
docker-compose up --build
```

## Development Workflow
- Follow feature-based branch naming.
- Ensure all code passes linting and formatting rules via Husky pre-commit hooks.

## Coding Standards
- **SOLID Principles**: Adhere to SOLID principles in backend and frontend structure.
- **Layered Backend Architecture**: Controllers handle HTTP logic, Services handle business logic, Repositories handle database operations.
- **Feature-based Frontend Architecture**: Keep components modular and reusable.
- **Clean Code**: Follow strict TypeScript typing and clean code practices.
