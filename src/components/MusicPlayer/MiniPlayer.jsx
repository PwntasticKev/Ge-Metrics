import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  createStyles,
  keyframes,
  Select,
  useMantineTheme
} from '@mantine/core'
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconChevronUp,
  IconMusic
} from '@tabler/icons-react'
import { useMusicPlayer } from '../../contexts/MusicPlayerContext'
import { getAllPlaylists } from '../../data/playlists'

const marqueeScroll = keyframes`
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
`

const useStyles = createStyles((theme) => ({
  miniPlayer: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
    borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    padding: theme.spacing.xs,
    borderRadius: `${theme.radius.sm}px ${theme.radius.sm}px 0 0`,
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2],
      boxShadow: '0 -2px 8px rgba(102, 126, 234, 0.1)'
    }
  },

  trackInfo: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    position: 'relative',
    height: 24
  },

  trackTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
    lineHeight: '16px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },

  trackTitleScrolling: {
    animation: `${marqueeScroll} linear infinite`
  },

  trackArtist: {
    fontSize: theme.fontSizes.xs,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6],
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '14px',
    marginTop: 2
  },

  controls: {
    gap: 4
  },

  controlButton: {
    width: 28,
    height: 28,
    minWidth: 28,
    transition: 'all 0.2s ease',
    
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.blue[9] 
        : theme.colors.blue[1]
    }
  },

  playButton: {
    backgroundColor: theme.colorScheme === 'dark' 
      ? theme.colors.blue[7] 
      : theme.colors.blue[6],
    color: theme.white,
    
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.blue[6] 
        : theme.colors.blue[7],
      transform: 'scale(1.1)'
    }
  },

  playlistSelect: {
    minWidth: 120,
    
    '& .mantine-Select-input': {
      fontSize: theme.fontSizes.xs,
      height: 28,
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[6] 
        : theme.colors.gray[0],
      border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      
      '&:focus': {
        borderColor: theme.colors.blue[6]
      }
    }
  },

  expandButton: {
    width: 28,
    height: 28,
    minWidth: 28,
    transition: 'all 0.2s ease',
    
    '&:hover': {
      transform: 'scale(1.1) rotate(180deg)',
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[5] 
        : theme.colors.gray[2]
    }
  }
}))

export function MiniPlayer() {
  const { classes } = useStyles()
  const theme = useMantineTheme()
  const {
    playerState,
    currentPlaylist,
    getCurrentTrackData,
    getCurrentPlaylistData,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setPlaylist,
    toggleExtended,
    error,
    clearError,
    PLAYER_STATES
  } = useMusicPlayer()

  const [shouldScroll, setShouldScroll] = useState(false)
  const [animationDuration, setAnimationDuration] = useState('10s')
  const titleRef = useRef(null)
  const containerRef = useRef(null)

  const currentTrack = getCurrentTrackData()
  const currentPlaylistData = getCurrentPlaylistData()
  const playlists = getAllPlaylists()

  // Check if title should scroll based on content width
  useEffect(() => {
    if (titleRef.current && containerRef.current) {
      const titleWidth = titleRef.current.scrollWidth
      const containerWidth = containerRef.current.offsetWidth
      const needsScroll = titleWidth > containerWidth
      
      setShouldScroll(needsScroll)
      
      if (needsScroll) {
        // Calculate animation duration based on text length for consistent reading speed
        const scrollDistance = titleWidth + containerWidth
        const pixelsPerSecond = 30 // Adjust for comfortable reading speed
        const duration = scrollDistance / pixelsPerSecond
        setAnimationDuration(`${Math.max(3, duration)}s`)
      }
    }
  }, [currentTrack?.title])

  const playlistOptions = playlists.map(playlist => ({
    value: playlist.id,
    label: playlist.name
  }))

  const handlePlaylistChange = (playlistId) => {
    if (playlistId && playlistId !== currentPlaylist) {
      setPlaylist(playlistId)
    }
  }

  const isPlaying = playerState === PLAYER_STATES.PLAYING
  const isLoading = playerState === PLAYER_STATES.LOADING

  return (
    <Box className={classes.miniPlayer}>
      <Group position="apart" spacing="xs" noWrap>
        {/* Track Info */}
        <Box className={classes.trackInfo} ref={containerRef}>
          {currentTrack ? (
            <>
              <Text
                ref={titleRef}
                className={`${classes.trackTitle} ${shouldScroll ? classes.trackTitleScrolling : ''}`}
                style={{
                  animationDuration: shouldScroll ? animationDuration : 'none',
                  color: error ? theme.colors.yellow[6] : 'inherit'
                }}
              >
                {error ? `⚠️ ${currentTrack.title} (Demo)` : currentTrack.title}
              </Text>
              <Text className={classes.trackArtist}>
                {error ? 'Audio not available' : currentTrack.artist}
              </Text>
            </>
          ) : (
            <Text className={classes.trackTitle} color="dimmed">
              {currentPlaylistData ? 'Select a track from playlist' : 'Select playlist to start'}
            </Text>
          )}
        </Box>

        {/* Controls */}
        <Group className={classes.controls} spacing={4} noWrap>
          <Tooltip label="Previous track" position="top">
            <ActionIcon
              className={classes.controlButton}
              onClick={previousTrack}
              disabled={!currentTrack || !currentPlaylistData}
              variant="subtle"
              size="sm"
            >
              <IconPlayerSkipBack size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={isPlaying ? 'Pause' : 'Play'} position="top">
            <ActionIcon
              className={`${classes.controlButton} ${classes.playButton}`}
              onClick={togglePlayPause}
              disabled={!currentTrack || isLoading}
              loading={isLoading}
              size="sm"
            >
              {isPlaying ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Next track" position="top">
            <ActionIcon
              className={classes.controlButton}
              onClick={nextTrack}
              disabled={!currentTrack || !currentPlaylistData}
              variant="subtle"
              size="sm"
            >
              <IconPlayerSkipForward size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Playlist Selector */}
        <Box>
          <Tooltip label="Select playlist" position="top">
            <Select
              className={classes.playlistSelect}
              data={playlistOptions}
              value={currentPlaylist}
              onChange={handlePlaylistChange}
              placeholder="Select playlist"
              icon={<IconMusic size={14} />}
              size="xs"
              withinPortal
            />
          </Tooltip>
        </Box>

        {/* Expand Button */}
        <Tooltip label="Expand player" position="top">
          <ActionIcon
            className={classes.expandButton}
            onClick={toggleExtended}
            variant="subtle"
            size="sm"
          >
            <IconChevronUp size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Box>
  )
}