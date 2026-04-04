# 🚀 BIMS Developer Onboarding Guide

## 🏛️ Welcome to BIMS Development Team

Welcome to the **Barangay Information Management System (BIMS)** development team at **Apphorialabs**! This guide will help you get up and running quickly.

## 📋 Quick Start Checklist

### ✅ Prerequisites Setup
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ with PostGIS extension
- [ ] Redis 6+ installed
- [ ] Git configured with your credentials
- [ ] Code editor (VS Code recommended)
- [ ] Database management tool (pgAdmin/DBeaver)

### ✅ Development Environment
- [ ] Repository cloned locally
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Database migrated and seeded
- [ ] Redis connection verified
- [ ] Development servers running

### ✅ Team Access
- [ ] GitHub repository access granted
- [ ] Slack/Teams channel access
- [ ] Project documentation access
- [ ] Development server access
- [ ] Database access credentials

## 🛠️ Development Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/Apphorialabs/BIMS
cd bims
```

### 2. Install Dependencies
```bash
# Install all dependencies (client + server)
npm run install-all

# Or install separately
cd client && npm install
cd server && npm install
```

### 3. Environment Configuration

#### Server Environment (.env)
```bash
# Copy example file
cp server/.env.example server/.env

# Configure database
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=bims_development
PG_USER=your_username
PG_PASSWORD=your_password

# Configure Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Configure JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Configure email (if needed)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

#### Client Environment (.env)
```bash
# Copy example file
cp client/.env.example client/.env

# Configure API endpoint
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=BIMS
```

### 4. Database Setup
```bash
# Run unified migration (creates schema, imports GIS data, seeds data)
npm run db:migrate

# Verify database optimization
npm run db:optimize

# Test Redis connection
npm run redis:test-simple
```

### 5. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start separately
npm run frontend  # Client only
npm run backend   # Server only
```

## 📚 Understanding the Codebase

### 🏗️ Architecture Overview
BIMS follows a **full-stack monorepo architecture**:

```
Frontend (React) ←→ Backend (Node.js/Express) ←→ Database (PostgreSQL)
                          ↓
                    Cache (Redis)
```

### 📁 Project Structure
```
bims/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── common/     # Common components (forms, tables, etc.)
│   │   │   ├── layout/     # Layout components (header, sidebar, etc.)
│   │   │   └── ui/         # Base UI components (buttons, inputs, etc.)
│   │   ├── features/       # Feature-specific components
│   │   │   ├── auth/       # Authentication components
│   │   │   ├── residents/  # Resident management
│   │   │   ├── barangays/  # Barangay management
│   │   │   ├── households/ # Household management
│   │   │   ├── statistics/ # Statistics and reports
│   │   │   └── maps/       # GIS and mapping features
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   ├── utils/          # Utility functions
│   │   ├── store/          # State management
│   │   └── styles/         # Global styles and themes
│   └── public/             # Static assets
├── server/                 # Node.js backend application
│   ├── src/
│   │   ├── controllers/    # Request handlers (business logic)
│   │   ├── middleware/     # Express middleware
│   │   │   ├── auth.js     # Authentication middleware
│   │   │   ├── redisCache.js # Redis caching middleware
│   │   │   ├── rateLimiter.js # Rate limiting
│   │   │   └── error.js    # Error handling
│   │   ├── routes/         # API routes
│   │   │   ├── auth.js     # Authentication routes
│   │   │   ├── residentRoutes.js # Resident management
│   │   │   ├── barangayRoutes.js # Barangay management
│   │   │   ├── gisRoute.js # GIS and mapping routes
│   │   │   └── statisticsRoutes.js # Statistics routes
│   │   ├── services/       # Business logic services
│   │   ├── scripts/        # Database and utility scripts
│   │   │   ├── unifiedMigration.js # Database migration
│   │   │   ├── seedDatabase.js # Data seeding
│   │   │   └── optimizeDatabase.js # Performance optimization
│   │   ├── utils/          # Utility functions
│   │   ├── config/         # Configuration files
│   │   │   ├── db.js       # Database configuration
│   │   │   └── redis.js    # Redis configuration
│   │   └── uploads/        # File uploads
├── docs/                   # Project documentation
├── scripts/                # Deployment and utility scripts
└── README.md
```

## 🎯 Key Features to Understand

### 1. Authentication System
- **JWT-based authentication** with role-based access control
- **Three user roles**: Municipality Admin, Barangay Admin, Barangay User
- **Session management** with Redis for scalability

### 2. Resident Management
- **Complete resident profiles** with personal information
- **Classification system** for different resident types
- **Document management** with file uploads
- **Search and filtering** capabilities

### 3. GIS Integration
- **Interactive maps** using Leaflet.js
- **Geographic data** from PostGIS database
- **Municipality and barangay boundaries**
- **Spatial queries** for location-based features

### 4. Performance Optimization
- **Redis caching** for frequently accessed data
- **Database indexing** for fast queries
- **API response compression** for faster loading
- **Frontend optimization** with lazy loading

### 5. Statistics and Reporting
- **Demographic statistics** by age, gender, status
- **Classification reports** for different resident types
- **Export functionality** for Excel/PDF reports
- **Real-time dashboards** for administrators

## 🔧 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/resident-search-improvements

# Make changes and test
npm run dev
npm test

# Commit with conventional commits
git add .
git commit -m "feat: improve resident search with advanced filters"

# Push and create pull request
git push origin feature/resident-search-improvements
```

