# 🔌 API Documentation
## BIMS REST API Reference

---

## 📋 Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Base URL & Endpoints](#base-url--endpoints)
4. [Error Handling](#error-handling)
5. [Authentication Endpoints](#authentication-endpoints)
6. [User Management](#user-management)
7. [Municipality Management](#municipality-management)
8. [Barangay Management](#barangay-management)
9. [Resident Management](#resident-management)
10. [Household Management](#household-management)
11. [GIS & Mapping](#gis--mapping)
12. [Statistics & Reports](#statistics--reports)
13. [File Management](#file-management)
14. [Request & Certificate Management](#request--certificate-management)
15. [Inventory Management](#inventory-management)
16. [Audit & Logs](#audit--logs)

---

## 🎯 API Overview

### Base Information
- **Base URL**: `http://localhost:5000/api` (Development)
- **Content Type**: `application/json`
- **Authentication**: JWT Bearer Token
- **Version**: v1

### Response Format
All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": "Additional error details"
  }
}
```

---

## 🔐 Authentication

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 1,
    "username": "admin",
    "role": "municipality_admin",
    "target_id": 1,
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Refresh
- **Access Token**: 24 hours
- **Refresh Token**: 7 days
- **Auto-refresh**: Automatic token renewal

---

## 🌐 Base URL & Endpoints

### Development
```
http://localhost:5000/api
```

### Production
```
https://your-domain.com/api
```

### Endpoint Categories
- **Authentication**: `/auth/*`
- **Users**: `/users/*`
- **Municipalities**: `/municipalities/*`
- **Barangays**: `/barangays/*`
- **Residents**: `/residents/*`
- **Households**: `/households/*`
- **GIS**: `/geojson/*`
- **Statistics**: `/statistics/*`
- **Files**: `/upload/*`
- **Requests**: `/requests/*`
- **Inventories**: `/inventories/*`
- **Audit**: `/logs/*`

---

## ⚠️ Error Handling

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Internal Server Error

### Error Codes
```json
{
  "AUTH_001": "Invalid credentials",
  "AUTH_002": "Token expired",
  "AUTH_003": "Insufficient permissions",
  "VAL_001": "Validation failed",
  "DB_001": "Database error",
  "FILE_001": "File upload error",
  "GIS_001": "GIS data error"
}
```

---

## 🔑 Authentication Endpoints

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "municipality_admin",
      "target_id": 1
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here"
  }
}
```

### Logout
```http
POST /auth/logout
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Get Current User
```http
GET /auth/me
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "municipality_admin",
    "target_id": 1,
    "is_active": true,
    "last_login": "2024-01-01T12:00:00Z"
  }
}
```

### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_here",
    "refreshToken": "new_refresh_token_here"
  }
}
```

---

## 👥 User Management

### Get All Users
```http
GET /users
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search by username or email
- `role` (string): Filter by role
- `is_active` (boolean): Filter by active status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "municipality_admin",
      "target_id": 1,
      "is_active": true,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### Create User
```http
POST /users
```

**Request Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123",
  "role_id": 2,
  "target_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": 2,
    "username": "newuser",
    "email": "user@example.com",
    "role": "barangay_admin",
    "target_id": 1,
    "created_at": "2024-01-01T12:00:00Z"
  }
}
```

### Get User by ID
```http
GET /users/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "municipality_admin",
    "target_id": 1,
    "is_active": true,
    "created_at": "2024-01-01T12:00:00Z",
    "updated_at": "2024-01-01T12:00:00Z"
  }
}
```

### Update User
```http
PUT /users/:id
```

**Request Body:**
```json
{
  "email": "updated@example.com",
  "role_id": 2,
  "is_active": true
}
```

### Delete User
```http
DELETE /users/:id
```

---

## 🏛️ Municipality Management

### Get All Municipalities
```http
GET /municipalities
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search by name or code

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Borongan City",
      "code": "BORONGAN",
      "gis_code": "PH0802604",
      "contact": "+639123456789",
      "email": "admin@borongan.gov.ph",
      "address": "Borongan City, Eastern Samar",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Municipality by ID
```http
GET /municipalities/:id
```

### Update Municipality
```http
PUT /municipalities/:id
```

**Request Body:**
```json
{
  "name": "Updated Municipality Name",
  "contact": "+639123456789",
  "email": "updated@municipality.gov.ph",
  "gis_code": "PH0802604"
}
```

---

## 🏘️ Barangay Management

### Get All Barangays
```http
GET /barangays
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `municipality_id` (number): Filter by municipality
- `search` (string): Search by name or code

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "San Gabriel",
      "code": "SG001",
      "municipality_id": 1,
      "municipality_name": "Borongan City",
      "gis_code": "PH0802604047",
      "contact": "+639123456789",
      "email": "sangabriel@barangay.gov.ph",
      "address": "San Gabriel, Borongan City",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Barangay by ID
```http
GET /barangays/:id
```

### Create Barangay
```http
POST /barangays
```

**Request Body:**
```json
{
  "name": "New Barangay",
  "code": "NB001",
  "municipality_id": 1,
  "contact": "+639123456789",
  "email": "newbarangay@example.com",
  "address": "New Barangay Address",
  "gis_code": "PH0802604048"
}
```

### Update Barangay
```http
PUT /barangays/:id
```

### Delete Barangay
```http
DELETE /barangays/:id
```

---

## 👤 Resident Management

### Get All Residents
```http
GET /residents
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `barangay_id` (number): Filter by barangay
- `search` (string): Search by name
- `gender` (string): Filter by gender
- `civil_status` (string): Filter by civil status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "middle_name": "Santos",
      "birth_date": "1990-01-01",
      "gender": "Male",
      "civil_status": "Married",
      "nationality": "Filipino",
      "religion": "Catholic",
      "occupation": "Farmer",
      "educational_attainment": "High School",
      "contact_number": "+639123456789",
      "email": "juan@example.com",
      "barangay_id": 1,
      "barangay_name": "San Gabriel",
      "address": "123 Main Street",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Resident by ID
```http
GET /residents/:id
```

### Create Resident
```http
POST /residents
```

**Request Body:**
```json
{
  "first_name": "Maria",
  "last_name": "Santos",
  "middle_name": "Garcia",
  "birth_date": "1985-05-15",
  "gender": "Female",
  "civil_status": "Single",
  "nationality": "Filipino",
  "religion": "Catholic",
  "occupation": "Teacher",
  "educational_attainment": "College",
  "contact_number": "+639123456789",
  "email": "maria@example.com",
  "barangay_id": 1,
  "address": "456 Oak Street"
}
```

### Update Resident
```http
PUT /residents/:id
```

### Delete Resident
```http
DELETE /residents/:id
```

### Search Residents
```http
GET /residents/search
```

**Query Parameters:**
- `q` (string): Search query
- `barangay_id` (number): Filter by barangay
- `limit` (number): Maximum results

---

## 🏠 Household Management

### Get All Households
```http
GET /households
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `barangay_id` (number): Filter by barangay
- `search` (string): Search by address

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "household_head_id": 1,
      "household_head_name": "Juan Dela Cruz",
      "barangay_id": 1,
      "barangay_name": "San Gabriel",
      "address": "123 Main Street",
      "economic_status": "Middle Class",
      "housing_type": "Single Family",
      "family_count": 5,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get Household by ID
```http
GET /households/:id
```

### Create Household
```http
POST /households
```

**Request Body:**
```json
{
  "household_head_id": 1,
  "barangay_id": 1,
  "address": "789 Pine Street",
  "economic_status": "Middle Class",
  "housing_type": "Single Family",
  "latitude": 11.6081,
  "longitude": 125.4311
}
```

### Update Household
```http
PUT /households/:id
```

### Delete Household
```http
DELETE /households/:id
```

---

## 🗺️ GIS & Mapping

### Get Municipality Boundaries
```http
GET /geojson/municipalities
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "gis_municipality_code": "PH0802604",
        "name": "Borongan City"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[125.4311, 11.6081], ...]]
      }
    }
  ]
}
```

### Get Barangay Boundaries
```http
GET /geojson/barangays
```

**Query Parameters:**
- `municipality_id` (number): Filter by municipality

### Get Specific Barangay Boundary
```http
GET /geojson/barangays/:id
```

### Get City-wide Data
```http
GET /geojson/city
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "San Gabriel",
        "code": "SG001",
        "contact": "+639123456789",
        "email": "sangabriel@barangay.gov.ph",
        "area": 2.5,
        "gis_code": "PH0802604047"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[125.4311, 11.6081], ...]]
      }
    }
  ]
}
```

### Get Household Locations
```http
GET /locations/household
```

**Query Parameters:**
- `barangay_id` (number): Filter by barangay

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "household_id": 1,
      "house_head": "Juan Dela Cruz",
      "resident_count": 5,
      "geom": {
        "type": "Point",
        "coordinates": [125.4311, 11.6081]
      }
    }
  ]
}
```

---

## 📊 Statistics & Reports

### Dashboard Statistics
```http
GET /statistics/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_residents": 15000,
    "total_households": 3500,
    "total_barangays": 61,
    "male_residents": 7500,
    "female_residents": 7500,
    "recent_registrations": 150,
    "pending_requests": 25
  }
}
```

### Resident Statistics
```http
GET /statistics/residents
```

**Query Parameters:**
- `barangay_id` (number): Filter by barangay
- `municipality_id` (number): Filter by municipality

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 15000,
    "by_gender": {
      "male": 7500,
      "female": 7500
    },
    "by_civil_status": {
      "single": 6000,
      "married": 8000,
      "widowed": 800,
      "divorced": 200
    },
    "by_age_group": {
      "0-17": 3000,
      "18-59": 10000,
      "60+": 2000
    }
  }
}
```

### Household Statistics
```http
GET /statistics/households
```

### Demographic Analysis
```http
GET /statistics/demographics
```

---

## 📁 File Management

### Upload File
```http
POST /upload
```

**Headers:**
```http
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>
```

**Form Data:**
- `file`: File to upload
- `category`: File category (resident, household, certificate, etc.)
- `description`: File description

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "filename": "document.pdf",
    "original_name": "resident_document.pdf",
    "file_path": "/uploads/resident/document.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "category": "resident",
    "description": "Resident identification document",
    "uploaded_at": "2024-01-01T12:00:00Z"
  }
}
```

### Get File
```http
GET /files/:id
```

### Delete File
```http
DELETE /files/:id
```

---

## 📋 Request & Certificate Management

### Get All Requests
```http
GET /requests
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status
- `request_type` (string): Filter by type
- `resident_id` (number): Filter by resident

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "resident_id": 1,
      "resident_name": "Juan Dela Cruz",
      "request_type": "barangay_clearance",
      "status": "pending",
      "description": "Request for barangay clearance",
      "required_documents": ["valid_id", "proof_of_residence"],
      "submitted_at": "2024-01-01T12:00:00Z",
      "processed_at": null,
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Create Request
```http
POST /requests
```

**Request Body:**
```json
{
  "resident_id": 1,
  "request_type": "barangay_clearance",
  "description": "Request for barangay clearance",
  "required_documents": ["valid_id", "proof_of_residence"]
}
```

### Update Request Status
```http
PUT /requests/:id/status
```

**Request Body:**
```json
{
  "status": "approved",
  "notes": "Request approved after verification"
}
```

### Get Certificates
```http
GET /certificates
```

**Query Parameters:**
- `request_id` (number): Filter by request
- `certificate_type` (string): Filter by type

### Generate Certificate
```http
POST /certificates
```

**Request Body:**
```json
{
  "request_id": 1,
  "certificate_type": "barangay_clearance",
  "issued_date": "2024-01-01",
  "expiry_date": "2024-12-31"
}
```

---

## 📦 Inventory Management

### Get All Inventories
```http
GET /inventories
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `barangay_id` (number): Filter by barangay
- `category` (string): Filter by category
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "barangay_id": 1,
      "barangay_name": "San Gabriel",
      "item_name": "Computer Set",
      "description": "Desktop computer for barangay office",
      "quantity": 2,
      "unit": "set",
      "category": "electronics",
      "status": "available",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Create Inventory Item
```http
POST /inventories
```

**Request Body:**
```json
{
  "barangay_id": 1,
  "item_name": "New Item",
  "description": "Item description",
  "quantity": 5,
  "unit": "pieces",
  "category": "supplies",
  "status": "available"
}
```

### Update Inventory
```http
PUT /inventories/:id
```

### Delete Inventory
```http
DELETE /inventories/:id
```

---

## 📝 Audit & Logs

### Get Audit Logs
```http
GET /logs
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `user_id` (number): Filter by user
- `action` (string): Filter by action
- `table_name` (string): Filter by table
- `start_date` (string): Start date filter
- `end_date` (string): End date filter

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "user_name": "admin",
      "action": "INSERT",
      "table_name": "residents",
      "record_id": 1,
      "old_values": null,
      "new_values": {
        "id": 1,
        "first_name": "Juan",
        "last_name": "Dela Cruz"
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Get User Activity
```http
GET /logs/user/:user_id
```

### Get Table Changes
```http
GET /logs/table/:table_name
```

---

## 🔧 Rate Limiting

### Limits
- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **File Upload**: 10 requests per minute
- **GIS Data**: 50 requests per minute

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 📚 SDK & Examples

### JavaScript/Node.js Example
```javascript
const api = {
  baseURL: 'http://localhost:5000/api',
  
  async login(username, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return response.json();
  },
  
  async getResidents(token, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/residents?${queryString}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};
```

### cURL Examples
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get residents
curl -X GET http://localhost:5000/api/residents \
  -H "Authorization: Bearer <token>"

# Create resident
curl -X POST http://localhost:5000/api/residents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Juan","last_name":"Dela Cruz","barangay_id":1}'
```

---

**This API documentation provides comprehensive coverage of all BIMS endpoints, including authentication, data management, GIS operations, and administrative functions.**

*Last updated: December 2024*
