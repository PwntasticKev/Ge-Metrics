# Quick Fix Reference

## 🔧 Common Issues & Solutions

### Trash Button Error: "userVotes.has is not a function"
**Fixed in:** `src/hooks/useTrashScoring.js`
**Issue:** Sets don't serialize through TRPC/JSON, become arrays
**Solution:** Convert array back to Set in frontend
```javascript
const votesSet = Array.isArray(trashData.userVotes) 
  ? new Set(trashData.userVotes)
  : trashData.userVotes
```

### Invalid Hook Call Error
**Fixed in:** `src/hooks/useTrashScoring.js`
**Issue:** Calling `trpc.useContext()` inside mutation callbacks
**Solution:** Call `useContext()` at the top level of the hook
```javascript
export function useTrashScoring() {
  const utils = trpc.useContext() // Call at top level
  
  const markAsTrash = trpc.trash.markItem.useMutation({
    onSuccess: () => {
      utils.trash.invalidate() // Use the pre-defined utils
    }
  })
}
```

### Admin Trash Management Access
**Fixed in:** `src/pages/Admin/index.jsx`
**Added:** Button to navigate to trash management
**URL:** `/admin/trash-management`

### Database Tables Not Showing in Postico2
**Issue:** Tables created in wrong database
**Solution:** 
1. Ensure connected to `auth_db` (not `kevinlee` or `postgres`)
2. Run: `psql -U postgres -d auth_db -f sync-to-auth-db.sql`
3. Refresh Postico2 (Cmd+R)

### Missing Tables in Local Database
**Solution:** Run the sync script
```bash
psql -U postgres -d auth_db -c "
CREATE TABLE IF NOT EXISTS user_trash_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, item_id)
);

CREATE TABLE IF NOT EXISTS item_admin_clean (
  item_id INTEGER PRIMARY KEY,
  cleaned_by INTEGER NOT NULL,
  cleaned_at TIMESTAMP DEFAULT NOW() NOT NULL
);
"
```

### Database Connection Issues
**Check:** Environment variables
```bash
NODE_ENV=development
LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auth_db"
```

### Server Not Connecting to Right Database
**Solution:** Restart servers
```bash
pkill -f "npm run dev"
npm run dev
```

## 📋 Verification Commands

```bash
# Check table count
psql -U postgres -d auth_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Should return: 44

# Check trash tables exist
psql -U postgres -d auth_db -c "SELECT * FROM user_trash_votes;"

# Check which database you're in
psql -U postgres -c "\l"

# Test trash vote insertion
psql -U postgres -d auth_db -c "INSERT INTO user_trash_votes (user_id, item_id, item_name) VALUES (1, 999, 'Test') ON CONFLICT DO NOTHING;"
```

## 🚀 Quick Start After Pull

1. Check environment variables are set
2. Start servers: `npm run dev`
3. Frontend: http://localhost:5173
4. Backend: http://localhost:4000
5. Admin panel: http://localhost:5173/admin
6. Trash management: http://localhost:5173/admin/trash-management