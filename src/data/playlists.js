// Music player playlists and tracks data
// This file can be manually updated to add new playlists and tracks

export const playlists = {
  'mr-mammal': {
    id: 'mr-mammal',
    name: 'Mr Mammal',
    description: 'Curated OSRS content creator playlist',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    tracks: [
      {
        id: 'mm-1',
        title: 'Sea Shanty 2',
        artist: 'RuneScape Soundtrack',
        duration: 120,
        spotifyUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
        youtubeUrl: 'https://www.youtube.com/watch?v=RH5rEvxFLvM',
        audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Demo audio file
        thumbnail: 'https://i.ytimg.com/vi/RH5rEvxFLvM/maxresdefault.jpg'
      },
      {
        id: 'mm-2',
        title: 'Autumn Voyage',
        artist: 'RuneScape Soundtrack',
        duration: 180,
        spotifyUrl: 'https://open.spotify.com/track/3ZKvEQWJkjrxAz3I2rNHfX',
        youtubeUrl: 'https://www.youtube.com/watch?v=V_DIFYjg7N0',
        audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Demo audio file
        thumbnail: 'https://i.ytimg.com/vi/V_DIFYjg7N0/maxresdefault.jpg'
      },
      {
        id: 'mm-3',
        title: 'Medieval',
        artist: 'RuneScape Soundtrack',
        duration: 156,
        spotifyUrl: 'https://open.spotify.com/track/1A7YJHtkj5s5M2nv5c8fXZ',
        youtubeUrl: 'https://www.youtube.com/watch?v=V9CJ7rLPmNs',
        audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Demo audio file
        thumbnail: 'https://i.ytimg.com/vi/V9CJ7rLPmNs/maxresdefault.jpg'
      }
    ]
  },
  
  'custom-mix': {
    id: 'custom-mix',
    name: 'GE Metrics Mix',
    description: 'Custom curated tracks for trading',
    thumbnail: '/images/playlists/custom-mix.jpg',
    tracks: [
      {
        id: 'custom-1',
        title: 'Focus Flow',
        artist: 'Lo-Fi Beats',
        duration: 200,
        spotifyUrl: null,
        youtubeUrl: null,
        audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Demo audio file (replace with your MP3)
        thumbnail: '/images/tracks/focus-flow.jpg'
      },
      {
        id: 'custom-2',
        title: 'Trading Zone',
        artist: 'Ambient Mix',
        duration: 240,
        spotifyUrl: null,
        youtubeUrl: null,
        audioUrl: 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3', // Demo audio file (replace with your MP3)
        thumbnail: '/images/tracks/trading-zone.jpg'
      }
    ]
  },

  'boaty': {
    id: 'boaty',
    name: 'B0aty',
    description: 'B0aty\'s favorite RuneScape tracks',
    thumbnail: 'https://i.ytimg.com/vi/bIgBj-G1Vj0/maxresdefault.jpg',
    tracks: [
      {
        id: 'boaty-1',
        title: 'Flute Salad',
        artist: 'RuneScape Soundtrack',
        duration: 90,
        spotifyUrl: 'https://open.spotify.com/track/2ZUQMVdrZEpGqIgVgKHEeR',
        youtubeUrl: 'https://www.youtube.com/watch?v=Jq3y8bOlgpY',
        audioUrl: null,
        thumbnail: 'https://i.ytimg.com/vi/Jq3y8bOlgpY/maxresdefault.jpg'
      },
      {
        id: 'boaty-2',
        title: 'Harmony',
        artist: 'RuneScape Soundtrack',
        duration: 165,
        spotifyUrl: 'https://open.spotify.com/track/5mKHz5MbpnFRxBCWJ3PBrK',
        youtubeUrl: 'https://www.youtube.com/watch?v=JkR7zClEkAo',
        audioUrl: null,
        thumbnail: 'https://i.ytimg.com/vi/JkR7zClEkAo/maxresdefault.jpg'
      }
    ]
  },

  'torvesta': {
    id: 'torvesta',
    name: 'Torvesta',
    description: 'PKing vibes with Torvesta',
    thumbnail: 'https://i.ytimg.com/vi/C_n_qtfjbqA/maxresdefault.jpg',
    tracks: [
      {
        id: 'torv-1',
        title: 'Scape Main',
        artist: 'RuneScape Soundtrack',
        duration: 134,
        spotifyUrl: 'https://open.spotify.com/track/1tP5DKw6hElKNvQAdP3qKz',
        youtubeUrl: 'https://www.youtube.com/watch?v=C_n_qtfjbqA',
        audioUrl: null,
        thumbnail: 'https://i.ytimg.com/vi/C_n_qtfjbqA/maxresdefault.jpg'
      }
    ]
  }
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