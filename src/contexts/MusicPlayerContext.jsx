import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { getPlaylist, getTrack, getNextTrack, getPreviousTrack, DEFAULT_PLAYLIST, DEFAULT_TRACK } from '../data/playlists'

const MusicPlayerContext = createContext()

// Music player states
const PLAYER_STATES = {
  STOPPED: 'stopped',
  PLAYING: 'playing',
  PAUSED: 'paused',
  LOADING: 'loading'
}

// Initial state
const initialState = {
  // Player visibility and mode
  isVisible: false,
  isExtended: false,
  
  // Current playback state
  playerState: PLAYER_STATES.STOPPED,
  currentPlaylist: null,
  currentTrack: null,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  
  // Player settings
  isShuffled: false,
  isRepeating: false, // 'none', 'all', 'one'
  
  // UI state
  isLoading: false,
  error: null
}

// Action types
const ACTION_TYPES = {
  // Player visibility
  SHOW_PLAYER: 'SHOW_PLAYER',
  HIDE_PLAYER: 'HIDE_PLAYER',
  TOGGLE_EXTENDED: 'TOGGLE_EXTENDED',
  SET_EXTENDED: 'SET_EXTENDED',
  
  // Playback controls
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  STOP: 'STOP',
  SET_LOADING: 'SET_LOADING',
  
  // Track management
  SET_PLAYLIST: 'SET_PLAYLIST',
  SET_TRACK: 'SET_TRACK',
  NEXT_TRACK: 'NEXT_TRACK',
  PREVIOUS_TRACK: 'PREVIOUS_TRACK',
  
  // Playback state
  UPDATE_TIME: 'UPDATE_TIME',
  SET_DURATION: 'SET_DURATION',
  SET_VOLUME: 'SET_VOLUME',
  
  // Settings
  TOGGLE_SHUFFLE: 'TOGGLE_SHUFFLE',
  TOGGLE_REPEAT: 'TOGGLE_REPEAT',
  
  // Error handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // State restoration
  RESTORE_STATE: 'RESTORE_STATE'
}

// Reducer
function musicPlayerReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SHOW_PLAYER:
      // Auto-load default playlist and track when showing player
      const defaultPlaylist = getPlaylist(DEFAULT_PLAYLIST)
      return { 
        ...state, 
        isVisible: true,
        currentPlaylist: DEFAULT_PLAYLIST,
        currentTrack: defaultPlaylist?.tracks[0]?.id || null,
        error: null
      }
      
    case ACTION_TYPES.HIDE_PLAYER:
      return { ...state, isVisible: false, playerState: PLAYER_STATES.STOPPED }
      
    case ACTION_TYPES.TOGGLE_EXTENDED:
      return { ...state, isExtended: !state.isExtended }
      
    case ACTION_TYPES.SET_EXTENDED:
      return { ...state, isExtended: action.payload }
      
    case ACTION_TYPES.PLAY:
      return { ...state, playerState: PLAYER_STATES.PLAYING, error: null }
      
    case ACTION_TYPES.PAUSE:
      return { ...state, playerState: PLAYER_STATES.PAUSED }
      
    case ACTION_TYPES.STOP:
      return { 
        ...state, 
        playerState: PLAYER_STATES.STOPPED, 
        currentTime: 0 
      }
      
    case ACTION_TYPES.SET_LOADING:
      return { ...state, isLoading: action.payload }
      
    case ACTION_TYPES.SET_PLAYLIST:
      const playlist = getPlaylist(action.payload)
      if (!playlist) return state
      
      return {
        ...state,
        currentPlaylist: action.payload,
        currentTrack: playlist.tracks[0]?.id || null,
        currentTime: 0,
        error: null
      }
      
    case ACTION_TYPES.SET_TRACK:
      return {
        ...state,
        currentTrack: action.payload,
        currentTime: 0,
        playerState: PLAYER_STATES.PLAYING, // Auto-play when track is selected
        error: null
      }
      
    case ACTION_TYPES.NEXT_TRACK:
      if (!state.currentPlaylist || !state.currentTrack) return state
      
      const nextTrack = getNextTrack(state.currentPlaylist, state.currentTrack)
      if (!nextTrack) return state
      
      return {
        ...state,
        currentTrack: nextTrack.id,
        currentTime: 0,
        playerState: state.playerState === PLAYER_STATES.PLAYING ? PLAYER_STATES.PLAYING : PLAYER_STATES.STOPPED
      }
      
    case ACTION_TYPES.PREVIOUS_TRACK:
      if (!state.currentPlaylist || !state.currentTrack) return state
      
      const prevTrack = getPreviousTrack(state.currentPlaylist, state.currentTrack)
      if (!prevTrack) return state
      
      return {
        ...state,
        currentTrack: prevTrack.id,
        currentTime: 0,
        playerState: state.playerState === PLAYER_STATES.PLAYING ? PLAYER_STATES.PLAYING : PLAYER_STATES.STOPPED
      }
      
    case ACTION_TYPES.UPDATE_TIME:
      return { ...state, currentTime: action.payload }
      
    case ACTION_TYPES.SET_DURATION:
      return { ...state, duration: action.payload }
      
    case ACTION_TYPES.SET_VOLUME:
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) }
      
    case ACTION_TYPES.TOGGLE_SHUFFLE:
      return { ...state, isShuffled: !state.isShuffled }
      
    case ACTION_TYPES.TOGGLE_REPEAT:
      const repeatModes = ['none', 'all', 'one']
      const currentIndex = repeatModes.indexOf(state.isRepeating)
      const nextIndex = (currentIndex + 1) % repeatModes.length
      return { ...state, isRepeating: repeatModes[nextIndex] }
      
    case ACTION_TYPES.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false }
      
    case ACTION_TYPES.CLEAR_ERROR:
      return { ...state, error: null }
      
    case ACTION_TYPES.RESTORE_STATE:
      return { ...state, ...action.payload }
      
    default:
      return state
  }
}

