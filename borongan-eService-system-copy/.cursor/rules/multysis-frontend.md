# Multysis Frontend Development Rules

## 🎯 Project Overview
This is a React + TypeScript admin dashboard built with Vite, shadcn/ui, Tailwind CSS, and React Hook Form. The project follows a clean, organized architecture with separation of concerns.

## 📁 Project Structure

### Core Architecture
- **Pages**: `/src/pages/admin/` - Main admin pages (AdminDashboard, AdminCitizens, AdminSubscribers)
- **Components**: `/src/components/` - Reusable UI components
- **Hooks**: `/src/hooks/` - Custom React hooks for business logic
- **Validations**: `/src/validations/` - Zod schemas for form validation
- **Config**: `/src/config/` - Configuration files (menus, routes, etc.)

### Component Organization
```
/src/components/
├── ui/                    # shadcn/ui components
├── layout/               # Layout components (Sidebar, Header, DashboardLayout)
├── modals/               # Modal components (AddCitizenModal, EditProfileModal)
├── common/               # Shared components (FormLabel, ProtectedRoute)
├── citizens/forms/        # Citizen-specific form components
└── subscribers/forms/     # Subscriber-specific form components
```

## 🎨 Design System

### Color Palette
- **Primary**: `#4c6085` (Blue) - Main brand color
- **Heading**: `#4d5258` (Dark Gray) - Text headings
- **Success**: Green variants for success states
- **Warning**: Yellow variants for warnings
- **Danger**: Red variants for errors
- **Neutral**: Gray variants for neutral states

### Typography
- **Font Family**: Poppins (applied globally)
- **Headings**: Use `text-heading-700` for main headings
- **Card Titles**: Use `text-lg` for card titles
- **Form Labels**: Use `FormLabel` component for consistent styling

### Spacing & Layout
- **Form Spacing**: Use `space-y-8` for form sections
- **Card Spacing**: Use `space-y-4` for card content
- **Grid Layouts**: Use `md:grid-cols-12` for profile picture + fields layout
- **Responsive**: Mobile-first approach with `md:` breakpoints

## 🧩 Component Patterns

### Form Components
- **Always use React Hook Form** with Zod validation
- **Extract form logic** into custom hooks (`useAddCitizen`, `useEditProfile`)
- **Create reusable form field components** for complex forms
- **Use `FormLabel` component** for consistent label styling with required/optional indicators

### Modal Components
- **Consistent structure**: Dialog → DialogContent → DialogHeader → Form
- **Section organization**: Wrap form sections in containers with headers
- **Action buttons**: Always at bottom with consistent styling
- **Type assertions**: Use `as any` for cross-schema compatibility when reusing components

### Layout Components
- **DashboardLayout**: Main layout wrapper with sidebar and header
- **Responsive design**: Mobile-first with proper breakpoints
- **Consistent navigation**: Use `adminMenuItems` for sidebar configuration

## 🔧 Technical Patterns

### TypeScript
- **Type imports**: Use `import type` for TypeScript types
- **Runtime imports**: Use regular imports for runtime values (components, functions)
- **Schema validation**: Always use Zod schemas with proper TypeScript inference
- **Form types**: Export form input types from validation schemas

### React Hook Form
- **Custom hooks**: Extract form logic into `use[Feature]` hooks
- **Validation**: Use `zodResolver` for schema validation
- **Error handling**: Access errors via `form.formState.errors`
- **Loading states**: Use `form.formState.isSubmitting` for button states

### Component Reusability
- **Form field components**: Create reusable field components for complex forms
- **Cross-schema compatibility**: Use type assertions when reusing components across different schemas
- **Consistent props**: Use consistent prop interfaces for similar components

## 📋 Development Guidelines

### File Naming
- **Components**: PascalCase (e.g., `AddCitizenModal.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useCitizens.ts`)
- **Schemas**: kebab-case with `.schema.ts` suffix (e.g., `citizen.schema.ts`)

