# Multisys v2

A comprehensive municipal E-Government platform with React frontend, Node.js backend, and PostgreSQL database. Citizens can access government services online while administrators have powerful management and workflow tools.

## Key Features

- **Subscriber Management** — Self-registration or admin-created accounts
- **E-Government Services** — 11+ service types (Birth/Death Certificates, Cedulas, RPTAX, BPTAX, NOV, OVRS, BPLS, E-Boss, and more)
- **Transaction Tracking** — Full lifecycle management for all service requests
- **Role-Based Access Control** — Fine-grained permissions for admin users
- **Real-time Updates** — Socket.IO-powered status notifications
- **Document Management** — File uploads for profile pictures and transaction documents

---

## Project Structure

```
Multysis-v2/
├── multisys-frontend/     # React 19 + TypeScript + Vite
├── multisys-backend/      # Node.js + Express + TypeScript API
├── scripts/               # Utility scripts (setup, dev, build, deploy)
├── docs/                  # Extended documentation
├── docker-compose.yml     # Docker Compose configuration
├── .env.example           # Root-level environment template
└── package.json           # Monorepo root scripts
```

---

## Quick Start

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Node.js | ≥ 18.0.0 |
| npm | ≥ 9.0.0 |
| PostgreSQL | ≥ 15.0 |
| Docker & Docker Compose | Any recent version *(optional)* |

> **Windows users:** All commands below use `npm` or `npx`. Run them in **Command Prompt (`cmd`)** or **Git Bash** — avoid PowerShell if execution policy is restricted.

---

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Multysis-v2
```

### 2. Install All Dependencies

```bash
# From the root — installs everything in one go
npm install

# Or install each separately:
cd multysis-backend && npm install && cd ..
cd multysis-frontend && npm install && cd ..
```

### 3. Configure Environment Variables

#### Backend — `multysis-backend/.env`

Create this file manually or copy from the example:

```bash
cd multysis-backend
copy .env.example .env    # Windows
# cp .env.example .env    # Linux/macOS
```

Edit the file with your values:

```env
PORT=3000
NODE_ENV=development

# PostgreSQL
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/multysis?schema=public

# JWT (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS — must match the frontend URL exactly
CORS_ORIGIN=http://localhost:5173
API_BASE_URL=http://localhost:3000

# Email (optional — for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@multysis.com

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### Frontend — `multysis-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_MOCK_API=false
```

### 4. Set Up the Database

```bash
cd multysis-backend

# 1. Create the PostgreSQL database
npm run db:create

# 2. Generate the Prisma client
npm run db:generate

# 3. Run migrations
npm run db:migrate

# 4. Seed initial data (admin & subscriber accounts)
npm run db:seed
```

> **One-liner for existing databases (production-safe):**
> ```bash
> npm run db:setup
> # Runs: prisma generate + prisma migrate deploy + prisma db seed
> ```

### 5. Start Development Servers

**Option A — Run both with one command (from root):**

```bash
npm run dev
```

**Option B — Run separately (recommended for debugging):**

```bash
# Terminal 1 — Backend
cd multysis-backend
npm run dev

# Terminal 2 — Frontend
cd multysis-frontend
npm run dev
```

**Option C — Docker Compose:**

```bash
docker-compose up
```

### 6. Access the Application

| Service | URL |
|---------|-----|
| **Frontend (Portal/Admin)** | http://localhost:5173 |
| **Backend API** | http://localhost:3000/api |
| **Prisma Studio** | `npm run db:studio` (in backend dir) |

---

## Default Seeded Credentials

After running `npm run db:seed`:

| Role | Login | Password |
|------|-------|----------|
| **Admin** | `admin@multysis.local` (email) | `Admin123!` |
| **Subscriber** | `09171234567` (phone) | `Subscriber123!` |

> **Change these credentials before deploying to production.**

---

## Available Scripts

### Root Level (run from `Multysis-v2/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build backend then frontend |
| `npm run build:frontend` | Build frontend for production |
| `npm run build:backend` | Compile TypeScript backend |
| `npm run test` | Run all tests (backend + frontend) |
| `npm run test:frontend` | Frontend tests only |
| `npm run test:backend` | Backend tests only |
| `npm run lint` | Lint all code |
| `npm run clean` | Remove node_modules and build artifacts |
| `npm run docker:up` | Start all services via Docker Compose |
| `npm run docker:down` | Stop all Docker services |
| `npm run docker:logs` | Tail Docker logs |

