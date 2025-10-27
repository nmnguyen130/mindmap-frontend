# Frontend: Mind Mapping App

This directory contains the Expo-based application for the Mind Mapping App, supporting both web and mobile platforms. It provides the user interface for creating, editing, and sharing AI-powered mind maps.

## Tech Stack

- **Framework**: React Native with Expo (v53+)
- **Web Support**: React Native Web
- **Navigation**: Expo Router (v4+)
- **State Management**: Zustand
- **Visualization**: React Flow (web) / React Native Skia (mobile)
- **Styling**: NativeWind (TailwindCSS for React Native)
- **API Communication**: TanStack Query (React Query)
- **Database**: Expo SQLite for local storage
- **Authentication**: Expo Auth Session

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Expo modules:
   ```bash
   npx expo install expo-router zustand @tanstack/react-query nativewind react-native-reanimated react-native-gesture-handler
   ```

4. Install web dependencies:
   ```bash
   npx expo install react-dom react-native-web @expo/metro-runtime
   ```

5. Configure environment variables in `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
   EXPO_PUBLIC_AI_API_KEY=your_openai_api_key
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

Start the development server:
```bash
npx expo start
```

This will open the Expo DevTools. You can then:
- Press `w` to open in web browser
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on physical device

### Build for Production

Build for web:
```bash
npx expo export --platform web
```

Build for mobile:
```bash
eas build --platform ios
eas build --platform android
```

### Testing

Run unit tests:
```bash
npm run test
```

Run E2E tests:
```bash
npm run test:e2e
```

## Project Structure

```
frontend/
├── app/                     # Expo Router app directory (file-based routing)
│   ├── _layout.tsx         # Root layout with navigation container
│   ├── (auth)/             # Authentication routes group
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/             # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx       # Dashboard/home
│   │   ├── explore.tsx     # Public mind maps
│   │   └── profile.tsx     # User profile
│   └── mindmap/
│       ├── [id].tsx        # Dynamic mind map editor
│       └── create.tsx      # Create new mind map
├── components/             # Reusable components
│   ├── common/             # Platform-agnostic components
│   ├── web/                # Web-only components (React Flow, etc.)
│   ├── mobile/             # Mobile-only components (Skia, gestures)
│   └── ui/                 # UI components (buttons, inputs, etc.)
├── stores/                 # Zustand stores
│   ├── auth.ts             # Authentication state
│   ├── mindmaps.ts         # Mind map data and actions
│   ├── ui.ts               # UI state (theme, modals, etc.)
│   └── index.ts            # Store exports
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts
│   ├── useMindMap.ts
│   └── usePlatform.ts      # Platform detection hooks
├── services/               # API services and utilities
│   ├── api.ts              # TanStack Query client setup
│   ├── auth.ts             # Authentication API calls
│   ├── mindmap.ts          # Mind map API calls
│   └── database.ts         # Expo SQLite operations
├── types/                  # TypeScript type definitions
│   ├── auth.ts
│   ├── mindmap.ts
│   └── api.ts
├── utils/                  # Utility functions
│   ├── platform.ts         # Platform-specific utilities
│   ├── validation.ts       # Form validation helpers
│   └── constants.ts        # App constants
├── assets/                 # Static assets
│   ├── images/
│   ├── fonts/
│   └── icons/
├── app.json                # Expo app configuration
├── metro.config.js         # Metro bundler configuration
├── tailwind.config.js      # NativeWind configuration
└── README.md
```

## Key Features

### Cross-Platform Mind Map Editor
- **Web**: React Flow with advanced interactions, keyboard shortcuts
- **Mobile**: React Native Skia with gesture-based editing, native performance
- Unified data model and API across platforms
- Real-time collaborative editing support

### State Management with Zustand
- Lightweight and performant state management
- TypeScript-first with excellent inference
- Built-in persistence with Zustand middleware
- DevTools integration for debugging

### Modern API Layer
- TanStack Query for server state management
- Automatic caching, background refetching
- Optimistic updates for better UX
- Request/response interceptors

### Platform-Specific Optimizations
- **Web**: Full React Flow integration, PWA capabilities
- **Mobile**: Native gestures, offline-first with SQLite
- Shared business logic with platform-specific UI

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow Expo and React Native best practices
- Use Expo Router for navigation
- Maintain consistent file naming

### State Management
- Use Zustand stores for global state
- Keep component state local when possible
- Use TanStack Query for server state
- Implement proper loading and error states

### Platform-Specific Code
- Use `Platform.OS` for runtime detection
- Web-specific code in `components/web/`
- Mobile-specific code in `components/mobile/`
- Shared code in `components/common/`

### File-Based Routing
- All routes defined in `app/` directory
- Use dynamic routes with `[param]` syntax
- Group related routes with `(group)` folders
- Layout files for shared UI structure

### Styling with NativeWind
- Utility-first approach like TailwindCSS
- Platform-aware styles automatically
- Custom design tokens in `tailwind.config.js`
- Responsive design utilities

### Database & Storage
- Expo SQLite for local data persistence
- File system operations with Expo File System
- Secure storage with Expo Secure Store
- Sync mechanisms for offline/online modes

## Testing Strategy

### Unit Tests
- Component logic with React Testing Library
- Zustand store actions and selectors
- Utility functions and hooks
- Platform-specific logic mocking

### Integration Tests
- Navigation flows with Expo Router
- API integration with TanStack Query
- Database operations
- Cross-platform component behavior

### E2E Tests
- Critical user journeys
- Platform-specific interactions
- Authentication flows
- Offline functionality

## Deployment

### Web Deployment
- Export static files: `npx expo export --platform web`
- Deploy to Vercel, Netlify, or any static hosting
- Configure CDN for assets
- Set up PWA service worker

### Mobile Deployment
- Build with EAS: `eas build --platform ios/android`
- TestFlight/App Store for iOS
- Internal/Play Store for Android
- OTA updates with EAS Update

### Environment Management
- Use `EXPO_PUBLIC_` prefixed variables
- Separate configs for development/staging/production
- Secure API keys with EAS Secrets

## Performance Considerations

### Bundle Optimization
- Tree shaking with Metro bundler
- Dynamic imports for code splitting
- Image optimization and lazy loading
- Minimize bridge communication on mobile

### Runtime Performance
- Zustand for efficient state updates
- TanStack Query for smart caching
- Virtual scrolling for large mind maps
- Platform-specific performance monitoring

### Memory Management
- Proper cleanup of subscriptions
- Efficient re-renders with React.memo
- SQLite connection pooling
- Asset preloading strategies

## Contributing

1. Test changes on both web and mobile platforms
2. Follow the established patterns for state management
3. Use TypeScript strictly and add proper types
4. Update documentation for new features
5. Write tests for critical functionality

## Troubleshooting

### Common Issues

**Metro bundler issues**
- Clear cache: `npx expo start --clear`
- Reset Metro: `npx expo start --reset-cache`

**Platform-specific issues**
- Check Platform.OS usage
- Verify platform-specific dependencies
- Test on real devices/simulators

**State management issues**
- Use Zustand devtools for debugging
- Check store subscriptions
- Verify state persistence

**Styling issues**
- Ensure NativeWind is properly configured
- Check platform-specific style overrides
- Verify TailwindCSS class names

For more help, check the main project documentation or create an issue.
