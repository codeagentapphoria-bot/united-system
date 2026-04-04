# 🎨 Frontend Documentation
## BIMS React Application Architecture

---

## 📋 Table of Contents

1. [Frontend Overview](#frontend-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Architecture](#component-architecture)
5. [State Management](#state-management)
6. [Routing & Navigation](#routing--navigation)
7. [Mapping System](#mapping-system)
8. [Form Management](#form-management)
9. [API Integration](#api-integration)
10. [Styling & UI](#styling--ui)
11. [Performance Optimization](#performance-optimization)
12. [Testing Strategy](#testing-strategy)
13. [Build & Deployment](#build--deployment)

---

## 🎯 Frontend Overview

### Application Purpose
The BIMS frontend is a modern React application designed to provide an intuitive and efficient interface for managing barangay information, residents, households, and administrative tasks. It features advanced GIS mapping capabilities and responsive design for various screen sizes.

### Key Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Interactive Maps**: Leaflet-based mapping with GIS integration
- **Real-time Updates**: Live data synchronization with the backend
- **Role-based Access**: Different interfaces for different user roles
- **Modern UI**: Clean, professional interface using Shadcn/ui components

### User Roles & Interfaces
- **Municipality Admin**: Full system access with municipality-wide oversight
- **Barangay Admin**: Barangay-specific management interface
- **Staff**: Limited access based on assigned permissions

---

## 🛠️ Technology Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.x | UI framework and component library |
| **Vite** | 5.x | Build tool and development server |
| **React Router** | 6.x | Client-side routing and navigation |
| **React Hook Form** | 7.x | Form state management and validation |
| **Zod** | 3.x | Schema validation |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Shadcn/ui** | Latest | High-quality UI component library |
| **Lucide React** | Latest | Icon library |
| **Class Variance Authority** | Latest | Component variant management |

### Mapping & GIS
| Technology | Version | Purpose |
|------------|---------|---------|
| **Leaflet** | 1.9.x | Interactive mapping library |
| **React Leaflet** | 4.x | React wrapper for Leaflet |
| **Proj4js** | Latest | Coordinate system transformations |

### Development Tools
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting and quality enforcement |
| **Prettier** | Code formatting |
| **TypeScript** | Type safety and development experience |
| **Vite** | Fast development and build tooling |

---

## 📁 Project Structure

### Directory Organization
```
client/src/
├── components/           # Reusable UI components
│   ├── ui/              # Shadcn/ui components
│   ├── common/          # Shared components
│   │   ├── MunicipalityMap.jsx
│   │   ├── MunicipalityBarangaysMap.jsx
│   │   ├── BarangayGeoMap.jsx
│   │   └── BarangayBoundaryMap.jsx
│   └── layout/          # Layout components
├── features/            # Feature-specific components
│   ├── dashboard/       # Dashboard feature
│   ├── municipality/    # Municipality management
│   ├── barangay/        # Barangay management
│   ├── household/       # Household management
│   └── pets/           # Pet management
├── pages/              # Page components
│   ├── admin/          # Admin pages
│   ├── auth/           # Authentication pages
│   └── shared/         # Shared pages
├── hooks/              # Custom React hooks
├── contexts/           # React contexts
├── utils/              # Utility functions
├── services/           # API services
├── config/             # Configuration files
├── constants/          # Application constants
├── styles/             # Global styles
└── assets/             # Static assets
```

### Key Files
- **App.jsx**: Main application component
- **main.jsx**: Application entry point
- **index.html**: HTML template
- **vite.config.js**: Vite configuration
- **tailwind.config.ts**: Tailwind CSS configuration
- **components.json**: Shadcn/ui configuration

---

## 🧩 Component Architecture

### Component Hierarchy
```
App
├── AuthProvider
├── Router
│   ├── LoginPage
│   ├── DashboardPage
│   ├── MunicipalitySetupForm
│   ├── BarangaySetupForm
│   ├── SettingsPage
│   ├── GeoMapPage
│   └── HouseholdForm
└── Layout
    ├── Sidebar
    ├── Header
    └── MainContent
```

### Component Categories

#### Layout Components
```jsx
// Layout.jsx - Main layout wrapper
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};
```

#### Common Components
```jsx
// MunicipalityMap.jsx - Interactive municipality selection
const MunicipalityMap = ({
  onMunicipalitySelect,
  selectedMunicipalityId,
  existingMunicipalityId
}) => {
  // Component implementation
};

// MunicipalityBarangaysMap.jsx - Barangay selection within municipality
const MunicipalityBarangaysMap = ({
  municipalityId,
  onBarangaySelect,
  selectedBarangayId,
  existingBarangayId
}) => {
  // Component implementation
};
```

#### Feature Components
```jsx
// MunicipalitySetupForm.jsx - Municipality configuration
const MunicipalitySetupForm = () => {
  const [selectedMunicipality, setSelectedMunicipality] = useState(null);
  
  const handleMunicipalitySelect = (municipality) => {
    setSelectedMunicipality(municipality);
    form.setValue('municipalityName', municipality.name);
    form.setValue('gisCode', municipality.gis_code);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <MunicipalityMap
        onMunicipalitySelect={handleMunicipalitySelect}
        selectedMunicipalityId={selectedMunicipality?.gis_code}
      />
    </form>
  );
};
```

### Component Patterns

#### Controlled Components
```jsx
const ControlledInput = ({ value, onChange, ...props }) => {
  return (
    <input
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 border rounded-md"
      {...props}
    />
  );
};
```

#### Compound Components
```jsx
const Card = ({ children, ...props }) => (
  <div className="bg-white rounded-lg shadow-md p-6" {...props}>
    {children}
  </div>
);

Card.Header = ({ children }) => (
  <div className="mb-4 border-b pb-2">{children}</div>
);

Card.Content = ({ children }) => <div>{children}</div>;
```

---

## 🔄 State Management

### React Context API
```jsx
// AuthContext.jsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      setUser(response.data.user);
      localStorage.setItem('token', response.data.token);
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Custom Hooks
```jsx
// useAuth.jsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// useApi.jsx
export const useApi = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(url, options);
      setData(response.data);
      return response.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
};
```

### Form State Management
```jsx
// Using React Hook Form
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: {
    firstName: '',
    lastName: '',
    email: '',
    barangayId: ''
  }
});

const onSubmit = async (data) => {
  try {
    await api.post('/residents', data);
    toast.success('Resident created successfully');
    form.reset();
  } catch (error) {
    toast.error('Failed to create resident');
  }
};
```

---

## 🧭 Routing & Navigation

### Route Configuration
```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="municipality" element={<MunicipalitySetupForm />} />
            <Route path="barangay" element={<BarangaySetupForm />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="geomap" element={<GeoMapPage />} />
            <Route path="households" element={<HouseholdForm />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
```

### Protected Routes
```jsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : null;
};
```

### Navigation Components
```jsx
// Sidebar.jsx
const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/geomap', label: 'Geographic Map', icon: Map },
    { path: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav className="w-64 bg-white shadow-lg">
      {menuItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center px-4 py-2 ${
              isActive ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
            }`
          }
        >
          <item.icon className="w-5 h-5 mr-3" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};
```

---

## 🗺️ Mapping System

### Map Components Overview

#### MunicipalityMap
```jsx
const MunicipalityMap = ({
  onMunicipalitySelect,
  selectedMunicipalityId,
  existingMunicipalityId
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const layerRefs = useRef(new Map());

  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        const response = await api.get('/geojson/municipalities');
        setGeoJsonData(response.data);
      } catch (error) {
        console.error('Error fetching municipalities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMunicipalities();
  }, []);

  const onEachFeature = (feature, layer) => {
    const properties = feature.properties;
    
    layerRefs.current.set(properties.gis_municipality_code, layer);
    layer.gisCode = properties.gis_municipality_code;

    layer.on({
      click: () => {
        onMunicipalitySelect({
          gis_code: properties.gis_municipality_code,
          name: properties.name,
        });
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 4,
          fillOpacity: 0.8,
        });
        
        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-lg">${properties.name}</h3>
            <p class="text-sm text-gray-600">Municipality</p>
          </div>
        `;
        layer.bindPopup(popupContent).openPopup();
      },
      mouseout: (e) => {
        const layer = e.target;
        const style = getLayerStyle(layer.gisCode);
        layer.setStyle(style);
        layer.closePopup();
      },
    });
  };

  return (
    <MapContainer center={[11.6081, 125.4311]} zoom={8}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geoJsonData && (
        <GeoJSON
          data={geoJsonData}
          onEachFeature={onEachFeature}
          style={defaultStyle}
        />
      )}
    </MapContainer>
  );
};
```

#### MunicipalityBarangaysMap
```jsx
const MunicipalityBarangaysMap = ({
  municipalityId,
  onBarangaySelect,
  selectedBarangayId,
  existingBarangayId
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const dataCache = useRef(new Map());
  const layerRefs = useRef(new Map());
  const hasLoadedData = useRef(false);

  useEffect(() => {
    if (!municipalityId || hasLoadedData.current) return;

    const fetchBarangays = async () => {
      try {
        // Check cache first
        if (dataCache.current.has(municipalityId)) {
          setGeoJsonData(dataCache.current.get(municipalityId));
          setLoading(false);
          return;
        }

        const response = await api.get(`/geojson/barangays/${municipalityId}`);
        dataCache.current.set(municipalityId, response.data);
        setGeoJsonData(response.data);
        hasLoadedData.current = true;
      } catch (error) {
        console.error('Error fetching barangays:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBarangays();
  }, [municipalityId]);

  const onEachFeature = useCallback((feature, layer) => {
    const properties = feature.properties;
    
    layerRefs.current.set(properties.gis_barangay_code, layer);
    layer.gisCode = properties.gis_barangay_code;

    layer.on({
      click: () => {
        onBarangaySelect({
          gis_code: properties.gis_barangay_code,
          name: properties.name,
        });
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 4,
          fillOpacity: 0.8,
        });
        
        const popupContent = `
          <div class="p-2">
            <h3 class="font-semibold text-lg">${properties.name}</h3>
            <p class="text-sm text-gray-600">Barangay</p>
          </div>
        `;
        layer.bindPopup(popupContent).openPopup();
      },
      mouseout: (e) => {
        const layer = e.target;
        const style = getLayerStyle(layer.gisCode);
        layer.setStyle(style);
        layer.closePopup();
      },
    });
  }, [selectedBarangayId, existingBarangayId, onBarangaySelect]);

  return (
    <MapContainer center={[11.6081, 125.4311]} zoom={10}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geoJsonData && (
        <GeoJSON
          data={geoJsonData}
          onEachFeature={onEachFeature}
          style={defaultStyle}
        />
      )}
    </MapContainer>
  );
};
```

### Map Styling & Interactions
```jsx
const getLayerStyle = (gisCode) => {
  const isSelected = selectedBarangayId && gisCode === selectedBarangayId;
  const isExisting = existingBarangayId && gisCode === existingBarangayId;

  if (isSelected) {
    return {
      fillColor: "#3b82f6",
      weight: 3,
      opacity: 1,
      color: "#1d4ed8",
      fillOpacity: 0.7,
    };
  } else if (isExisting) {
    return {
      fillColor: "#8b5cf6",
      weight: 3,
      opacity: 1,
      color: "#6d28d9",
      fillOpacity: 0.6,
    };
  } else {
    return {
      fillColor: "#10b981",
      weight: 2,
      opacity: 1,
      color: "#059669",
      fillOpacity: 0.3,
    };
  }
};
```

---

## 📝 Form Management

### React Hook Form Integration
```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const residentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  barangayId: z.number().min(1, 'Barangay is required'),
  birthDate: z.string().min(1, 'Birth date is required'),
  gender: z.enum(['Male', 'Female']),
  civilStatus: z.enum(['Single', 'Married', 'Widowed', 'Divorced']),
});

const ResidentForm = () => {
  const form = useForm({
    resolver: zodResolver(residentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      barangayId: '',
      birthDate: '',
      gender: 'Male',
      civilStatus: 'Single',
    },
  });

  const onSubmit = async (data) => {
    try {
      await api.post('/residents', data);
      toast.success('Resident created successfully');
      form.reset();
    } catch (error) {
      toast.error('Failed to create resident');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...form.register('firstName')}
            className={form.formState.errors.firstName ? 'border-red-500' : ''}
          />
          {form.formState.errors.firstName && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.firstName.message}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...form.register('lastName')}
            className={form.formState.errors.lastName ? 'border-red-500' : ''}
          />
          {form.formState.errors.lastName && (
            <p className="text-red-500 text-sm mt-1">
              {form.formState.errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Creating...' : 'Create Resident'}
      </Button>
    </form>
  );
};
```

### Form Components
```jsx
// Custom form components
const FormField = ({ label, error, children }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </div>
);

const SelectField = ({ options, ...props }) => (
  <select
    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    {...props}
  >
    <option value="">Select an option</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
```

---

## 🔌 API Integration

### API Service Layer
```jsx
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Custom API Hooks
```jsx
// useResidents.js
export const useResidents = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchResidents = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/residents', { params });
      setResidents(response.data.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createResident = useCallback(async (data) => {
    try {
      const response = await api.post('/residents', data);
      setResidents(prev => [...prev, response.data.data]);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    residents,
    loading,
    error,
    fetchResidents,
    createResident,
  };
};
```

### Data Fetching Patterns
```jsx
// Component with data fetching
const ResidentsList = () => {
  const { residents, loading, error, fetchResidents } = useResidents();
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchResidents(filters);
  }, [fetchResidents, filters]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="space-y-4">
      <ResidentsFilters onFiltersChange={setFilters} />
      <ResidentsTable residents={residents} />
    </div>
  );
};
```

---

## 🎨 Styling & UI

### Tailwind CSS Configuration
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Shadcn/ui Components
```jsx
// Component usage examples
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ExampleComponent = () => (
  <Card>
    <CardHeader>
      <CardTitle>Resident Information</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter name" />
        </div>
        <div className="flex gap-2">
          <Badge variant="default">Active</Badge>
          <Badge variant="secondary">Verified</Badge>
        </div>
        <Button>Save Changes</Button>
      </div>
    </CardContent>
  </Card>
);
```

### Custom Component Library
```jsx
// Custom components with consistent styling
const StatusBadge = ({ status }) => {
  const variants = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status]}`}>
      {status}
    </span>
  );
};

const DataTable = ({ data, columns }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          {columns.map(column => (
            <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map(column => (
              <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
```

---

## ⚡ Performance Optimization

### React.memo for Component Memoization
```jsx
const ResidentCard = React.memo(({ resident, onEdit, onDelete }) => {
  return (
    <Card>
      <CardContent>
        <h3 className="font-semibold">{resident.firstName} {resident.lastName}</h3>
        <p className="text-gray-600">{resident.email}</p>
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => onEdit(resident)}>Edit</Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(resident.id)}>Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
});
```

### useMemo for Expensive Calculations
```jsx
const ResidentsList = ({ residents, filters }) => {
  const filteredResidents = useMemo(() => {
    return residents.filter(resident => {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          resident.firstName.toLowerCase().includes(searchTerm) ||
          resident.lastName.toLowerCase().includes(searchTerm) ||
          resident.email.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    });
  }, [residents, filters.search]);

  return (
    <div>
      {filteredResidents.map(resident => (
        <ResidentCard key={resident.id} resident={resident} />
      ))}
    </div>
  );
};
```

### useCallback for Function Memoization
```jsx
const MunicipalitySetupForm = () => {
  const handleMunicipalitySelect = useCallback((municipality) => {
    setSelectedMunicipality(municipality);
    form.setValue('municipalityName', municipality.name);
    form.setValue('gisCode', municipality.gis_code);
  }, [form]);

  return (
    <MunicipalityMap
      onMunicipalitySelect={handleMunicipalitySelect}
      selectedMunicipalityId={selectedMunicipality?.gis_code}
    />
  );
};
```

### Lazy Loading
```jsx
// Lazy load components
const GeoMapPage = lazy(() => import('./pages/admin/shared/GeoMapPage'));
const SettingsPage = lazy(() => import('./pages/admin/shared/SettingsPage'));

// Suspense wrapper
const App = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/geomap" element={<GeoMapPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  </Suspense>
);
```

---

## 🧪 Testing Strategy

### Unit Testing with Jest & React Testing Library
```jsx
// ResidentCard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ResidentCard from './ResidentCard';

describe('ResidentCard', () => {
  const mockResident = {
    id: 1,
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan@example.com',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  it('renders resident information correctly', () => {
    render(
      <ResidentCard
        resident={mockResident}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('juan@example.com')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ResidentCard
        resident={mockResident}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockResident);
  });
});
```

### Integration Testing
```jsx
// MunicipalitySetupForm.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MunicipalitySetupForm from './MunicipalitySetupForm';

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('MunicipalitySetupForm', () => {
  it('submits form with correct data', async () => {
    const mockOnSubmit = jest.fn();
    
    renderWithRouter(<MunicipalitySetupForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('Municipality Name'), {
      target: { value: 'Test Municipality' },
    });

    fireEvent.click(screen.getByText('Save Municipality'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        municipalityName: 'Test Municipality',
        gisCode: expect.any(String),
      });
    });
  });
});
```

---

## 🚀 Build & Deployment

### Vite Configuration
```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Configuration
```bash
# .env.development
VITE_API_URL=http://localhost:5000/api
VITE_MAP_API_KEY=your_map_api_key

# .env.production
VITE_API_URL=https://your-domain.com/api
VITE_MAP_API_KEY=your_production_map_api_key
```

### Build Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext js,jsx --fix"
  }
}
```

### Deployment Configuration
```nginx
# Nginx configuration for production
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/bims/client/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

**This frontend documentation provides comprehensive coverage of the BIMS React application architecture, including components, state management, mapping features, and deployment strategies.**

*Last updated: December 2024*
