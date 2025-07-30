import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Chip, 
  TextField, 
  MenuItem, 
  Select, 
  FormControl, 
  InputLabel,
  IconButton,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material'
import { 
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { format } from 'date-fns'

const GameUpdates = () => {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [limit, setLimit] = useState(20)
  const [scraping, setScraping] = useState(false)
  const [updateTypes, setUpdateTypes] = useState([])

  const fetchUpdateTypes = async () => {
    try {
      const response = await fetch('/api/game-updates/types')
      const data = await response.json()
      if (data.success) {
        setUpdateTypes(data.data)
      }
    } catch (err) {
      console.error('Error fetching update types:', err)
    }
  }

  const fetchUpdates = async (type = 'all', itemLimit = 20) => {
    setLoading(true)
    setError('')
    
    try {
      const url = type === 'all' 
        ? `/api/game-updates?limit=${itemLimit}`
        : `/api/game-updates/type/${type}?limit=${itemLimit}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setUpdates(data.data)
      } else {
        setError(data.error || 'Failed to fetch updates')
      }
    } catch (err) {
      console.error('Error fetching updates:', err)
      setError('Failed to fetch updates')
    } finally {
      setLoading(false)
    }
  }

  const triggerScraping = async () => {
    setScraping(true)
    try {
      const response = await fetch('/api/game-updates/scrape', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        // Refresh updates after a short delay to allow scraping to complete
        setTimeout(() => {
          fetchUpdates(selectedType, limit)
        }, 3000)
      } else {
        setError(data.error || 'Failed to trigger scraping')
      }
    } catch (err) {
      console.error('Error triggering scraping:', err)
      setError('Failed to trigger scraping')
    } finally {
      setScraping(false)
    }
  }

  useEffect(() => {
    fetchUpdateTypes()
    fetchUpdates()
  }, [])

  const handleTypeChange = (event) => {
    const newType = event.target.value
    setSelectedType(newType)
    fetchUpdates(newType, limit)
  }

  const handleLimitChange = (event) => {
    const newLimit = parseInt(event.target.value)
    setLimit(newLimit)
    fetchUpdates(selectedType, newLimit)
  }

  const getTypeColor = (type) => {
    const typeObj = updateTypes.find(t => t.value === type)
    return typeObj ? typeObj.color : '#9E9E9E'
  }

  const getTypeLabel = (type) => {
    const typeObj = updateTypes.find(t => t.value === type)
    return typeObj ? typeObj.label : type
  }

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  if (loading && updates.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          RuneScape Game Updates
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Latest game updates scraped from the official RuneScape wiki
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Update Type</InputLabel>
            <Select
              value={selectedType}
              onChange={handleTypeChange}
              label="Update Type"
            >
              <MenuItem value="all">All Types</MenuItem>
              {updateTypes.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  <Box display="flex" alignItems="center">
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        backgroundColor: type.color,
                        borderRadius: '50%',
                        mr: 1
                      }}
                    />
                    {type.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <TextField
            select
            fullWidth
            label="Limit"
            value={limit}
            onChange={handleLimitChange}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchUpdates(selectedType, limit)}
            disabled={loading}
            fullWidth
          >
            Refresh
          </Button>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Button
            variant="contained"
            startIcon={<FilterIcon />}
            onClick={triggerScraping}
            disabled={scraping}
            fullWidth
          >
            {scraping ? 'Scraping...' : 'Trigger Scraping'}
          </Button>
        </Grid>
      </Grid>

      {/* Updates Grid */}
      <Grid container spacing={3}>
        {updates.map((update, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                    {update.title}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                    <Chip
                      label={getTypeLabel(update.type)}
                      size="small"
                      sx={{ 
                        backgroundColor: getTypeColor(update.type),
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(update.date)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {update.content ? (
                    update.content.length > 200 
                      ? `${update.content.substring(0, 200)}...`
                      : update.content
                  ) : (
                    'No content available'
                  )}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Scraped: {formatDate(update.scraped_at)}
                  </Typography>
                </Box>
              </CardContent>

              <CardActions>
                <Button
                  size="small"
                  startIcon={<OpenInNewIcon />}
                  href={update.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  disabled={!update.link}
                >
                  View Original
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {updates.length === 0 && !loading && (
        <Box textAlign="center" sx={{ mt: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No updates found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try triggering a scraping operation to fetch the latest updates
          </Typography>
        </Box>
      )}

      {updates.length > 0 && (
        <Box textAlign="center" sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {updates.length} of the latest game updates
          </Typography>
        </Box>
      )}
    </Container>
  )
}

export default GameUpdates
