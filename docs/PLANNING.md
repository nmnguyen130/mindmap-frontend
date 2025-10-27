# Frontend Planning: Mind Mapping App

## Unified Architecture with Expo SDK 53+

Building on Expo's latest capabilities (SDK 53+), we leverage React Native Web for true cross-platform development. The architecture emphasizes code sharing while maintaining platform-specific optimizations where needed.

### Platform Architecture
```
Expo Application (SDK 53+)
├── React Native Core (0.76+)
├── Platform-Specific Modules
│   ├── Web (React Native Web 0.19+)
│   ├── iOS (Native)
│   └── Android (Native)
├── Expo SDK Modules
│   ├── Router v4+ (File-based routing)
│   ├── SQLite (Local database)
│   ├── File System
│   ├── Secure Store
│   └── Device Features
└── Shared Business Logic
    ├── Zustand Stores
    ├── TanStack Query
    └── Custom Hooks
```

## Component Architecture

### File-Based Routing with Expo Router v4+
```
app/
├── _layout.tsx              # Root layout with providers
├── (auth)/                  # Authentication group
│   ├── _layout.tsx          # Auth layout
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
├── (tabs)/                  # Main app tabs
│   ├── _layout.tsx          # Tab layout with navigation
│   ├── index.tsx            # Dashboard
│   ├── explore.tsx          # Public maps gallery
│   ├── create.tsx           # Quick create mind map
│   └── profile.tsx          # User profile/settings
├── mindmap/
│   ├── [id].tsx             # Mind map editor (dynamic route)
│   ├── create.tsx           # Create new mind map
│   ├── [id]/share.tsx       # Share specific mind map
│   └── [id]/collaborate.tsx # Collaboration view
├── modal/                   # Modal routes
│   └── ai-assistant.tsx     # AI assistant modal
└── +not-found.tsx           # 404 page
```

### Component Organization
```
components/
├── ui/                      # Reusable UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── modal.tsx
│   ├── toast.tsx
│   └── loading.tsx
├── mindmap/                 # Mind map specific components
│   ├── canvas/              # Platform-adaptive canvas
│   │   ├── web-canvas.tsx   # React Flow implementation
│   │   ├── mobile-canvas.tsx # Skia implementation
│   │   └── canvas.tsx       # Platform selector
│   ├── node/                # Node components
│   ├── connection/          # Connection components
│   └── toolbar/             # Editing tools
├── forms/                   # Form components
│   ├── auth-form.tsx
│   ├── mindmap-form.tsx
│   └── settings-form.tsx
├── layout/                  # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx          # Web-specific
│   ├── tab-bar.tsx          # Mobile-specific
│   └── navigation.tsx
└── providers/               # Context providers
    ├── theme-provider.tsx
    └── auth-provider.tsx
```

## State Management with Zustand

### Store Structure
```typescript
// stores/auth.ts
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

// stores/mindmaps.ts
interface MindMapState {
  maps: MindMap[]
  currentMap: MindMap | null
  isLoading: boolean
  error: string | null
  // Actions
  loadMaps: () => Promise<void>
  createMap: (data: CreateMapData) => Promise<MindMap>
  updateMap: (id: string, updates: Partial<MindMap>) => Promise<void>
  deleteMap: (id: string) => Promise<void>
  setCurrentMap: (map: MindMap | null) => void
}

// stores/ui.ts
interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean  // Web only
  modalStack: Modal[]
  notifications: Notification[]
  // Actions
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  showModal: (modal: Modal) => void
  hideModal: (id: string) => void
  addNotification: (notification: Notification) => void
}

// stores/index.ts - Combined exports
export { useAuthStore, useMindMapStore, useUIStore }
```

### Zustand Best Practices
- **Immer Integration**: Use `immer` middleware for complex state mutations
- **Persistence**: Use `persist` middleware for critical state
- **DevTools**: Enable Redux DevTools integration in development
- **TypeScript**: Strict typing with proper inference

```typescript
import { create } from 'zustand'
import { devtools, persist, immer } from 'zustand/middleware'

const useMindMapStore = create<MindMapState>()(
  devtools(
    persist(
      immer((set, get) => ({
        maps: [],
        currentMap: null,
        isLoading: false,
        error: null,
        
        loadMaps: async () => {
          set({ isLoading: true, error: null })
          try {
            const maps = await mindmapAPI.getUserMaps()
            set({ maps, isLoading: false })
          } catch (error) {
            set({ error: error.message, isLoading: false })
          }
        },
        
        createMap: async (data) => {
          const newMap = await mindmapAPI.createMap(data)
          set((state) => {
            state.maps.push(newMap)
          })
          return newMap
        }
      })),
      {
        name: 'mindmap-storage',
        partialize: (state) => ({ currentMap: state.currentMap })
      }
    ),
    { name: 'MindMapStore' }
  )
)
```

## API Layer with TanStack Query

### Query Client Setup
```typescript
// services/api.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,  // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) return false
        return failureCount < 3
      }
    },
    mutations: {
      retry: false,
      onError: (error) => {
        // Global error handling
        console.error('Mutation error:', error)
      }
    }
  }
})
```

### API Service Layer
```typescript
// services/mindmap.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const useMindMaps = () => {
  return useQuery({
    queryKey: ['mindmaps'],
    queryFn: mindmapAPI.getUserMaps,
    staleTime: 1000 * 60 * 2 // 2 minutes
  })
}

export const useCreateMindMap = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: mindmapAPI.createMap,
    onSuccess: (newMap) => {
      // Optimistic update
      queryClient.setQueryData(['mindmaps'], (oldMaps) => 
        oldMaps ? [...oldMaps, newMap] : [newMap]
      )
    },
    onError: (error, variables, context) => {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['mindmaps'] })
    }
  })
}
```