### 2. Database Changes
```bash
# Always backup before changes
pg_dump bims_development > backup_$(date +%Y%m%d).sql

# Run migrations
npm run db:migrate

# Optimize database
npm run db:optimize

# Test changes
npm test
```

### 3. Code Quality
```bash
# Lint code
npm run lint

# Format code
npm run format

# Type check (frontend)
cd client && npm run type-check

# Run tests
npm test
```

## 🧪 Testing Strategy

### Backend Testing
```bash
cd server
npm test                    # Unit tests
npm run test:integration   # Integration tests
npm run test:coverage     # Coverage report
```

### Frontend Testing
```bash
cd client
npm test                   # Component tests
npm run test:e2e         # End-to-end tests
npm run test:coverage    # Coverage report
```

### Manual Testing Checklist
- [ ] User authentication and authorization
- [ ] CRUD operations for all entities
- [ ] File upload and download
- [ ] Search and filtering functionality
- [ ] Map interactions and GIS features
- [ ] Statistics and reporting
- [ ] Mobile responsiveness
- [ ] Browser compatibility

## 📊 Performance Monitoring

### Cache Performance
```bash
# Check Redis cache statistics
curl http://localhost:5000/api/redis/stats

# Clear cache if needed
curl -X DELETE http://localhost:5000/api/redis/cache
```

### Database Performance
```bash
# Check slow queries
cd server && npm run db:analyze

# Optimize database
npm run db:optimize
```

### Frontend Performance
- Use **React DevTools** for component profiling
- Monitor **bundle size** with webpack-bundle-analyzer
- Check **Core Web Vitals** in browser dev tools

## 🔒 Security Best Practices

### Authentication
- Always use **JWT tokens** for API authentication
- Implement **role-based access control** (RBAC)
- Use **HTTPS** in production
- Implement **rate limiting** for API endpoints

### Data Protection
- **Validate all inputs** on both client and server
- Use **parameterized queries** to prevent SQL injection
- **Hash passwords** with bcrypt
- **Sanitize user inputs** to prevent XSS

### File Uploads
- **Validate file types** and sizes
- **Scan uploaded files** for malware
- **Store files securely** outside web root
- **Generate unique filenames** to prevent conflicts

## 📝 Documentation Standards

### Code Documentation
```javascript
/**
 * Creates a new resident in the database
 * @param {Object} residentData - Resident information
 * @param {string} residentData.firstName - Resident's first name
 * @param {string} residentData.lastName - Resident's last name
 * @param {number} residentData.barangayId - ID of the barangay
 * @returns {Promise<Object>} Created resident object
 * @throws {ApiError} When validation fails or database error occurs
 */
async function createResident(residentData) {
  // Implementation
}
```

### API Documentation
```javascript
/**
 * @route   POST /api/residents
 * @desc    Create a new resident
 * @access  Private (Barangay Admin/User)
 * @param   {Object} req.body - Resident data
 * @returns {Object} Created resident object
 */
```

## 🚀 Deployment Process

### Development Deployment
```bash
npm run deploy:dev
```

### Production Deployment
```bash
# 1. Run tests
npm test

# 2. Build frontend
npm run build

# 3. Deploy to production
npm run deploy:prod

# 4. Verify deployment
npm run health-check
```

## 📞 Getting Help

### Team Resources
- **Lead Developer**: Engr. Kim A. Galicia - 09776611597
- **Backend Developer**: Engr. Mark Eugene G. Gerna - [contact]
- **Frontend Developer**: Engr. Joel M. Carpio - [contact]
- **Project Manager**: Engr. Kim A. Galicia - [contact]

### Communication Channels
- **Slack/Teams**: #bims-development
- **GitHub Issues**: For bugs and feature requests
- **Pull Request Comments**: For code reviews
- **Weekly Standups**: Progress updates

### Documentation
- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **Database Schema**: `/docs/DATABASE.md`
- **Deployment Guide**: `/docs/DEPLOYMENT_GUIDE.md`
- **Performance Guide**: `/docs/PERFORMANCE_OPTIMIZATION_PLAN.md`

## ✅ Onboarding Checklist

### Week 1
- [ ] Development environment set up
- [ ] Codebase structure understood
- [ ] First feature branch created
- [ ] First pull request submitted
- [ ] Team communication channels joined

### Week 2
- [ ] Authentication system understood
- [ ] Database schema familiar
- [ ] API endpoints tested
- [ ] Frontend components explored
- [ ] GIS features understood

### Week 3
- [ ] First feature completed
- [ ] Code review process understood
- [ ] Testing procedures followed
- [ ] Performance optimization learned
- [ ] Deployment process experienced

### Month 1
- [ ] Contributed to major feature
- [ ] Mentored by senior developer
- [ ] Participated in code reviews
- [ ] Improved project documentation
- [ ] Ready for independent development

---

## 🎉 Welcome to the Team!

We're excited to have you on the BIMS development team! Remember:

- **Ask questions** - We're here to help
- **Follow best practices** - Maintain code quality
- **Communicate regularly** - Keep the team informed
- **Learn continuously** - Stay updated with new technologies
- **Have fun coding!** - We're building something amazing

**Happy coding!** 🚀

---

*Last updated: September 2025*
