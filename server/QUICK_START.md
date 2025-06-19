# 🚀 Quick Start Authentication System

## ✅ Working Authentication Server

I've created a complete authentication system for you! Here's everything you need to know:

## 🔑 Master Login Credentials

**Email:** `admin@test.com`  
**Password:** `admin123`

## 🏃‍♂️ How to Run

### Option 1: Ultra Simple Server (Recommended for Testing)
```bash
cd server
node ultra-simple-auth.mjs
```

This server:
- ✅ Uses only Node.js built-ins (no dependencies needed)
- ✅ Works immediately without database setup
- ✅ Includes CORS for your React app
- ✅ Has in-memory storage with the master user

### Option 2: Full tRPC Server (For Production)
```bash
cd server
npm install  # Install dependencies
npm run dev  # Start with TypeScript/tRPC
```

## 📡 API Endpoints

The server runs on `http://localhost:4000`

### Health Check
```bash
curl http://localhost:4000/health
```

### Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

### Register New User
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

### Get Current User (requires token)
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Logout
```bash
curl -X POST http://localhost:4000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_TOKEN_HERE"}'
```

## 🎯 Frontend Integration

### 1. Install Dependencies (in your main React app)
```bash
npm install @tanstack/react-query
```

### 2. Simple Fetch Example
```javascript
// Login function
async function login(email, password) {
  const response = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store token
    localStorage.setItem('accessToken', data.accessToken);
    return data.user;
  } else {
    throw new Error(data.error);
  }
}

// Usage
login('admin@test.com', 'admin123')
  .then(user => console.log('Logged in:', user))
  .catch(error => console.error('Login failed:', error));
```

### 3. React Hook Example
```javascript
import { useState } from 'react';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        setUser(data.user);
        return data.user;
      } else {
        throw new Error(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return { user, login, logout, loading };
}
```

## 🔐 Security Features

### Current Implementation
- ✅ CORS protection
- ✅ JWT-like token system
- ✅ Session management
- ✅ Input validation
- ✅ Error handling

### Production Enhancements (in full tRPC version)
- 🔒 bcrypt password hashing
- 🔒 JWT with proper expiration
- 🔒 Refresh token rotation
- 🔒 Rate limiting
- 🔒 CSRF protection
- 🔒 Database persistence

## 🧪 Testing the System

### 1. Start the Server
```bash
cd server
node ultra-simple-auth.mjs
```

### 2. Test Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

You should get a response like:
```json
{
  "user": {
    "id": "master-user-id",
    "email": "admin@test.com", 
    "name": "Admin User"
  },
  "accessToken": "abc123...",
  "refreshToken": "abc123..."
}
```

### 3. Test Protected Route
Use the token from step 2:
```bash
curl -X GET http://localhost:4000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_FROM_STEP_2"
```

## 🎨 Frontend Components

I've created React components for you in the `src/` directory:

- `src/components/auth/LoginForm.jsx` - Login form
- `src/components/auth/RegisterForm.jsx` - Registration form  
- `src/components/auth/AuthProvider.jsx` - Auth context provider
- `src/hooks/useAuth.js` - Authentication hooks

## 🚧 Next Steps

1. **Start the server:** `node ultra-simple-auth.mjs`
2. **Test with curl** using the examples above
3. **Integrate with your React app** using the provided components
4. **Upgrade to full tRPC server** when ready for production

## 🆘 Troubleshooting

### Server won't start
- Make sure you're in the `server/` directory
- Check if port 4000 is available
- Try: `lsof -ti:4000 | xargs kill` to free the port

### CORS errors
- Make sure your React app is running on `http://localhost:5173`
- The server is configured for this URL

### Login not working
- Use exact credentials: `admin@test.com` / `admin123`
- Check Content-Type header is set
- Verify JSON format

## 📞 Master Credentials Reminder

**Email:** `admin@test.com`  
**Password:** `admin123`

**Ready to go! 🎉** 