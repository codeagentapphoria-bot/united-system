# Multysis Backend API

Node.js + Express + TypeScript backend API for Multysis v2.

## Tech Stack

- **Runtime:** Node.js >= 18.0.0
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM (Supports Local and [Supabase](./SUPABASE_SETUP.md))
- **Cache:** Redis
- **Authentication:** JWT + Passport.js
- **Validation:** Joi / Express-validator
- **Testing:** Jest + Supertest
- **Documentation:** Swagger/OpenAPI

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck
```

## Database

```bash
# Create database from DATABASE_URL
npm run db:create

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Reset database (caution!)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

### Seeded Test Credentials

After running `npm run db:seed`, the following test accounts are created:

**Admin Account:**
- Email: `admin@multysis.local`
- Password: `Admin123!`

**Subscriber Account (Portal):**
- Phone Number: `09171234567`
- Password: `Subscriber123!`

> **Security Note:** Change these credentials in production!

## Project Structure

```
src/
├── controllers/      # Route controllers
├── models/           # Data models
├── routes/           # API routes
├── middleware/       # Express middleware
│   ├── auth.ts      # Authentication
│   ├── validation.ts # Input validation
│   └── error.ts     # Error handling
├── services/         # Business logic
├── utils/            # Utility functions
├── config/           # Configuration
│   ├── database.ts  # Database config
│   ├── redis.ts     # Redis config
│   └── passport.ts  # Passport config
├── types/            # TypeScript types
├── validations/      # Validation schemas
├── database/         # Database files
│   ├── migrations/  # Database migrations
│   └── seeds/       # Seed data
├── jobs/             # Background jobs
├── events/           # Event handlers
└── index.ts          # Application entry point
```

## API Endpoints

### Health Check
- `GET /health` - Server health check

### API Base
- `GET /api` - API information

### Authentication (Example)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT secret key
- `REDIS_HOST` - Redis host
- `CORS_ORIGIN` - Allowed CORS origin

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test

# Run e2e tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## Documentation

API documentation is available at `/api/docs` when running in development mode.

## Deployment

```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

## Scripts

- `dev` - Start development server with hot reload
- `build` - Build TypeScript to JavaScript
- `start` - Start production server
- `test` - Run tests with coverage
- `lint` - Lint code
- `format` - Format code with Prettier
- `db:create` - Create PostgreSQL database from DATABASE_URL
- `db:generate` - Generate Prisma Client
- `db:migrate` - Run database migrations
- `db:seed` - Seed database with initial data
- `db:reset` - Reset database (drop, migrate, seed)
- `db:studio` - Open Prisma Studio

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention (Prisma)
- XSS protection
- JWT authentication

## License

MIT

## Authors

Apphorialabs

