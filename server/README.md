# Authentication Server

A complete, production-ready authentication system built with tRPC, Drizzle ORM, and PostgreSQL.

## Features

- 🔐 **Secure Authentication**: Salt + hash passwords with bcrypt
- 🎫 **JWT Tokens**: Short-lived access tokens + long-lived refresh tokens
- 🔄 **Token Rotation**: Automatic refresh token rotation
- 🌐 **Google OAuth**: Complete Google OAuth 2.0 integration
- 🛡️ **Security**: CSRF protection, rate limiting, HTTP-only cookies
- 📊 **Type Safety**: Full TypeScript support with tRPC
- 🗄️ **Database**: PostgreSQL with Drizzle ORM
- ⚡ **Performance**: React Query for efficient data fetching

## Tech Stack

- **Backend**: Node.js, Express, tRPC
- **Database**: PostgreSQL, Drizzle ORM
- **Authentication**: JWT, bcrypt, Google OAuth 2.0
- **Security**: Helmet, CORS, CSRF protection
- **Frontend**: React, React Query, tRPC client

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials

### 2. Server Setup

```bash
cd server
npm install
```

### 3. Environment Configuration

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/auth_db"

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET="your-super-secret-access-token-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key-change-this-in-production"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Server Configuration
PORT=4000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

### 4. Database Setup

Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

**Important**: If you encounter database table errors (like missing `recipes` tables), you may need to manually apply migrations:

```bash
# For local development
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -f src/db/migrations/0012_add_custom_recipes_tables.sql

# Check if tables exist
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -c "\dt" | grep -i recipe
```

### 5. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

### 6. Frontend Integration

In your React app, install dependencies:

```bash
npm install @trpc/client @trpc/react-query @tanstack/react-query
```

## API Endpoints

### Authentication Routes

All routes are prefixed with `/trpc/auth.`

#### `register`
- **Type**: Mutation
- **Input**: `{ email: string, password: string, name: string }`
- **Output**: `{ user, accessToken, refreshToken }`

#### `login`
- **Type**: Mutation  
- **Input**: `{ email: string, password: string }`
- **Output**: `{ user, accessToken, refreshToken }`

#### `refresh`
- **Type**: Mutation
- **Input**: `{ refreshToken: string }`
- **Output**: `{ user, accessToken, refreshToken }`

#### `logout`
- **Type**: Mutation
- **Input**: `{ refreshToken: string }`
- **Output**: `{ success: boolean }`

#### `googleIdToken`
- **Type**: Mutation
- **Input**: `{ idToken: string }`
- **Output**: `{ user, accessToken, refreshToken }`

#### `me`
- **Type**: Query
- **Headers**: `Authorization: Bearer <accessToken>`
- **Output**: `{ id, email, name, avatar, createdAt }`

### Utility Endpoints

#### `GET /health`
Health check endpoint

#### `GET /csrf-token`
Get CSRF token for frontend

#### `POST /auth/set-tokens`
Set HTTP-only cookies (for enhanced security)

#### `POST /auth/clear-tokens`
Clear authentication cookies

## Security Features

### Password Security
- Passwords hashed with bcrypt (12 rounds)
- Individual salts per user
- Minimum 8 character requirement

### JWT Security
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Token rotation on refresh
- Secure token storage in database

### HTTP Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 requests per 15 minutes)
- CSRF protection on state-changing operations

### Database Security
- Parameterized queries (SQL injection protection)
- Indexed email lookups
- Cascade delete for cleanup

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret to `.env`

### Frontend Google Integration

Example using Google's JavaScript SDK:

```javascript
import { useGoogleLogin } from './hooks/useAuth';

const googleLogin = useGoogleLogin();

// Option 1: ID Token (recommended)
const handleGoogleLogin = async () => {
  const idToken = await getGoogleIdToken();
  googleLogin.mutate({ idToken });
};

// Option 2: Authorization Code
const handleGoogleCallback = async (code) => {
  googleLogin.mutate({ 
    code, 
    redirectUri: 'http://localhost:5173/auth/callback' 
  });
};
```

## Frontend Usage

### 1. Setup Auth Provider

```jsx
import AuthProvider from './components/auth/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <YourApp />
    </AuthProvider>
  );
}
```

### 2. Use Authentication Hooks

```jsx
import { useAuth } from './hooks/useAuth';

function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}
```

### 3. Login/Register Forms

```jsx
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

function AuthPage() {
  return (
    <div>
      <LoginForm />
      <RegisterForm />
    </div>
  );
}
```

## Error Handling

The system provides comprehensive error handling:

- **409 Conflict**: Email already exists
- **401 Unauthorized**: Invalid credentials or expired tokens
- **400 Bad Request**: Invalid input data
- **429 Too Many Requests**: Rate limit exceeded
- **403 Forbidden**: CSRF token missing/invalid

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  salt TEXT,
  google_id TEXT,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

### Refresh Tokens Table
```sql
refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)
```

## Production Deployment

### Environment Variables
- Use strong, unique JWT secrets (32+ characters)
- Set `NODE_ENV=production`
- Use HTTPS in production
- Configure proper CORS origins

### Database
- Use connection pooling
- Set up database backups
- Monitor query performance

### Security
- Enable HTTPS
- Use secure cookie settings
- Implement proper logging
- Set up monitoring

## Database Maintenance

### Migration Management

Keep local and production databases in sync:

```bash
# Check table differences between environments
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -c "\dt" | sort
PGPASSWORD="production_password" psql -h production_host -U production_user -d production_db -c "\dt" | sort

# Apply specific migration to local database
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -f src/db/migrations/XXXX_migration_name.sql

# Verify schema consistency
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -c "\d table_name"
```

### Common Database Tasks

```bash
# Check recipes system tables
PGPASSWORD="postgres" psql -h localhost -p 5432 -U postgres -d auth_db -c "SELECT COUNT(*) FROM recipes; SELECT COUNT(*) FROM recipe_ingredients;"

# Reset local database (destructive!)
dropdb auth_db && createdb auth_db
npm run db:push

# Backup production data
pg_dump -h production_host -U production_user production_db > backup.sql
```

### Troubleshooting

**Missing Tables Error**: If you see "table does not exist" errors:
1. Check if tables exist: `\dt` in psql
2. Apply missing migrations manually
3. Verify schema matches production

**Migration Conflicts**: When drizzle migrations fail:
1. Check migration files in `src/db/migrations/`
2. Apply migrations manually with psql
3. Update migration tracking if needed

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes
- `npm run db:migrate` - Run migrations

### Project Structure

```
server/
├── src/
│   ├── config/           # Configuration and environment
│   ├── db/              # Database schema and migrations
│   ├── middleware/      # Express middleware
│   ├── trpc/           # tRPC routers and procedures
│   ├── utils/          # Utility functions
│   └── index.ts        # Server entry point
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## License

MIT License - see LICENSE file for details 