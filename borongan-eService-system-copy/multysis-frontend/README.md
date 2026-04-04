# Multysis Frontend

A professional React + TypeScript frontend application with separate Admin and Portal sections.

## Features

### Admin Section
- **Admin Login** - Secure authentication for administrators
- **Admin Dashboard** - Overview with statistics and recent activity
- **Role-based Access** - Protected routes requiring admin privileges

### Portal Section
- **User Login** - Philippine phone number authentication
- **User Signup** - Complete registration with validation
- **User Dashboard** - Personalized user dashboard
- **Quick Actions** - Easy access to common features

## Tech Stack

- **React 19** - Latest React version
- **TypeScript** - Type-safe development
- **React Router v6** - Client-side routing
- **React Hook Form** - Performant form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **Vite** - Fast build tool

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── ProtectedRoute.tsx
│   └── layout/          # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── DashboardLayout.tsx
├── pages/
│   ├── admin/           # Admin pages
│   │   ├── AdminLogin.tsx
│   │   └── AdminDashboard.tsx
│   └── portal/          # Portal pages
│       ├── PortalLogin.tsx
│       ├── PortalSignup.tsx
│       └── PortalDashboard.tsx
├── context/             # React Context
│   └── AuthContext.tsx
├── services/            # API services
│   └── api/
│       └── auth.service.ts
├── validations/         # Zod schemas
│   └── auth.schema.ts
├── types/               # TypeScript types
│   └── auth.ts
├── utils/               # Utility functions
│   └── cn.ts
├── routes/              # Route configuration
│   └── index.tsx
└── App.tsx              # Main app component
```

## Authentication

### Phone Number Format
- Accepts Philippine mobile numbers
- Formats: `09XXXXXXXXX` or `+639XXXXXXXXX`
- Example: `09171234567`

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

## Features Implemented

### Form Validation
- Real-time validation with Zod
- User-friendly error messages
- Philippine phone number validation
- Password strength validation

### Protected Routes
- Authentication required routes
- Role-based access control
- Automatic redirection for unauthorized access

### Responsive Design
- Mobile-first approach
- Responsive sidebar
- Adaptive layouts
- Touch-friendly interfaces

### User Experience
- Loading states
- Error handling
- Toast notifications ready
- Smooth transitions

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```
Visit: http://localhost:5173

### Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Routes

### Admin Routes
- `/admin/login` - Admin login page
- `/admin/dashboard` - Admin dashboard (protected)

### Portal Routes
- `/portal/login` - User login page
- `/portal/signup` - User registration page
- `/portal/dashboard` - User dashboard (protected)

## Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=Multysis
```

## Usage Examples

### Login
```typescript
// Philippine phone number format
Phone: 09171234567
Password: YourPassword123
```

### Signup
```typescript
Name: Juan Dela Cruz
Phone: 09171234567
Password: SecurePass123
Confirm Password: SecurePass123
```

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom colors
      }
    }
  }
}
```

### Layout
Modify components in `src/components/layout/` to customize:
- Header appearance
- Sidebar navigation
- Dashboard layout

## Testing

The application includes:
- Form validation testing
- Protected route testing
- Authentication flow testing

## Build Output

```bash
npm run build
```

Output directory: `dist/`

## Deployment

1. Build the application
2. Deploy the `dist` folder to your hosting service
3. Configure environment variables on your hosting platform

## License

MIT

## Authors

Apphorialabs
