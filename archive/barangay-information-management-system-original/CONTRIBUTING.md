# Contributing to BIMS (Barangay Information Management System)

## 🏛️ Project Ownership
**BIMS is a proprietary software owned by Apphorialabs.**
- This is a private repository for internal development
- All contributions are subject to Apphorialabs ownership
- External contributions are not accepted

## 👥 Development Team
This project is developed and maintained by the Apphorialabs development team:
- **Lead Developer**: Engr. Kim A. Galicia
- **Backend Developer**: Engr. MArk Eugene G. Gerna
- **Frontend Developer**: Engr. Joel M. Carpio

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+ with PostGIS extension
- Redis 6+
- Git

### Development Setup
```bash
# Clone the repository
git clone https://github.com/Apphorialabs/BIMS
cd bims

# Install dependencies
npm run install-all

# Set up environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env

# Run database migration
npm run db:migrate

# Start development servers
npm run dev
```

## 📋 Development Workflow

### Branch Strategy
We use a feature branch workflow:
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add your feature description"

# Push and create pull request
git push origin feature/your-feature-name
```

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Pull Request Process
1. **Create feature branch** from `main`
2. **Implement changes** with proper testing
3. **Update documentation** if needed
4. **Create pull request** with clear description
5. **Code review** by team members
6. **Merge to main** after approval

## 🏗️ Project Structure

```
bims/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── scripts/        # Database and utility scripts
│   │   └── utils/          # Utility functions
│   └── uploads/            # File uploads
├── docs/                   # Project documentation
├── scripts/                # Deployment and utility scripts
└── README.md
```

## 🧪 Testing

### Backend Testing
```bash
cd server
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Frontend Testing
```bash
cd client
npm test                   # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Integration Testing
```bash
npm run test:integration  # Full system tests
```

## 📊 Code Quality

### Linting and Formatting
```bash
# Backend
cd server
npm run lint              # ESLint check
npm run lint:fix          # Auto-fix issues

# Frontend  
cd client
npm run lint              # ESLint + Prettier
npm run lint:fix          # Auto-fix issues
```

### Type Checking
```bash
# Frontend
cd client
npm run type-check        # TypeScript type checking
```

## 🗄️ Database Management

### Migration
```bash
# Run unified migration
npm run db:migrate

# Individual operations
npm run db:seed           # Seed database
npm run db:optimize       # Optimize with indexes
npm run db:convert-geojson # Convert GIS data
npm run db:import-gis     # Import GIS data
```

### Database Guidelines
- **Always backup** before schema changes
- **Use transactions** for data modifications
- **Test migrations** on development first
- **Document schema changes** in migration files

## 🔧 Development Guidelines

### Backend (Node.js/Express)
- Use **async/await** for asynchronous operations
- Implement **proper error handling** with try-catch
- Add **input validation** using express-validator
- Follow **RESTful API** conventions
- Use **middleware** for cross-cutting concerns
- Implement **proper logging** with Winston

### Frontend (React)
- Use **functional components** with hooks
- Implement **proper state management**
- Follow **component composition** patterns
- Use **TypeScript** for type safety
- Implement **responsive design**
- Add **loading states** and error handling

### Performance
- **Use Redis caching** for frequently accessed data
- **Optimize database queries** with proper indexes
- **Implement pagination** for large datasets
- **Use lazy loading** for components
- **Minimize bundle size** with code splitting

## 🔒 Security Guidelines

### Authentication & Authorization
- Use **JWT tokens** for authentication
- Implement **role-based access control**
- **Validate all inputs** on both client and server
- Use **HTTPS** in production
- Implement **rate limiting**

### Data Protection
- **Hash passwords** with bcrypt
- **Sanitize user inputs** to prevent XSS
- Use **parameterized queries** to prevent SQL injection
- Implement **CSRF protection**
- **Log security events** for monitoring

## 📝 Documentation

### Code Documentation
- Add **JSDoc comments** for functions and classes
- Document **API endpoints** with descriptions
- Include **usage examples** in comments
- Update **README files** when adding features

### API Documentation
- Document all **endpoints** with request/response examples
- Include **error codes** and handling
- Document **authentication requirements**
- Provide **Postman collections** for testing

## 🚀 Deployment

### Development Deployment
```bash
npm run deploy:dev        # Deploy to development
```

### Production Deployment
```bash
npm run deploy:prod       # Deploy to production
```

### Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis cache cleared if needed
- [ ] SSL certificates valid
- [ ] Backup created before deployment

## 🐛 Bug Reports

When reporting bugs, include:
1. **Clear description** of the issue
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Screenshots** if applicable
5. **Environment details** (browser, OS, etc.)
6. **Error logs** if available

## 💡 Feature Requests

When requesting features:
1. **Describe the problem** you're trying to solve
2. **Propose a solution** with examples
3. **Consider alternatives** and trade-offs
4. **Estimate complexity** and effort required
5. **Discuss with team** before implementation

## 📞 Communication

### Team Communication
- Use **Slack/Teams** for daily communication
- Create **GitHub issues** for bugs and features
- Use **pull request comments** for code reviews
- Schedule **weekly standups** for progress updates

### Code Review Guidelines
- **Review within 24 hours** when possible
- **Be constructive** and specific in feedback
- **Test the changes** locally if significant
- **Approve only** when confident in the code
- **Request changes** if issues are found

## 📚 Resources

### Documentation
- [React Documentation](https://reactjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Redis Documentation](https://redis.io/documentation)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - Database management
- [Redis Commander](https://github.com/joeferner/redis-commander) - Redis management

## ⚠️ Important Notes

### Code Ownership
- All code contributions become property of **Apphorialabs**
- Contributors must sign **NDA and IP agreements**
- External code usage must be **approved by management**

### Confidentiality
- This project contains **confidential business logic**
- Do not share code outside the development team
- Use **secure communication channels** for discussions
- Follow **data protection policies**

---

## 📞 Support

For questions or support:
- **Technical Lead**: Engr. Kim A. GAlicia
- **Project Manager**: All
- **Team Slack**: N/A

---

**Thank you for contributing to BIMS!** 🏛️

*Last updated: September 2025*
