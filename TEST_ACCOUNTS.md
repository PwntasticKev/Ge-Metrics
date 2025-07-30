# Test Accounts for Ge-Metrics OSRS Grand Exchange Application

## 🔐 Password Validation Requirements

All test account passwords must meet these sanitization requirements:

- **Minimum length:** 8 characters
- **Maximum length:** 128 characters  
- **Must contain:** Uppercase letter (A-Z)
- **Must contain:** Lowercase letter (a-z)
- **Must contain:** Number (0-9)
- **Optional:** Special character (!@#$%^&*(),.?":{}|<>)

## 🚀 Compliant Test Accounts

### 1. **Primary Admin Account** ✅
```
Email: admin@test.com
Username: admin
Password: Admin123!
Role: Admin (Full permissions)
Subscription: Premium
User ID: 2
```

### 2. **Demo User Account** ✅
```
Email: demo@example.com
Username: demo_user
Password: Demo123!
Name: Demo User
Role: User
Subscription: Free
```

### 3. **Master User Account** ✅
```
Email: admin@example.com
Username: master_admin
Password: Master123!
Name: Admin User
Role: Admin
Subscription: Premium
```

### 4. **Test User Account** ✅
```
Email: test@example.com
Username: testuser
Password: Test123!
Name: Test User
Role: User
Subscription: Free
```

### 5. **Development Admin Account** ✅
```
Email: dev@ge-metrics.com
Username: dev_admin
Password: Dev123!
Name: Development Admin
Role: Admin
Subscription: Premium
```

## 🛡️ Security Features

### Input Sanitization
- ✅ **Email validation:** Proper email format
- ✅ **Username validation:** 3-20 characters, alphanumeric + underscore/dash
- ✅ **Password validation:** Meets all complexity requirements
- ✅ **XSS prevention:** Script tags and HTML removed
- ✅ **SQL injection prevention:** Malicious patterns blocked

### Authentication Bypass Methods

#### Method 1: Test Helper Function
```javascript
import authService from './services/authService.js'

// Automatically logs in with admin credentials
await authService.loginWithTestAccount()
```

#### Method 2: Direct Login
```javascript
// Login with admin credentials
await authService.login('admin@test.com', 'Admin123!')

// Login with demo credentials  
await authService.login('demo@example.com', 'Demo123!')
```

#### Method 3: Environment Variables
```bash
# Set in .env file
ADMIN_EMAIL=admin@test.com
ADMIN_PASSWORD=Admin123!
DEMO_USER_EMAIL=demo@example.com
DEMO_PASSWORD=Demo123!
```

## 🔧 Quick Setup Commands

### Create Admin User
```bash
cd server
npx tsx create-admin-user.ts
```

### Test Authentication
```bash
# Test admin login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@test.com","password":"Admin123!"}'
```

### Environment Setup
```bash
# Copy environment template
cp environment.example .env.local

# Edit with test credentials
nano .env.local
```

## ⚠️ Security Notes

1. **Development Only:** These accounts are for testing/development
2. **Change in Production:** Use strong, unique passwords in production
3. **Environment Variables:** Store sensitive data in environment variables
4. **Regular Rotation:** Change test passwords periodically
5. **Access Control:** Admin accounts have full system access

## 🧪 Testing Validation

All passwords pass the `securityService.validatePassword()` check:

```javascript
// Test password validation
const securityService = new SecurityService()

// ✅ All test passwords pass validation
console.log(securityService.validateInput('Admin123!', 'password').valid) // true
console.log(securityService.validateInput('Demo123!', 'password').valid)   // true
console.log(securityService.validateInput('Test123!', 'password').valid)   // true
```

## 📊 Account Status

| Account | Email | Password | Role | Subscription | Status |
|---------|-------|----------|------|--------------|--------|
| Admin | admin@test.com | Admin123! | Admin | Premium | ✅ Active |
| Demo | demo@example.com | Demo123! | User | Free | ✅ Active |
| Master | admin@example.com | Master123! | Admin | Premium | ✅ Active |
| Test | test@example.com | Test123! | User | Free | ✅ Active |
| Dev | dev@ge-metrics.com | Dev123! | Admin | Premium | ✅ Active | 