### Backend Only (run from `multysis-backend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend with hot-reload (nodemon + ts-node) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled production build |
| `npm run typecheck` | Type-check without emitting files |
| `npm run format` | Auto-format with Prettier |
| `npm run lint` | Lint TypeScript files |
| `npm run test` | Run Jest tests with coverage |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run db:create` | Create PostgreSQL database |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Run migrations (development) |
| `npm run db:migrate:prod` | Run migrations (production-safe) |
| `npm run db:push` | Push schema without migrations |
| `npm run db:seed` | Seed database with initial data |
| `npm run db:seed:sample` | Seed with extended sample data |
| `npm run db:reset` | Drop + re-migrate + re-seed |
| `npm run db:setup` | generate + migrate deploy + seed (CI/production) |
| `npm run db:studio` | Open Prisma Studio (browser-based DB viewer) |

### Frontend Only (run from `multysis-frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + bundle for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Lint with ESLint |

---

## Tech Stack

### Frontend
| Library | Purpose |
|---------|---------|
| React 19 + TypeScript | UI framework |
| Vite (rolldown-vite) | Build tool |
| React Router v6 | Routing |
| Tailwind CSS + ShadCN (Radix UI) | Styling & components |
| React Hook Form + Zod | Forms & validation |
| Axios | HTTP client |
| Socket.IO Client | Real-time updates |
| Recharts | Data visualization |

### Backend
| Library | Purpose |
|---------|---------|
| Node.js 18+ + Express | Web server |
| TypeScript | Type safety |
| Prisma 5 | ORM + migrations |
| PostgreSQL 15+ | Primary database |
| JWT + bcryptjs | Auth & password hashing |
| Socket.IO | Real-time events |
| Multer | File uploads |
| Nodemailer | Email notifications |
| Twilio | SMS notifications |
| Winston | Logging |
| Bull + IORedis | Job queues (optional) |

---

## Database Schema Overview

The application uses a **gateway table architecture** to prevent data duplication.

### Key Models

| Model | Description |
|-------|-------------|
| `Subscriber` | Gateway — routes to `Citizen` or `NonCitizen` |
| `Citizen` | Registered citizens with full profile |
| `NonCitizen` | Standalone portal user (resident, non-citizen) |
| `User` | Admin users (email-based auth) |
| `Transaction` | Base model for all E-Gov service requests |
| `Role` / `Permission` | Access control system |

### Gateway Pattern

The `Subscriber` table acts as a universal identity router:
- Links to `Citizen` if the subscriber is a registered citizen
- Links to `NonCitizen` otherwise
- All transactions reference `Subscriber`, not the underlying record
- Eliminates profile data duplication across citizen types

```bash
# Inspect database visually
cd multysis-backend && npm run db:studio
```

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/admin/login` | Admin login (email) |
| POST | `/api/auth/portal/login` | Subscriber login (phone) |
| POST | `/api/auth/portal/signup` | Subscriber signup |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current session user |
| POST | `/api/auth/refresh` | Refresh JWT token |

### Subscribers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscribers` | List (paginated, filtered) |
| GET | `/api/subscribers/:id` | Get by ID |
| POST | `/api/subscribers` | Create (admin only) |
| PUT | `/api/subscribers/:id` | Update details |
| PATCH | `/api/subscribers/:id/activate` | Activate account |
| PATCH | `/api/subscribers/:id/block` | Block account |
| PATCH | `/api/subscribers/:id/password` | Change password |
| GET | `/api/subscribers/:id/transactions` | Get transactions |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions/subscriber/:id` | Get by subscriber |
| GET | `/api/transactions/:id` | Get details |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update (admin only) |
| GET | `/api/transactions/:id/download` | Download document |

### Access Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/roles` | List / create roles |
| GET/POST | `/api/permissions` | List / create permissions |
| GET | `/api/permissions/resources` | Get resource list |
| GET/POST | `/api/users` | List / create admin users |

