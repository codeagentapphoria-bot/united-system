# Automatic Cache Refresh System

## Overview

The BIMS application now includes a comprehensive automatic cache refresh system that ensures Redis cache is automatically invalidated and refreshed after any CRUD (Create, Read, Update, Delete) operation. This eliminates the need for manual page refreshes to see updated data.

## How It Works

### Backend Implementation

The backend uses Redis cache middleware that automatically invalidates cache patterns when CRUD operations are performed:

1. **Cache Middleware**: `server/src/middlewares/redisCache.js`
   - `smartInvalidateCache()`: Automatically detects and invalidates related cache patterns
   - `redisCache()`: Caches GET requests with configurable TTL
   - Pattern-based invalidation for related data

2. **Route Configuration**: All CRUD routes use `smartInvalidateCache()` middleware:
   ```javascript
   router.post("/pet", ...allUsers, upsertPet, smartInvalidateCache());
   router.put("/:petId/pet", ...allUsers, upsertPet, smartInvalidateCache());
   router.delete("/:petId/pet", ...allUsers, deletePet, smartInvalidateCache());
   ```

### Frontend Implementation

The frontend uses unified auto refresh hooks that automatically trigger data refresh after successful CRUD operations:

1. **Unified Auto Refresh Hook**: `client/src/hooks/useUnifiedAutoRefresh.js`
   - Provides consistent auto refresh across all entities
   - Handles CRUD operations with automatic cache refresh
   - Supports multiple entity types and patterns

2. **CRUD with Auto Refresh Hook**: `client/src/hooks/useCRUDWithAutoRefresh.js`
   - Pre-built hooks for common entities (residents, households, pets, etc.)
   - Automatic success/error handling
   - Consistent user feedback

## Usage Examples

### Basic Usage

```javascript
import { useUnifiedAutoRefresh } from '@/hooks/useUnifiedAutoRefresh';

const MyComponent = () => {
  const { registerRefreshCallback, handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'pet',
    successMessage: 'Pet operation completed successfully!',
    autoRefresh: true,
  });

  // Register your fetch function for auto refresh
  useEffect(() => {
    const unregister = registerRefreshCallback(fetchData);
    return unregister;
  }, [registerRefreshCallback, fetchData]);

  // Use handleCRUDOperation for all mutations
  const createItem = async (data) => {
    return await handleCRUDOperation(api.post, data);
  };
};
```

### Entity-Specific Hooks

```javascript
import { usePetsCRUD } from '@/hooks/useCRUDWithAutoRefresh';

const PetsPage = () => {
  const { data, loading, create, update, delete: remove } = usePetsCRUD({
    fetchFunction: fetchPets,
    createFunction: createPet,
    updateFunction: updatePet,
    deleteFunction: deletePet,
  });

  // All CRUD operations automatically trigger cache refresh
  const handleCreate = async (petData) => {
    await create(petData); // Automatically refreshes cache
  };
};
```

### Updated Existing Hooks

The existing hooks have been enhanced to use the unified auto refresh system:

```javascript
// usePets hook now includes auto refresh
export const usePets = () => {
  const { registerRefreshCallback, handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'pet',
    successMessage: 'Pet operation completed successfully!',
    autoRefresh: true,
  });

  // CRUD operations use handleCRUDOperation
  const createPet = async (petData) => {
    return await handleCRUDOperation(api.post, petData);
  };
};
```

## Cache Patterns

The system automatically invalidates cache patterns based on the entity type:

- **Residents**: `residents:*`, `api:*/list/residents*`, `api:*/statistics*`
- **Households**: `household:*`, `api:*/list/household*`, `api:*/statistics*`
- **Pets**: `pets:*`, `api:*/list/pets*`
- **Inventories**: `inventory:*`, `api:*/list/inventories*`
- **Archives**: `archives:*`, `api:*/list/archives*`

## Benefits

1. **Automatic Refresh**: No manual page refresh needed after CRUD operations
2. **Consistent UX**: All entities behave the same way
3. **Performance**: Redis cache is properly invalidated and refreshed
4. **Developer Experience**: Simple hooks for consistent implementation
5. **Error Handling**: Built-in success/error feedback

## Implementation Status

### ✅ Completed
- Backend cache invalidation middleware
- Unified auto refresh hooks
- CRUD with auto refresh hooks
- Updated usePets hook
- All backend routes have cache invalidation

### 🔄 In Progress
- Updating remaining frontend hooks
- Testing across all entities
- Documentation updates

### 📋 Next Steps
- Update remaining entity hooks (residents, households, etc.)
- Test the system across all CRUD operations
- Performance testing and optimization

## Testing

To test the automatic cache refresh:

1. **Create Operation**: Add a new item and verify the list updates automatically
2. **Update Operation**: Edit an item and verify changes appear immediately
3. **Delete Operation**: Remove an item and verify it disappears from the list
4. **Cross-Entity**: Verify that related data (e.g., resident statistics) updates when residents are modified

## Troubleshooting

### Common Issues

1. **Cache Not Refreshing**: Ensure the hook is properly registered with `registerRefreshCallback`
2. **Double Refresh**: Check that `autoRefresh` is not enabled in multiple places
3. **Error Handling**: Verify error messages are properly displayed

### Debug Mode

Enable debug logging by setting:
```javascript
const { registerRefreshCallback, handleCRUDOperation } = useUnifiedAutoRefresh({
  entityType: 'pet',
  debug: true, // Enable debug logging
});
```

## Migration Guide

### For Existing Components

1. **Replace manual refresh calls**:
   ```javascript
   // Old way
   await api.post('/pet', data);
   await fetchPets(); // Manual refresh
   
   // New way
   await handleCRUDOperation(api.post, data); // Automatic refresh
   ```

2. **Register fetch functions**:
   ```javascript
   useEffect(() => {
     const unregister = registerRefreshCallback(fetchData);
     return unregister;
   }, [registerRefreshCallback, fetchData]);
   ```

3. **Use entity-specific hooks when possible**:
   ```javascript
   // Instead of manual implementation
   const { create, update, delete: remove } = usePetsCRUD();
   ```

This system ensures that all CRUD operations automatically refresh the Redis cache, providing a seamless user experience without manual page refreshes.