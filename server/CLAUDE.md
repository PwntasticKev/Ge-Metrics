

## 🔗 Database Sync Hook

**Auto-Sync Local/Production Schemas**
```bash
# Run before any deployment or major feature work
.claude/hooks/pre-deployment-db-check.sh
```

**Features:**
- ✅ Compares local vs production table counts
- ✅ Validates critical tables exist (`users`, `user_sessions`, `user_trash_votes`, `item_admin_clean`)
- ✅ Shows missing/extra tables between environments  
- ✅ Prevents deployment with broken schemas
- ✅ Provides fix suggestions

**Integration:** Add to pre-commit hooks:
```bash
echo ".claude/hooks/pre-deployment-db-check.sh" >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Manual Sync:** Use the schema sync tool:
```bash
node scripts/sync-database-schema.js
```