// Context provider
export function MusicPlayerProvider({ children }) {
  const [state, dispatch] = useReducer(musicPlayerReducer, initialState)
  const audioRef = useRef(null)
  const progressIntervalRef = useRef(null)
  
  // Load saved state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('musicPlayerState')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        dispatch({ 
          type: ACTION_TYPES.RESTORE_STATE, 
          payload: { 
            ...parsed, 
            playerState: PLAYER_STATES.STOPPED, // Don't auto-play on reload
            currentTime: 0,
            isLoading: false,
            error: null
          }
        })
      } catch (error) {
        console.warn('Failed to restore music player state:', error)
      }
    }
  }, [])
  
  // Save state changes to localStorage
  useEffect(() => {
    const stateToSave = {
      isVisible: state.isVisible,
      isExtended: state.isExtended,
      currentPlaylist: state.currentPlaylist,
      currentTrack: state.currentTrack,
      volume: state.volume,
      isShuffled: state.isShuffled,
      isRepeating: state.isRepeating
    }
    localStorage.setItem('musicPlayerState', JSON.stringify(stateToSave))
  }, [state.isVisible, state.isExtended, state.currentPlaylist, state.currentTrack, state.volume, state.isShuffled, state.isRepeating])
  
  // Audio element management
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = state.volume
      
      // Audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        dispatch({ type: ACTION_TYPES.SET_DURATION, payload: audioRef.current.duration })
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false })
      })
      
      audioRef.current.addEventListener('ended', () => {
        if (state.isRepeating === 'one') {
          audioRef.current.currentTime = 0
          audioRef.current.play()
        } else if (state.isRepeating === 'all' || state.isShuffled) {
          dispatch({ type: ACTION_TYPES.NEXT_TRACK })
        } else {
          dispatch({ type: ACTION_TYPES.STOP })
        }
      })
      
      audioRef.current.addEventListener('error', async (e) => {
        console.warn('Audio playback error:', e.target?.error || e)
        
        // Try fallback audio sources
        const track = getTrack(state.currentPlaylist, state.currentTrack)
        if (track && track.audioSources && track.audioSources.length > 1) {
          const currentSrc = audioRef.current.src
          const currentSourceIndex = track.audioSources.findIndex(source => 
            currentSrc.includes(source.url || source.audioUrl || ''))
          
          if (currentSourceIndex >= 0 && currentSourceIndex < track.audioSources.length - 1) {
            // Try next audio source
            const nextSource = track.audioSources[currentSourceIndex + 1]
            const nextUrl = nextSource.url || nextSource.audioUrl
            if (nextUrl) {
              console.log(`Trying fallback audio source: ${nextUrl}`)
              audioRef.current.src = nextUrl
              audioRef.current.load()
              return // Don't show error yet, try the fallback
            }
          }
        }
        
        dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'Audio not available (trying fallbacks...)' })
        // Auto-skip to next track after 3 seconds if all sources fail
        setTimeout(() => {
          dispatch({ type: ACTION_TYPES.NEXT_TRACK })
          dispatch({ type: ACTION_TYPES.CLEAR_ERROR })
        }, 3000)
      })
      
      audioRef.current.addEventListener('canplay', () => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: false })
      })
      
      audioRef.current.addEventListener('waiting', () => {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true })
      })
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])
  
  // Update audio source when track changes
  useEffect(() => {
    if (state.currentPlaylist && state.currentTrack && audioRef.current) {
      const track = getTrack(state.currentPlaylist, state.currentTrack)
      if (track) {
        dispatch({ type: ACTION_TYPES.SET_LOADING, payload: true })
        
        // Try audio sources in priority order
        let audioUrl = null
        
        if (track.audioSources && track.audioSources.length > 0) {
          // Use the first available source from audioSources array
          audioUrl = track.audioSources[0].url || track.audioSources[0].audioUrl
        } else if (track.audioUrl) {
          // Fallback to legacy audioUrl field
          audioUrl = track.audioUrl
        } else if (track.youtubeUrl) {
          // Try YouTube as a last resort (won't work directly, but shows intent)
          console.warn('YouTube URL detected, direct playback not supported:', track.youtubeUrl)
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'YouTube playback not yet implemented' })
          return
        } else {
          console.warn('No audio source available for track:', track.title)
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'No audio source available' })
          return
        }
        
        if (audioUrl) {
          console.log(`Loading audio from: ${audioUrl}`)
          audioRef.current.src = audioUrl
        } else {
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'No valid audio URL found' })
          return
        }
        
        audioRef.current.load()
      }
    }
  }, [state.currentPlaylist, state.currentTrack])
  
  // Handle play/pause state changes
  useEffect(() => {
    if (!audioRef.current) return
    
    if (state.playerState === PLAYER_STATES.PLAYING) {
      const playPromise = audioRef.current.play()
      if (playPromise) {
        playPromise.catch(error => {
          console.error('Play failed:', error)
          dispatch({ type: ACTION_TYPES.SET_ERROR, payload: 'Playback failed' })
        })
      }
      
      // Start progress tracking
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current && !audioRef.current.paused) {
          dispatch({ type: ACTION_TYPES.UPDATE_TIME, payload: audioRef.current.currentTime })
        }
      }, 1000)
    } else if (state.playerState === PLAYER_STATES.PAUSED) {
      audioRef.current.pause()
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    } else if (state.playerState === PLAYER_STATES.STOPPED) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
    
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [state.playerState])
  
  // Update audio volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume
    }
  }, [state.volume])
  
  // Action creators
  const actions = {
    showPlayer: () => dispatch({ type: ACTION_TYPES.SHOW_PLAYER }),
    hidePlayer: () => dispatch({ type: ACTION_TYPES.HIDE_PLAYER }),
    toggleExtended: () => dispatch({ type: ACTION_TYPES.TOGGLE_EXTENDED }),
    setExtended: (extended) => dispatch({ type: ACTION_TYPES.SET_EXTENDED, payload: extended }),
    
    play: () => dispatch({ type: ACTION_TYPES.PLAY }),
    pause: () => dispatch({ type: ACTION_TYPES.PAUSE }),
    stop: () => dispatch({ type: ACTION_TYPES.STOP }),
    togglePlayPause: () => {
      if (state.playerState === PLAYER_STATES.PLAYING) {
        dispatch({ type: ACTION_TYPES.PAUSE })
      } else {
        dispatch({ type: ACTION_TYPES.PLAY })
      }
    },
    
    setPlaylist: (playlistId) => dispatch({ type: ACTION_TYPES.SET_PLAYLIST, payload: playlistId }),
    setTrack: (trackId) => dispatch({ type: ACTION_TYPES.SET_TRACK, payload: trackId }),
    nextTrack: () => dispatch({ type: ACTION_TYPES.NEXT_TRACK }),
    previousTrack: () => dispatch({ type: ACTION_TYPES.PREVIOUS_TRACK }),
    
    setVolume: (volume) => dispatch({ type: ACTION_TYPES.SET_VOLUME, payload: volume }),
    seekTo: (time) => {
      if (audioRef.current) {
        audioRef.current.currentTime = time
        dispatch({ type: ACTION_TYPES.UPDATE_TIME, payload: time })
      }
    },
    
    toggleShuffle: () => dispatch({ type: ACTION_TYPES.TOGGLE_SHUFFLE }),
    toggleRepeat: () => dispatch({ type: ACTION_TYPES.TOGGLE_REPEAT }),
    
    clearError: () => dispatch({ type: ACTION_TYPES.CLEAR_ERROR })
  }
  
  // Get current track data
  const getCurrentTrackData = () => {
    if (!state.currentPlaylist || !state.currentTrack) return null
    return getTrack(state.currentPlaylist, state.currentTrack)
  }
  
  const getCurrentPlaylistData = () => {
    if (!state.currentPlaylist) return null
    return getPlaylist(state.currentPlaylist)
  }
  
  const value = {
    ...state,
    ...actions,
    getCurrentTrackData,
    getCurrentPlaylistData,
    PLAYER_STATES
  }
  
  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  )
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider')
  }
  return context
}