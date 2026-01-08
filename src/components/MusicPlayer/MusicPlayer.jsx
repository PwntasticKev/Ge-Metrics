import React, { useEffect } from 'react'
import { Box, createStyles } from '@mantine/core'
import { useMusicPlayer } from '../../contexts/MusicPlayerContext'
import { MiniPlayer } from './MiniPlayer'
import { ExtendedPlayer } from './ExtendedPlayer'
import { useMediaQuery } from '@mantine/hooks'

const useStyles = createStyles((theme, { isExtended, sidebarWidth }) => ({
  musicPlayerContainer: {
    width: '100%',
    transition: 'all 0.3s ease',
    overflow: 'hidden',
    backgroundColor: 'transparent',
    
    // Responsive height based on mode
    height: isExtended ? 300 : 70,
    maxHeight: isExtended ? 300 : 70,
    minHeight: isExtended ? 300 : 70,
    
    // Ensure proper spacing from bottom
    marginBottom: theme.spacing.xs,
    
    // Mobile: completely hide the player
    [theme.fn.smallerThan('sm')]: {
      display: 'none'
    },
    
    // Handle different sidebar widths
    ...(sidebarWidth === 80 && {
      // Force mini mode when sidebar is collapsed
      height: 70,
      maxHeight: 70,
      minHeight: 70
    })
  },

  playerWrapper: {
    height: '100%',
    width: '100%',
    position: 'relative',
    overflow: 'hidden'
  }
}))

export function MusicPlayer({ sidebarWidth = 240 }) {
  const {
    isVisible,
    isExtended,
    setExtended,
    getCurrentTrackData,
    PLAYER_STATES
  } = useMusicPlayer()

  const { classes } = useStyles({ 
    isExtended: isExtended && sidebarWidth > 80, 
    sidebarWidth 
  })

  const isMobile = useMediaQuery('(max-width: 768px)')
  const currentTrack = getCurrentTrackData()

  // Force mini mode when sidebar is collapsed
  useEffect(() => {
    if (sidebarWidth <= 80 && isExtended) {
      setExtended(false)
    }
  }, [sidebarWidth, isExtended, setExtended])

  // Don't render on mobile or if not visible
  if (isMobile || !isVisible) {
    return null
  }

  return (
    <Box className={classes.musicPlayerContainer}>
      <Box className={classes.playerWrapper}>
        {isExtended && sidebarWidth > 80 ? (
          <ExtendedPlayer />
        ) : (
          <MiniPlayer />
        )}
      </Box>
    </Box>
  )
}

// Separate component for handling global keyboard shortcuts
export function MusicPlayerKeyboardHandler() {
  const {
    isVisible,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setVolume,
    volume,
    getCurrentTrackData
  } = useMusicPlayer()

  const currentTrack = getCurrentTrackData()

  useEffect(() => {
    // Only handle keyboard shortcuts when player is visible and has a track
    if (!isVisible || !currentTrack) return

    const handleKeyDown = (event) => {
      // Don't interfere if user is typing in inputs
      if (event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA' || 
          event.target.contentEditable === 'true') {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          togglePlayPause()
          break
        
        case 'ArrowRight':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            nextTrack()
          }
          break
        
        case 'ArrowLeft':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            previousTrack()
          }
          break
        
        case 'ArrowUp':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            const newVolume = Math.min(1, volume + 0.1)
            setVolume(newVolume)
          }
          break
        
        case 'ArrowDown':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            const newVolume = Math.max(0, volume - 0.1)
            setVolume(newVolume)
          }
          break
        
        case 'KeyM':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            setVolume(volume > 0 ? 0 : 0.7)
          }
          break
        
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, currentTrack, togglePlayPause, nextTrack, previousTrack, setVolume, volume])

  return null // This component only handles keyboard events
}