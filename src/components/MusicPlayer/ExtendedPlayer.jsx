import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Group,
  Text,
  ActionIcon,
  Slider,
  Progress,
  ScrollArea,
  Stack,
  Image,
  Card,
  Badge,
  UnstyledButton,
  Tooltip,
  createStyles,
  Select,
  Divider
} from '@mantine/core'
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconChevronDown,
  IconVolume,
  IconVolumeOff,
  IconArrowsShuffle,
  IconRepeat,
  IconRepeatOnce,
  IconMusic,
  IconClock
} from '@tabler/icons-react'
import { useMusicPlayer } from '../../contexts/MusicPlayerContext'
import { getAllPlaylists, getPlaylist } from '../../data/playlists'

const useStyles = createStyles((theme) => ({
  extendedPlayer: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[1],
    borderTop: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    borderRadius: `${theme.radius.sm}px ${theme.radius.sm}px 0 0`,
    overflow: 'hidden',
    transition: 'all 0.3s ease'
  },

  playerHeader: {
    padding: theme.spacing.xs,
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0]
  },

  mainControls: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`
  },

  trackDisplay: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm
  },

  trackImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: theme.spacing.xs
  },

  trackTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: 600,
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    marginBottom: 2
  },

  trackArtist: {
    fontSize: theme.fontSizes.sm,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6]
  },

  progressSection: {
    marginBottom: theme.spacing.sm
  },

  progressBar: {
    marginBottom: theme.spacing.xs,
    cursor: 'pointer'
  },

  timeDisplay: {
    fontSize: theme.fontSizes.xs,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[6]
  },

  controlsRow: {
    justifyContent: 'center',
    marginBottom: theme.spacing.sm
  },

  controlButton: {
    width: 36,
    height: 36,
    transition: 'all 0.2s ease',
    
    '&:hover': {
      transform: 'scale(1.1)',
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[5] 
        : theme.colors.gray[2]
    }
  },

  playButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.blue[6],
    color: theme.white,
    
    '&:hover': {
      backgroundColor: theme.colors.blue[7],
      transform: 'scale(1.1)'
    }
  },

  activeControl: {
    backgroundColor: theme.colors.blue[6],
    color: theme.white,
    
    '&:hover': {
      backgroundColor: theme.colors.blue[7]
    }
  },

  volumeSection: {
    padding: theme.spacing.xs,
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`
  },

  queueSection: {
    height: 120,
    overflow: 'hidden'
  },

  queueHeader: {
    padding: theme.spacing.xs,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
    borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
    fontSize: theme.fontSizes.sm,
    fontWeight: 500
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
  },

  collapseButton: {
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
  },

  playlistSelect: {
    flex: 1,
    marginRight: theme.spacing.xs,
    
    '& .mantine-Select-input': {
      fontSize: theme.fontSizes.sm,
      backgroundColor: theme.colorScheme === 'dark' 
        ? theme.colors.dark[6] 
        : theme.colors.gray[0],
      border: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
      
      '&:focus': {
        borderColor: theme.colors.blue[6]
      }
    }
  }
}))

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export function ExtendedPlayer() {
  const { classes } = useStyles()
  const {
    playerState,
    currentPlaylist,
    currentTrack,
    currentTime,
    duration,
    volume,
    isShuffled,
    isRepeating,
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
    toggleExtended,
    PLAYER_STATES
  } = useMusicPlayer()

  const [isDragging, setIsDragging] = useState(false)
  const progressRef = useRef(null)

  const currentTrackData = getCurrentTrackData()
  const currentPlaylistData = getCurrentPlaylistData()
  const playlists = getAllPlaylists()

  const isPlaying = playerState === PLAYER_STATES.PLAYING
  const isLoading = playerState === PLAYER_STATES.LOADING

  const playlistOptions = playlists.map(playlist => ({
    value: playlist.id,
    label: playlist.name
  }))

  const handlePlaylistChange = (playlistId) => {
    if (playlistId && playlistId !== currentPlaylist) {
      setPlaylist(playlistId)
    }
  }

  const handleProgressClick = (event) => {
    if (!progressRef.current || !duration) return

    const rect = progressRef.current.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    const newTime = percent * duration
    
    seekTo(Math.max(0, Math.min(duration, newTime)))
  }

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume)
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

  const getRepeatTooltip = () => {
    switch (isRepeating) {
      case 'one':
        return 'Repeat one'
      case 'all':
        return 'Repeat all'
      default:
        return 'Repeat off'
    }
  }

  return (
    <Box className={classes.extendedPlayer}>
      {/* Header */}
      <Group className={classes.playerHeader} position="apart">
        <Group spacing="xs">
          <IconMusic size={16} />
          <Text size="sm" weight={500}>Music Player</Text>
        </Group>
        
        <Group spacing="xs">
          <Select
            className={classes.playlistSelect}
            data={playlistOptions}
            value={currentPlaylist}
            onChange={handlePlaylistChange}
            placeholder="Select playlist"
            size="xs"
            withinPortal
          />
          
          <Tooltip label="Minimize player" position="top">
            <ActionIcon
              className={classes.collapseButton}
              onClick={toggleExtended}
              variant="subtle"
              size="sm"
            >
              <IconChevronDown size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Main Controls */}
      <Box className={classes.mainControls}>
        {/* Track Display */}
        <Box className={classes.trackDisplay}>
          <Box className={classes.trackImage}>
            {currentTrackData?.thumbnail ? (
              <Image
                src={currentTrackData.thumbnail}
                width={60}
                height={60}
                fit="cover"
                radius="sm"
                withPlaceholder
                alt={currentTrackData?.title || 'Track'}
              />
            ) : (
              <IconMusic size={24} color="gray" />
            )}
          </Box>
          
          <Text className={classes.trackTitle} truncate>
            {currentTrackData?.title || 'No track selected'}
          </Text>
          <Text className={classes.trackArtist} truncate>
            {currentTrackData?.artist || ''}
          </Text>
        </Box>

        {/* Progress Bar */}
        <Box className={classes.progressSection}>
          <Progress
            ref={progressRef}
            className={classes.progressBar}
            value={duration ? (currentTime / duration) * 100 : 0}
            size="sm"
            color="blue"
            onClick={handleProgressClick}
            styles={{
              bar: {
                transition: isDragging ? 'none' : 'width 0.3s ease'
              }
            }}
          />
          <Group position="apart" className={classes.timeDisplay}>
            <Text>{formatTime(currentTime)}</Text>
            <Text>{formatTime(duration)}</Text>
          </Group>
        </Box>

        {/* Control Buttons */}
        <Group className={classes.controlsRow} spacing="md">
          <Tooltip label={isShuffled ? 'Shuffle on' : 'Shuffle off'}>
            <ActionIcon
              className={`${classes.controlButton} ${isShuffled ? classes.activeControl : ''}`}
              onClick={toggleShuffle}
              variant={isShuffled ? 'filled' : 'subtle'}
            >
              <IconArrowsShuffle size={16} />
            </ActionIcon>
          </Tooltip>

          <ActionIcon
            className={classes.controlButton}
            onClick={previousTrack}
            disabled={!currentTrackData}
            variant="subtle"
          >
            <IconPlayerSkipBack size={18} />
          </ActionIcon>

          <ActionIcon
            className={classes.playButton}
            onClick={togglePlayPause}
            disabled={!currentTrackData || isLoading}
            loading={isLoading}
            variant="filled"
          >
            {isPlaying ? <IconPlayerPause size={20} /> : <IconPlayerPlay size={20} />}
          </ActionIcon>

          <ActionIcon
            className={classes.controlButton}
            onClick={nextTrack}
            disabled={!currentTrackData}
            variant="subtle"
          >
            <IconPlayerSkipForward size={18} />
          </ActionIcon>

          <Tooltip label={getRepeatTooltip()}>
            <ActionIcon
              className={`${classes.controlButton} ${isRepeating !== 'none' ? classes.activeControl : ''}`}
              onClick={toggleRepeat}
              variant={isRepeating !== 'none' ? 'filled' : 'subtle'}
            >
              {getRepeatIcon()}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      {/* Volume Control */}
      <Group className={classes.volumeSection} spacing="sm">
        <ActionIcon
          variant="subtle"
          onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.7)}
        >
          {volume === 0 ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
        </ActionIcon>
        <Slider
          style={{ flex: 1 }}
          value={volume}
          onChange={handleVolumeChange}
          min={0}
          max={1}
          step={0.05}
          size="sm"
          color="blue"
          marks={[
            { value: 0, label: '0%' },
            { value: 0.5, label: '50%' },
            { value: 1, label: '100%' }
          ]}
        />
      </Group>

      {/* Queue/Playlist */}
      <Box className={classes.queueSection}>
        <Text className={classes.queueHeader}>
          {currentPlaylistData?.name || 'Playlist'} ({currentPlaylistData?.tracks?.length || 0} tracks)
        </Text>
        <ScrollArea style={{ height: 80 }}>
          <Stack spacing={2} p="xs">
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
                  <Group spacing={4}>
                    <IconClock size={12} color="gray" />
                    <Text size="xs" color="dimmed">
                      {formatTime(track.duration)}
                    </Text>
                  </Group>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea>
      </Box>
    </Box>
  )
}