### Code Organization
- **Single responsibility**: Each component/hook should have one clear purpose
- **Separation of concerns**: Keep UI, logic, and validation separate
- **Reusable components**: Extract common patterns into reusable components
- **Clean imports**: Organize imports with external libraries first, then internal

### Form Development
- **Schema first**: Define Zod schemas before building forms
- **Hook extraction**: Move form logic to custom hooks
- **Component breakdown**: Break large forms into smaller, focused components
- **Validation consistency**: Use consistent validation patterns across forms

### UI/UX Patterns
- **Consistent spacing**: Use Tailwind spacing scale consistently
- **Responsive design**: Always consider mobile and desktop layouts
- **Loading states**: Show loading indicators for async operations
- **Error handling**: Display validation errors clearly
- **Accessibility**: Use proper form labels and ARIA attributes

## 🚀 Best Practices

### Performance
- **Lazy loading**: Use dynamic imports for large components
- **Memoization**: Use React.memo for expensive components
- **Form optimization**: Use React Hook Form's built-in optimizations

### Code Quality
- **Type safety**: Always use TypeScript strict mode
- **Error boundaries**: Implement error boundaries for robust error handling
- **Consistent patterns**: Follow established patterns for similar functionality
- **Documentation**: Comment complex logic and business rules

### Testing
- **Component testing**: Test components in isolation
- **Form testing**: Test form validation and submission
- **Hook testing**: Test custom hooks independently
- **Integration testing**: Test complete user flows

## 🔄 Common Patterns

### Modal Development
```typescript
// 1. Create validation schema
export const addItemSchema = z.object({...});

// 2. Create custom hook
export const useAddItem = () => {
  const form = useForm<AddItemInput>({
    resolver: zodResolver(addItemSchema),
    defaultValues: {...}
  });
  // ... form logic
};

// 3. Create modal component
export const AddItemModal = ({ open, onClose, onSubmit }) => {
  const { form, handleAddItem } = useAddItem();
  // ... modal JSX
};
```

### Form Field Components
```typescript
// Create reusable form field components
export const PersonalInfoFields = ({ register, errors, control }) => {
  return (
    <div className="space-y-4">
      {/* Form fields */}
    </div>
  );
};
```

### Page Organization
```typescript
// Main page component
export const AdminPage = () => {
  const { data, handlers } = usePageData();
  const [modals, setModals] = useState({});
  
  return (
    <DashboardLayout title="Page Title" menuItems={adminMenuItems}>
      {/* Page content */}
      {/* Modals */}
    </DashboardLayout>
  );
};
```

## 🎨 Styling Guidelines

### Tailwind Classes
- **Colors**: Use semantic color names (primary-600, success-100, etc.)
- **Spacing**: Use consistent spacing scale (space-y-4, space-y-8)
- **Typography**: Use consistent text sizes and weights
- **Layout**: Use CSS Grid and Flexbox appropriately

### Component Styling
- **Consistent classes**: Use the same classes for similar elements
- **Responsive design**: Always consider mobile and desktop layouts
- **State styling**: Use consistent hover, focus, and active states
- **Color consistency**: Use the defined color palette throughout

## 🔧 Development Workflow

### Adding New Features
1. **Define schema** - Create Zod validation schema
2. **Create hooks** - Extract business logic into custom hooks
3. **Build components** - Create UI components with proper TypeScript
4. **Add to pages** - Integrate components into main pages
5. **Test thoroughly** - Ensure all functionality works correctly

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Form validation is implemented
- [ ] Components are reusable
- [ ] Styling is consistent
- [ ] Error handling is proper
- [ ] Loading states are handled
- [ ] Responsive design is considered

## 📚 Resources

### Key Libraries
- **React Hook Form**: Form management and validation
- **Zod**: Schema validation
- **shadcn/ui**: UI component library
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **TypeScript**: Type safety

### Documentation
- Follow established patterns in existing code
- Use consistent naming conventions
- Maintain clean, readable code
- Document complex business logic
- Keep components focused and reusable

---

*This project follows a clean, organized architecture with separation of concerns. Always prioritize code reusability, type safety, and user experience.*