> All endpoints require authentication via `Authorization: Bearer <token>` header, except login/signup.

---

## Authentication Flows

### Admin (Email-based)
1. POST `/api/auth/admin/login` with `{ email, password }`
2. Receives `accessToken` + `refreshToken` (HTTP-only cookies)
3. Use token in `Authorization: Bearer <token>` header

### Subscriber/Portal (Phone-based)
1. POST `/api/auth/portal/signup` with phone number and password
2. POST `/api/auth/portal/login` with `{ phone, password }`
3. Same token flow as admin

---

## Testing

```bash
# All tests (from root)
npm test

# Backend only — with coverage report
cd multysis-backend && npm test

# Backend — watch mode
cd multysis-backend && npm run test:watch

# Frontend only
cd multysis-frontend && npm test
```

---

## Troubleshooting

### PostgreSQL won't connect
- Verify PostgreSQL is running
- Double-check `DATABASE_URL` in `multysis-backend/.env`
- Ensure the database exists: `npm run db:create`
- Re-run migrations: `npm run db:migrate`

### PowerShell: "running scripts is disabled"
This is a Windows execution policy restriction. Use **`cmd`** instead:
```cmd
cmd /c "npm run dev"
```
Or set the policy permanently (requires admin): 
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### CORS Errors
- `CORS_ORIGIN` in backend `.env` must exactly match the frontend URL (including `http://` and port)
- Example: `CORS_ORIGIN=http://localhost:5173`

### JWT / Auth Issues
- Ensure `JWT_SECRET` is at least 32 characters
- Frontend must send token as: `Authorization: Bearer <token>`
- Check `JWT_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` values

### Prisma Errors
```bash
cd multysis-backend

# Regenerate client after schema changes
npm run db:generate

# Create a new migration after schema edit
npm run db:migrate

# Full reset (dev only — destroys all data)
npm run db:reset
```

### Port Already in Use
- Backend default: `3000` — change `PORT` in `multysis-backend/.env`
- Frontend default: `5173` — change in `multysis-frontend/vite.config.ts`

---

## Directory Structure

### Frontend (`multysis-frontend/src/`)
```
├── components/
│   ├── common/          # Reusable UI components
│   ├── layout/          # Layout wrappers
│   └── features/        # Feature-specific components
├── pages/               # Route-level page components
├── hooks/               # Custom React hooks
├── services/            # Axios API service layer
├── utils/               # Utility/helper functions
├── types/               # Shared TypeScript types
├── constants/           # App-wide constants
├── context/             # React Context providers
├── config/              # App configuration
├── routes/              # Route definitions
└── styles/              # Global styles and themes
```

### Backend (`multysis-backend/src/`)
```
├── controllers/         # Request handlers
├── routes/              # Express route definitions
├── services/            # Business logic
├── middleware/          # Auth, validation, error handling
├── utils/               # JWT, password, helpers
├── config/              # Database, Redis config
├── validations/         # express-validator schemas
├── types/               # Shared TypeScript types
├── socket/              # Socket.IO handlers
├── database/
│   ├── migrations/      # Prisma migration history
│   └── seeds/           # Seed data scripts
└── prisma/
    └── schema.prisma    # Database schema
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture overview |
| [multysis-backend/SUPABASE_SETUP.md](multysis-backend/SUPABASE_SETUP.md) | Supabase Integration & Configuration |
| [docs/FEATURES_AND_FLOWS.md](docs/FEATURES_AND_FLOWS.md) | Feature documentation and user flows |
| [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md) | Detailed environment variables guide |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Development standards and conventions |

---

## Docker Setup

```bash
# Start all services (frontend, backend, PostgreSQL, Redis)
npm run docker:up

# Stop all services
npm run docker:down

# Tail logs
npm run docker:logs
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT

## Authors

Apphorialabs
