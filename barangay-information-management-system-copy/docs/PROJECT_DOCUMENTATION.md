# 🏛️ BIMS - Barangay Information Management System
## Complete Project Documentation

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features & Functionality](#features--functionality)
5. [Database Design](#database-design)
6. [API Documentation](#api-documentation)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [GIS & Mapping System](#gis--mapping-system)
10. [Security & Authentication](#security--authentication)
11. [Installation & Setup](#installation--setup)
12. [Development Guide](#development-guide)
13. [Deployment Guide](#deployment-guide)
14. [Testing & Quality Assurance](#testing--quality-assurance)
15. [Maintenance & Monitoring](#maintenance--monitoring)
16. [Troubleshooting](#troubleshooting)
17. [Contributing Guidelines](#contributing-guidelines)

---

## 🎯 Project Overview

### What is BIMS?
BIMS (Barangay Information Management System) is a comprehensive web-based application designed for local government units to efficiently manage barangay information, residents, households, and administrative tasks. The system provides a modern, user-friendly interface for managing local government operations with advanced GIS mapping capabilities.

### Key Objectives
- **Digital Transformation**: Modernize barangay record-keeping and administrative processes
- **Data Centralization**: Centralize all barangay-related information in a single, secure system
- **Geographic Intelligence**: Leverage GIS technology for location-based services and analysis
- **Operational Efficiency**: Streamline administrative tasks and improve service delivery
- **Data Analytics**: Provide insights through comprehensive reporting and analytics

### Target Users
- **Municipality Administrators**: Full system access for overseeing multiple barangays
- **Barangay Officials**: Manage their specific barangay's data and operations
- **Staff Members**: Perform day-to-day administrative tasks
- **Residents**: Access services and information (future feature)

---

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │   + PostGIS     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Static Files  │    │   File Storage  │    │   GIS Data      │
│   (Nginx)       │    │   (Uploads)     │    │   (Shapefiles)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Architecture

#### Frontend (React)
- **Component-Based**: Modular React components with reusable UI elements
- **State Management**: React Context API for global state
- **Routing**: React Router for client-side navigation
- **Styling**: Tailwind CSS with Shadcn/ui components
- **Maps**: Leaflet.js for interactive mapping

#### Backend (Node.js)
- **RESTful API**: Express.js framework with structured routes
- **Middleware**: Authentication, validation, error handling
- **Services**: Business logic separation
- **Controllers**: Request/response handling
- **Database**: PostgreSQL with PostGIS extension

#### Database (PostgreSQL + PostGIS)
- **Relational Data**: Core system data (users, residents, households)
- **Geospatial Data**: GIS boundaries and location data
- **Indexing**: Optimized queries with proper indexing
- **Triggers**: Automated data updates and audit logging

---

## 🛠️ Technology Stack

### Frontend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework |
| **Vite** | 5.x | Build tool and dev server |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Shadcn/ui** | Latest | High-quality UI components |
| **React Router** | 6.x | Client-side routing |
| **Leaflet** | 1.9.x | Interactive maps |
| **React Leaflet** | 4.x | React wrapper for Leaflet |
| **Lucide React** | Latest | Icon library |
| **React Hook Form** | 7.x | Form management |

### Backend Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18.x+ | JavaScript runtime |
| **Express.js** | 4.x | Web framework |
| **PostgreSQL** | 12.x+ | Primary database |
| **PostGIS** | 3.x+ | Geospatial extension |
| **JWT** | 9.x | Authentication tokens |
| **Multer** | 1.x | File upload handling |
| **Bcrypt** | 5.x | Password hashing |
| **Cors** | 2.x | Cross-origin resource sharing |
| **Helmet** | 7.x | Security headers |

### Development Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting and quality |
| **Prettier** | Code formatting |
| **Nodemon** | Development server auto-restart |
| **Concurrently** | Parallel script execution |
| **Screen** | Background session management (Linux) |

### Production Tools
| Tool | Purpose |
|------|---------|
| **PM2** | Process manager and clustering |
| **Nginx** | Reverse proxy and static file serving |
| **Let's Encrypt** | SSL certificate management |
| **PostgreSQL** | Production database |

---

## ✨ Features & Functionality

### 🏘️ Barangay Management
- **Complete Barangay Profiles**: Store and manage comprehensive barangay information
- **Official Management**: Track barangay officials, roles, and responsibilities
- **Geographic Data**: Integrate GIS boundaries and location data
- **Interactive Mapping**: Visualize barangay boundaries and administrative areas

### 👥 Resident Management
- **Comprehensive Profiles**: Detailed resident information and demographics
- **Dynamic Classification System**: Fully customizable resident classification types with custom form fields
- **Family Relationships**: Track family connections and household composition
- **Document Management**: Store and manage resident-related documents
- **Search & Filter**: Advanced search capabilities with multiple criteria

### 🏠 Household Management
- **Household Registration**: Complete household registration and tracking
- **Family Composition**: Manage family members and relationships
- **Address Management**: Store detailed address and location information
- **Economic Indicators**: Track household economic and social indicators
- **Location Mapping**: Geographic visualization of household locations

### 📊 Administrative Tools
- **Request Management**: Handle various barangay requests and applications
- **Certificate Generation**: Generate official certificates and documents
- **Inventory Tracking**: Manage barangay assets and inventory
- **Archive Management**: Organize and maintain historical records
- **Statistical Reporting**: Generate comprehensive reports and analytics

### 🗺️ GIS & Mapping Features
- **Interactive Maps**: Leaflet-based interactive mapping interface
- **Boundary Visualization**: Display barangay and municipality boundaries
- **Location Services**: Geographic queries and location-based features
- **Spatial Analysis**: Perform spatial queries and analysis
- **Coordinate Management**: Handle geographic coordinates and projections

### 🔐 Security & Access Control
- **Role-Based Authentication**: Multi-level user access control
- **JWT Tokens**: Secure authentication and session management
- **Audit Logging**: Comprehensive activity tracking and logging
- **File Security**: Secure file uploads and storage
- **Input Validation**: Robust input validation and sanitization

### 📈 Reporting & Analytics
- **Real-Time Dashboard**: Live metrics and key performance indicators
- **Demographic Analysis**: Population statistics and trends
- **Export Capabilities**: Generate reports in various formats
- **Data Visualization**: Charts and graphs for data presentation
- **Custom Reports**: Flexible reporting system for various needs

---

---

## 🗄️ Database Migration System

### Unified Migration System (Latest Update)

The BIMS project now features a **unified database migration system** that simplifies database setup and management:

#### Single Command Setup
```bash
npm run db:migrate  # Complete database setup in one command
```

#### Migration Steps (9 Total)
1. **Database Creation** - Creates PostgreSQL database
2. **Schema Migration** - Creates tables, indexes, constraints
3. **GIS Data Conversion** - Converts GIS data to SQL
4. **GIS Data Import** - Imports municipality/barangay data
5. **GIS Code Migration** - Adds gis_code column + populates codes
6. **Data Seeding** - Seeds initial data
7. **Audit System Setup** - Sets up audit logging
8. **Classification Types** - Seeds classification types
9. **Verification** - Verifies migration success

#### Advanced Options
```bash
cd server && npm run db:migrate -- --help           # Show all options
cd server && npm run db:migrate -- --resume         # Resume from last step
cd server && npm run db:migrate -- --force          # Continue despite errors
cd server && npm run db:migrate -- --skip-step=2    # Skip specific steps
```

#### Benefits
- **Simplified**: 15+ scattered commands → 1 unified command
- **Reliable**: Idempotent design (safe to run multiple times)
- **Comprehensive**: All database operations in one place
- **Production Ready**: Tested from clean state with full verification

### Municipality Setup Fix

**Issue Resolved**: Municipality setup form now works correctly
- Added missing `gis_code` column to municipalities table
- Populated GIS codes for all municipalities
- Fixed API endpoint routing for public access
- Relaxed form validation requirements

---

## 📚 Additional Documentation

For detailed information, refer to the following documentation files:

### Migration System
- **[Migration Documentation Index](MIGRATION_DOCUMENTATION_INDEX.md)** - Central hub for all migration docs
- **[Unified Migration Guide](UNIFIED_MIGRATION_GUIDE.md)** - Comprehensive migration system guide
- **[Migration Test Report](MIGRATION_TEST_REPORT.md)** - Complete test results and verification
- **[Quick Reference](QUICK_REFERENCE.md)** - Essential commands and troubleshooting

### System Documentation
- **[Database Documentation](DATABASE_DOCUMENTATION.md)** - Complete database architecture
- **[API Documentation](API_DOCUMENTATION.md)** - Comprehensive API reference
- **[Frontend Documentation](FRONTEND_DOCUMENTATION.md)** - React application architecture

---

*This documentation is continued in separate sections for better organization and readability.*

**Built with ❤️ for efficient local government operations**

*Last updated: September 30, 2025*
