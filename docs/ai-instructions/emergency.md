# Emergency Procedures

## Quick Fixes

### Server Won't Start
```bash
pkill -f "npm run dev"
npm run dev:server
```

### Database Connection Issues
```bash
DATABASE_URL="..." npx drizzle-kit introspect
```

### Clean Install
```bash
rm -rf node_modules package-lock.json
npm install
```

## Production Debugging
1. Check network tab for API failures
2. Verify database connectivity
3. Check external API status (OSRS Wiki)
4. Review server logs

## Common Issues

### Badge leftIcon Warnings
Replace with Group wrapper:
```jsx
// Wrong
<Badge leftIcon={<IconCoin />}>Text</Badge>

// Right
<Group spacing={4}>
  <IconCoin size={14} />
  <Badge>Text</Badge>
</Group>
```

### CSRF Token Errors
Ensure frontend sends proper headers:
```javascript
headers: {
  'x-csrf-token': csrfToken,
  'Origin': 'http://localhost:8000'
}
```