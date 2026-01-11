// Music player playlists and tracks data
// This file can be manually updated to add new playlists and tracks

export const playlists = {
  'mr-mammal': {
    id: 'mr-mammal',
    name: 'GE Metrics',
    description: 'Curated OSRS trading music playlist',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    tracks: [
      {
        id: 'mm-1',
        title: 'Shanty of the Second Tide',
        artist: 'RuneScape Soundtrack',
        duration: 120,
        spotifyUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        youtubeUrl: 'https://www.youtube.com/watch?v=RH5rEvxFLvM',
        thumbnail: 'https://i.ytimg.com/vi/RH5rEvxFLvM/maxresdefault.jpg',
        audioSources: [
          {
            type: 'mp3',
            url: '/audio/Shanty%20of%20the%20Second%20Tide%20-%20AI%20Music.mp3',
            quality: 'high',
            description: 'Sea Shanty 2'
          },
          {
            type: 'backup',
            url: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
            quality: 'medium', 
            description: 'Demo audio (fallback)'
          }
        ]
      },
      {
        id: 'mm-2',
        title: 'Tick-Perfect Massacre',
        artist: 'RuneScape Soundtrack',
        duration: 180,
        spotifyUrl: 'https://open.spotify.com/track/3ZKvEQWJkjrxAz3I2rNHfX',
        youtubeUrl: 'https://www.youtube.com/watch?v=V_DIFYjg7N0',
        thumbnail: 'https://i.ytimg.com/vi/V_DIFYjg7N0/maxresdefault.jpg',
        audioSources: [
          {
            type: 'mp3',
            url: '/audio/Tick-Perfect%20Massacre.mp3',
            quality: 'high',
            description: 'Tick-Perfect Massacre'
          },
          {
            type: 'backup',
            url: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3',
            quality: 'medium',
            description: 'Demo audio (fallback)'
          }
        ]
      },
    ]
  },
}

// Helper functions for playlist management
export const getPlaylist = (playlistId) => {
  return playlists[playlistId] || null
}

export const getAllPlaylists = () => {
  return Object.values(playlists)
}

export const getTrack = (playlistId, trackId) => {
  const playlist = getPlaylist(playlistId)
  if (!playlist) return null
  
  return playlist.tracks.find(track => track.id === trackId) || null
}

export const getNextTrack = (playlistId, currentTrackId) => {
  const playlist = getPlaylist(playlistId)
  if (!playlist) return null
  
  const currentIndex = playlist.tracks.findIndex(track => track.id === currentTrackId)
  if (currentIndex === -1) return playlist.tracks[0] || null
  
  const nextIndex = (currentIndex + 1) % playlist.tracks.length
  return playlist.tracks[nextIndex]
}

export const getPreviousTrack = (playlistId, currentTrackId) => {
  const playlist = getPlaylist(playlistId)
  if (!playlist) return null
  
  const currentIndex = playlist.tracks.findIndex(track => track.id === currentTrackId)
  if (currentIndex === -1) return playlist.tracks[0] || null
  
  const prevIndex = currentIndex === 0 ? playlist.tracks.length - 1 : currentIndex - 1
  return playlist.tracks[prevIndex]
}

// Default playlist configuration
export const DEFAULT_PLAYLIST = 'mr-mammal'
export const DEFAULT_TRACK = playlists[DEFAULT_PLAYLIST]?.tracks[0] || null