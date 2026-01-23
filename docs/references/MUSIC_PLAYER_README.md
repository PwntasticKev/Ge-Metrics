# 🎵 GE Metrics Music Player

A Spotify-style music player integrated into the sidebar of the GE Metrics application, designed for a seamless trading experience with background music.

## ✨ Features

### 🎮 Two Display Modes
- **Mini Mode**: Compact player with essential controls and scrolling track title
- **Extended Mode**: Full player with playlist browser, volume control, and track queue

### 🎯 Smart Sidebar Integration
- Automatically switches to mini mode when sidebar is collapsed (80px width)
- Respects sidebar expand/collapse state
- Positioned at bottom of sidebar for easy access

### 🎵 Playlist Management
- **Creator Playlists**: Pre-configured playlists for OSRS content creators (Mr Mammal, B0aty, Torvesta)
- **Custom Playlists**: Support for custom MP3 files
- **Quick Switching**: Dropdown selector in both mini and extended modes

### 📱 Responsive Design
- **Desktop Only**: Hidden completely on mobile for optimal mobile experience
- **Sidebar Aware**: Adapts to sidebar width changes automatically

### ⌨️ Global Keyboard Controls
When music player is visible and active:
- **Spacebar**: Play/Pause
- **Ctrl/Cmd + →**: Next track  
- **Ctrl/Cmd + ←**: Previous track
- **Ctrl/Cmd + ↑**: Volume up
- **Ctrl/Cmd + ↓**: Volume down
- **Ctrl/Cmd + M**: Mute/Unmute

### 💾 Persistence
- Player state persists across page navigation
- Remembers last playlist, track position, and volume
- Survives browser refresh (stops playback but remembers position)

## 🔧 Usage Instructions

### Getting Started
1. Click the Spotify icon in the header to show the music player
2. Select a playlist from the dropdown (starts with "Mr Mammal" by default)
3. Click play to start music
4. Use mini mode for background listening while trading

### Adding Custom MP3 Files
1. Place MP3 files in `/public/audio/` directory
2. Edit `/src/data/playlists.js` to add tracks to the `custom-mix` playlist:
```javascript
{
  id: 'custom-3',
  title: 'Your Track Name',
  artist: 'Artist Name', 
  duration: 180, // seconds
  audioUrl: '/audio/your-track.mp3',
  thumbnail: '/images/tracks/your-track.jpg'
}
```

### Adding Creator Playlists
Edit `/src/data/playlists.js` to add new creators:
```javascript
'new-creator': {
  id: 'new-creator',
  name: 'Creator Name',
  description: 'Creator description',
  tracks: [...]
}
```

## 🎨 Styling & Animation

### Comet-Style Design
- Matches existing app theme (dark/light mode support)
- Gold/blue accent colors consistent with GE Metrics branding
- Smooth hover animations and transitions

### Marquee Animation
- Song titles scroll horizontally when too long for container
- Reading-speed optimized scrolling (30-50 pixels/second)
- Automatic detection of when scrolling is needed

### Visual States
- **Active State**: Green Spotify icon when player is visible
- **Playing State**: Blue play button, animated progress bar
- **Loading State**: Loading spinner during track changes
- **Error State**: Error messaging for failed track loads

## 🔧 Technical Implementation

### Components Structure
```
src/components/MusicPlayer/
├── MusicPlayer.jsx      # Main wrapper with responsive logic
├── MiniPlayer.jsx       # Compact sidebar mode
├── ExtendedPlayer.jsx   # Full player mode  
└── index.js            # Exports
```

### State Management
- **Context**: `src/contexts/MusicPlayerContext.jsx`
- **Local Storage**: Persists user preferences and state
- **Audio API**: HTML5 Audio for MP3 playback (Spotify requires Web SDK)

### Integration Points
- **Header**: Spotify toggle icon with active state
- **Sidebar**: Bottom section with responsive sizing
- **App**: Context provider and global keyboard handler

## 🎵 Current Playlist Content

### Mr Mammal
- Sea Shanty 2
- Autumn Voyage  
- Medieval

### B0aty
- Flute Salad
- Harmony

### Torvesta
- Scape Main

### Custom Mix
- Focus Flow (placeholder)
- Trading Zone (placeholder)

*Note: Spotify tracks require Spotify Web Playback SDK implementation for actual playback. Currently shows placeholders for demonstration.*

## 🚀 Future Enhancements

### Planned Features
- Spotify Web Playback SDK integration for real Spotify playback
- Last.fm scrobbling
- Audio visualization
- Crossfade between tracks
- Equalizer controls

### Mobile Considerations
- Currently disabled on mobile by design
- Could add simplified mobile player in future updates

## 🐛 Troubleshooting

### Common Issues
1. **No Audio**: Check if MP3 files exist in `/public/audio/`
2. **Spotify Tracks**: Currently show "not yet implemented" - this is expected
3. **Keyboard Shortcuts**: Only work when player is visible and not typing in inputs
4. **Mobile**: Player is intentionally hidden on mobile devices

### Debug Mode
Check browser console for music player logs and errors. Context state is logged for debugging.

## 📝 Notes

This music player provides a foundation for background music during trading sessions. The implementation prioritizes non-invasive design, maintaining focus on the primary GE Metrics functionality while adding ambient music support.

For Spotify integration, consider implementing Spotify Web Playback SDK in a future update, which requires Spotify Premium accounts for users.