## Tech Stack Decisions

### Framework & Build System
**Selected**: Expo SDK 53+ with Metro bundler
- Latest React Native (0.76+) support
- Improved web support with React Native Web 0.19+
- Better TypeScript integration
- Enhanced developer experience

### Navigation
**Selected**: Expo Router v4+
- File-based routing (Next.js style)
- Automatic deep linking
- Native navigation performance
- Type-safe routing parameters

### State Management
**Selected**: Zustand with middleware
- Lightweight (1KB) and performant
- Excellent TypeScript support
- Flexible middleware system (persist, devtools, immer)
- No context providers needed

### API Communication
**Selected**: TanStack Query (React Query) v5+
- Server state management
- Intelligent caching and synchronization
- Background refetching
- Optimistic updates

### Styling
**Selected**: NativeWind v4+
- TailwindCSS for React Native
- Platform-aware styling
- Hot reload support
- Consistent design system

### Visualization
**Selected**: Platform-adaptive approach
- **Web**: React Flow v12+ for advanced interactions
- **Mobile**: React Native Skia for high-performance graphics
- Unified data model and APIs

### Database & Storage
**Selected**: Expo SQLite with migrations
- Local database for offline support
- SQL queries with proper typing
- Automatic schema migrations
- Cross-platform compatibility

## Cross-Platform Development Strategy

### Code Sharing Strategy (95%+ shared)
- **Business Logic**: Zustand stores, custom hooks, utilities
- **API Layer**: TanStack Query, service functions
- **Components**: Platform-agnostic UI components
- **Navigation**: Expo Router (automatic platform adaptation)
- **Styling**: NativeWind (automatic platform adaptation)

### Platform-Specific Code (5%>)
```typescript
// Platform detection utilities
export const isWeb = Platform.OS === 'web'
export const isMobile = !isWeb
export const isIOS = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'

// Conditional rendering
{Platform.select({
  web: <WebComponent />,
  default: <MobileComponent />
})}

// Platform-specific hooks
export const usePlatformSpecificHook = () => {
  return useMemo(() => {
    if (isWeb) {
      return webImplementation
    }
    return mobileImplementation
  }, [])
}
```

### Asset Management
- Platform-specific assets in separate folders
- Responsive images with different resolutions
- Font loading with platform fallbacks
- Icon sets optimized per platform

## Performance Optimization

### Bundle Optimization
- Metro bundler with tree shaking
- Dynamic imports for route-based splitting
- Asset optimization with Expo's bundler
- Hermes engine for Android (automatic)

### Runtime Performance
- Zustand's efficient subscription model
- TanStack Query's intelligent caching
- React.memo and useMemo for expensive computations
- Virtual scrolling for large mind maps

### Platform-Specific Performance
- **Web**: Service worker caching, lazy loading
- **Mobile**: Native modules for heavy computations
- **Cross-platform**: Shared performance monitoring

## Progressive Web App (PWA)

Expo Router supports PWA features out of the box:
- Web app manifest generation
- Service worker for offline caching
- Install prompts
- Background sync capabilities

## Offline-First Architecture

### Local Database Strategy
```typescript
// SQLite schema with migrations
const migrations = [
  {
    up: `
      CREATE TABLE mindmaps (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced INTEGER DEFAULT 0
      );
      
      CREATE TABLE nodes (
        id TEXT PRIMARY KEY,
        mindmap_id TEXT,
        type TEXT,
        position_x REAL,
        position_y REAL,
        data TEXT,
        FOREIGN KEY (mindmap_id) REFERENCES mindmaps(id)
      );
    `
  }
]
```

### Sync Strategy
- **Online**: Real-time sync with conflict resolution
- **Offline**: Queue changes for later sync
- **Hybrid**: Background sync when connectivity returns
- **UI**: Sync status indicators and manual sync options

## Security Considerations

### Data Protection
- Expo Secure Store for sensitive data
- Encrypted SQLite database
- Secure API communication with HTTPS
- Token management with automatic refresh

### Platform Security
- Web: Content Security Policy
- Mobile: App Transport Security, certificate pinning
- Authentication: JWT with secure storage

## Deployment Strategy

### Development
- Expo Go for rapid testing
- Development builds with EAS
- Hot reload across platforms
- Debug builds with full tooling

### Staging
- Internal distribution with EAS
- Feature flags for gradual rollouts
- A/B testing capabilities
- Performance monitoring

### Production
- **Web**: Static export to CDN (Vercel, Netlify)
- **Mobile**: App Store / Play Store with EAS Submit
- **Updates**: OTA updates with EAS Update
- **Monitoring**: Sentry, analytics, crash reporting

## Migration Benefits

### From Traditional React Native + Web Approach
- **Unified Development**: Single codebase, single team
- **Faster Iteration**: Hot reload works everywhere
- **Consistent UX**: Same components, same behavior
- **Easier Maintenance**: No code duplication

### Developer Experience Improvements
- **TypeScript**: End-to-end type safety
- **Modern Tooling**: Metro bundler, Expo CLI
- **Rich Ecosystem**: 100+ Expo SDK modules
- **Future-Proof**: Automatic React Native updates

This architecture leverages Expo's latest capabilities to create a truly unified, performant, and maintainable cross-platform application with modern development practices and excellent user experience on all platforms.
