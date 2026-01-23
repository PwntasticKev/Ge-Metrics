# Development Patterns

## TRPC Usage
```javascript
// Query
const { data, isLoading, error } = trpc.items.getAllItems.useQuery()

// Mutation
const mutation = trpc.flips.addFlip.useMutation({
  onSuccess: () => utils.flips.invalidate()
})
```

## Mantine UI
- Use `Group` wrapper instead of deprecated `leftIcon` prop
- Always handle loading/error states
- Use `useForm` for form handling

## Error Handling
```javascript
// Frontend
if (isLoading) return <Loader />
if (error) return <Alert color="red">{error.message}</Alert>

// Backend
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'User-friendly message'
})
```

## Database Operations
- Use parameterized queries
- Always handle foreign key constraints
- Index frequently queried columns

## Form Validation
```javascript
const form = useForm({
  initialValues: { /* ... */ },
  validate: {
    email: (value) => !value.includes('@') ? 'Invalid email' : null
  }
})
```