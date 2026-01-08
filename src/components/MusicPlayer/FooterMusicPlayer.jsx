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
  Slider,
  Progress,
  ScrollArea,
  Stack,
  UnstyledButton,
  Collapse,
  Image,
  useMantineTheme
} from '@mantine/core'
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconChevronUp,
  IconChevronDown,
  IconMusic,
  IconVolume,
  IconVolumeOff,
  IconArrowsShuffle,
  IconRepeat,
  IconRepeatOnce,
  IconPlaylist
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
  footerPlayer: {
    width: '100%',
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
    borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    transition: 'all 0.3s ease',
    
    [theme.fn.smallerThan('sm')]: {
      display: 'none' // Hidden on mobile as planned
    }
  },

  playerBar: {
    padding: theme.spacing.sm,
    height: 60
  },

  trackInfo: {
    flex: 1,
    minWidth: 0,
    maxWidth: 300,
    overflow: 'hidden',
    position: 'relative'
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
    lineHeight: '12px',
    marginTop: 18
  },

  controls: {
    gap: 8
  },

  controlButton: {
    width: 32,
    height: 32,
    transition: 'all 0.2s ease',
    
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[5] 
        : theme.colors.gray[2]
    }
  },

  playButton: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.blue[6],
    color: theme.white,
    
    '&:hover': {
      backgroundColor: theme.colors.blue[7],
      transform: 'scale(1.1)'
    }
  },

  activeControl: {
    backgroundColor: theme.colors.blue[6],
    color: theme.white
  },

  progressSection: {
    flex: 1,
    maxWidth: 200,
    margin: `0 ${theme.spacing.md}px`
  },

  volumeSection: {
    width: 120,
    marginRight: theme.spacing.sm
  },

  expandButton: {
    transition: 'all 0.2s ease',
    
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[5] 
        : theme.colors.gray[2]
    }
  },

  expandedPlayer: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
    borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    maxHeight: 300,
    overflow: 'hidden'
  },

  playlistSection: {
    padding: theme.spacing.md,
    height: 250
  },

  trackItem: {
    padding: theme.spacing.xs,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderRadius: theme.radius.sm,
    
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2]
    }
  },

  activeTrack: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.blue[9] : theme.colors.blue[1],
    
    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.blue[8] : theme.colors.blue[2]
    }
  }
}))

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function FooterMusicPlayer() {
  const { classes } = useStyles()
  const theme = useMantineTheme()
  const [expanded, setExpanded] = useState(false)
  const [shouldScroll, setShouldScroll] = useState(false)
  const [animationDuration, setAnimationDuration] = useState('10s')
  const titleRef = useRef(null)
  const containerRef = useRef(null)

  const {
    isVisible,
    playerState,
    currentPlaylist,
    currentTrack,
    currentTime,
    duration,
    volume,
    isShuffled,
    isRepeating,
    error,
    getCurrentTrackData,
    getCurrentPlaylistData,
    togglePlayPause,
    nextTrack,
    previousTrack,
    setPlaylist,
    setTrack,
    setVolume,
    seekTo,
    toggleShuffle,
    toggleRepeat,
    PLAYER_STATES
  } = useMusicPlayer()

  const currentTrackData = getCurrentTrackData()
  const currentPlaylistData = getCurrentPlaylistData()
  const playlists = getAllPlaylists()

  const isPlaying = playerState === PLAYER_STATES.PLAYING
  const isLoading = playerState === PLAYER_STATES.LOADING

  // Check if title should scroll
  useEffect(() => {
    if (titleRef.current && containerRef.current && currentTrackData) {
      const titleWidth = titleRef.current.scrollWidth
      const containerWidth = containerRef.current.offsetWidth
      const needsScroll = titleWidth > containerWidth
      
      setShouldScroll(needsScroll)
      
      if (needsScroll) {
        const scrollDistance = titleWidth + containerWidth
        const pixelsPerSecond = 30
        const duration = scrollDistance / pixelsPerSecond
        setAnimationDuration(`${Math.max(3, duration)}s`)
      }
    }
  }, [currentTrackData?.title])

  const playlistOptions = playlists.map(playlist => ({
    value: playlist.id,
    label: playlist.name
  }))

  const handlePlaylistChange = (playlistId) => {
    if (playlistId && playlistId !== currentPlaylist) {
      setPlaylist(playlistId)
    }
  }

  const handleProgressClick = (value) => {
    if (duration) {
      const newTime = (value / 100) * duration
      seekTo(newTime)
    }
  }

  const handleTrackSelect = (trackId) => {
    if (trackId !== currentTrack) {
      setTrack(trackId)
    }
  }

  const getRepeatIcon = () => {
    switch (isRepeating) {
      case 'one':
        return <IconRepeatOnce size={16} />
      case 'all':
        return <IconRepeat size={16} />
      default:
        return <IconRepeat size={16} />
    }
  }

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <Box className={classes.footerPlayer}>
      {/* Main Player Bar */}
      <Group className={classes.playerBar} position="apart" noWrap>
        {/* Track Info Section */}
        <Box className={classes.trackInfo} ref={containerRef}>
          {currentTrackData ? (
            <>
              <Text
                ref={titleRef}
                className={`${classes.trackTitle} ${shouldScroll ? classes.trackTitleScrolling : ''}`}
                style={{
                  animationDuration: shouldScroll ? animationDuration : 'none',
                  color: error ? theme.colors.yellow[6] : 'inherit'
                }}
              >
                {error ? `⚠️ ${currentTrackData.title} (Demo)` : currentTrackData.title}
              </Text>
              <Text className={classes.trackArtist}>
                {error ? 'Audio not available' : currentTrackData.artist}
              </Text>
            </>
          ) : (
            <>
              <Text className={classes.trackTitle} color="dimmed">
                {currentPlaylistData ? 'Select a track' : 'Select playlist to start'}
              </Text>
              <Text className={classes.trackArtist} color="dimmed">
                Choose from playlists
              </Text>
            </>
          )}
        </Box>

        {/* Control Buttons */}
        <Group className={classes.controls} spacing={4} noWrap>
          <Tooltip label={isShuffled ? 'Shuffle on' : 'Shuffle off'}>
            <ActionIcon
              className={`${classes.controlButton} ${isShuffled ? classes.activeControl : ''}`}
              onClick={toggleShuffle}
              variant={isShuffled ? 'filled' : 'subtle'}
              size="sm"
            >
              <IconArrowsShuffle size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Previous track">
            <ActionIcon
              className={classes.controlButton}
              onClick={previousTrack}
              disabled={!currentTrackData}
              variant="subtle"
              size="sm"
            >
              <IconPlayerSkipBack size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
            <ActionIcon
              className={classes.playButton}
              onClick={togglePlayPause}
              disabled={!currentTrackData || isLoading}
              loading={isLoading}
              variant="filled"
            >
              {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Next track">
            <ActionIcon
              className={classes.controlButton}
              onClick={nextTrack}
              disabled={!currentTrackData}
              variant="subtle"
              size="sm"
            >
              <IconPlayerSkipForward size={16} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label={`Repeat: ${isRepeating}`}>
            <ActionIcon
              className={`${classes.controlButton} ${isRepeating !== 'none' ? classes.activeControl : ''}`}
              onClick={toggleRepeat}
              variant={isRepeating !== 'none' ? 'filled' : 'subtle'}
              size="sm"
            >
              {getRepeatIcon()}
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Progress Section */}
        <Box className={classes.progressSection}>
          <Group spacing={8} noWrap>
            <Text size="xs" color="dimmed" style={{ minWidth: 35, textAlign: 'right' }}>
              {formatTime(currentTime)}
            </Text>
            <Progress
              value={duration ? (currentTime / duration) * 100 : 0}
              size="sm"
              color="blue"
              style={{ flex: 1, cursor: 'pointer' }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const percent = (e.clientX - rect.left) / rect.width
                handleProgressClick(percent * 100)
              }}
            />
            <Text size="xs" color="dimmed" style={{ minWidth: 35 }}>
              {formatTime(duration)}
            </Text>
          </Group>
        </Box>

        {/* Volume Section */}
        <Group className={classes.volumeSection} spacing={8} noWrap>
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          >
            {volume === 0 ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
          </ActionIcon>
          <Slider
            value={volume}
            onChange={setVolume}
            min={0}
            max={1}
            step={0.05}
            size="sm"
            color="blue"
            style={{ flex: 1 }}
          />
        </Group>

        {/* Playlist Selector */}
        <Select
          data={playlistOptions}
          value={currentPlaylist}
          onChange={handlePlaylistChange}
          placeholder="Playlist"
          icon={<IconPlaylist size={14} />}
          size="sm"
          style={{ width: 140 }}
          withinPortal
        />

        {/* Expand Button */}
        <Tooltip label={expanded ? 'Collapse' : 'Expand player'}>
          <ActionIcon
            className={classes.expandButton}
            onClick={() => setExpanded(!expanded)}
            variant="subtle"
            size="sm"
          >
            {expanded ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Expanded Player Section */}
      <Collapse in={expanded}>
        <Box className={classes.expandedPlayer}>
          <Box className={classes.playlistSection}>
            <Group position="apart" mb="sm">
              <Text weight={500} size="sm">
                {currentPlaylistData?.name || 'Playlist'} ({currentPlaylistData?.tracks?.length || 0} tracks)
              </Text>
            </Group>
            
            <ScrollArea style={{ height: 200 }}>
              <Stack spacing={2}>
                {currentPlaylistData?.tracks?.map((track, index) => (
                  <UnstyledButton
                    key={track.id}
                    className={`${classes.trackItem} ${track.id === currentTrack ? classes.activeTrack : ''}`}
                    onClick={() => handleTrackSelect(track.id)}
                  >
                    <Group position="apart" noWrap>
                      <Box style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" truncate weight={track.id === currentTrack ? 600 : 400}>
                          {track.title}
                        </Text>
                        <Text size="xs" color="dimmed" truncate>
                          {track.artist}
                        </Text>
                      </Box>
                      <Text size="xs" color="dimmed">
                        {formatTime(track.duration)}
                      </Text>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea>
          </Box>
        </Box>
      </Collapse>
    </Box>
  )
}