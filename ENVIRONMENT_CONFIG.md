# Environment Configuration Guide

This project now supports both local development and VPS/production environments through a centralized configuration system.

## 🔧 How It Works

### Environment Detection
The system automatically detects the environment based on:
- **Local**: `localhost`, `127.0.0.1` in the URL
- **Production**: Any other domain

### API URL Configuration
- **Local Development**: Uses `http://localhost:3000/api`
- **VPS/Production**: Uses relative URLs `/api`

## 🚀 Quick Setup

### For Local Development
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Set these values in `.env.local`:
   ```bash
   API_BASE_URL=http://localhost:3000
   EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
   NODE_ENV=development
   ```

### For VPS/Production Deployment
1. Copy `.env.example` to `.env.production`:
   ```bash
   cp .env.example .env.production
   ```

2. Set these values in `.env.production`:
   ```bash
   # Use relative URLs for same-origin requests
   API_BASE_URL=
   EXPO_PUBLIC_API_BASE_URL=
   NODE_ENV=production
   
   # OR if you need to specify a domain:
   # API_BASE_URL=https://yourdomain.com
   # EXPO_PUBLIC_API_BASE_URL=https://yourdomain.com
   ```

## 📁 Updated Files

### New Configuration System
- `utils/config.ts` - Central configuration with environment detection
- `utils/apiClient.ts` - Type-safe API client with automatic URL handling
- `utils/api.ts` - Updated for backward compatibility

### Updated Services
- `services/userService.ts` - Now uses centralized API client
- `services/storeService.ts` - Now uses centralized API client

### Updated App Pages
- `app/(tabs)/index.tsx` - Main deals page
- `app/(tabs)/updeals.tsx` - User deals page
- `app/change-password.tsx` - Password change
- `app/add-user.tsx` - User creation
- `test-auth.html` - Test authentication page

## 🔨 Usage Examples

### Using the New API Client
```typescript
import { apiClient } from '@/utils/apiClient';

// GET request
const users = await apiClient.get<User[]>('/users');

// POST request
const newUser = await apiClient.post('/users', { name: 'John', email: 'john@example.com' });

// PUT request
const updatedUser = await apiClient.put(`/users/${id}`, { name: 'Jane' });

// DELETE request
await apiClient.delete(`/users/${id}`);
```

### Environment-Aware URL Building
```typescript
import { getApiUrl, config } from '@/utils/config';

// Automatically uses correct base URL
const apiUrl = getApiUrl('/users'); 
// Local: "http://localhost:3000/api/users"
// VPS: "/api/users"

// Check current environment
console.log('Environment:', config.ENVIRONMENT);
console.log('Is Local:', config.IS_LOCAL);
```

### Direct fetch (if needed)
```javascript
import { getApiUrl } from '@/utils/config';

const response = await fetch(getApiUrl('/deals'), {
  credentials: 'include'
});
```

## 🐛 Debugging

### Check Configuration
Add this to see current configuration:
```typescript
import { logConfig } from '@/utils/config';
logConfig(); // Logs current environment settings
```

### Common Issues
1. **CORS errors in development**: Make sure your server allows `http://localhost:3000`
2. **Production API calls failing**: Ensure your VPS serves the frontend from the same domain as the API
3. **Environment not detected correctly**: Check the hostname detection logic in `utils/config.ts`

## 🔄 Migration Notes

### Replaced Hardcoded URLs
All instances of `http://localhost:3000/api` have been replaced with the new configuration system.

### Backward Compatibility
The old `utils/api.ts` exports are still available for existing code:
- `getApiBaseUrl()`
- `apiUrl(path)`
- `assetUrl(filename)`

### Server Configuration
No changes needed to your server code. The server continues to serve the API at `/api/*` endpoints.

## 🌍 Deployment Checklist

### Before Deploying to VPS
- [ ] Copy and configure `.env.production`
- [ ] Set `NODE_ENV=production`
- [ ] Use relative URLs or your domain
- [ ] Test API calls work with the production configuration
- [ ] Ensure CORS is configured correctly on your server
- [ ] Verify assets and static files are served correctly

### Server Requirements
Your VPS server should:
1. Serve your React Native web build from the same domain as the API
2. Have API endpoints available at `/api/*`
3. Handle CORS properly for cross-origin requests (if needed)
4. Serve static assets (images, etc.) correctly

## 📱 Testing

### Local Testing
```bash
# Start your development server
npm start

# Test API calls
curl http://localhost:3000/api/health
```

### Production Testing
```bash
# Test your VPS API
curl https://yourdomain.com/api/health

# Check if frontend can reach API
# Open browser dev tools and check network requests
```
