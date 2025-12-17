/**
 * Reusable component styles and hover effects
 * Provides consistent animations and transitions across the app
 */

// Theme colors for hover effects
export const hoverColors = {
  purple: '#667eea',
  gold: '#ffd700',
  blue: '#228be6'
}

// Common transition timing
export const transitionTiming = '0.2s ease-out'

/**
 * Get input styles with hover and focus effects
 */
export const getInputStyles = (theme) => ({
  input: {
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    '&:hover': {
      borderColor: hoverColors.blue,
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
    },
    '&:focus': {
      borderColor: hoverColors.gold,
      boxShadow: `0 0 0 2px rgba(255, 215, 0, 0.2)`
    }
  }
})

/**
 * Get button hover handlers (no scaling, just shadow)
 */
export const getButtonHoverHandlers = () => ({
  onMouseEnter: (e) => {
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.boxShadow = 'none'
  }
})

/**
 * Get ActionIcon hover handlers (no scaling, just shadow and optional rotate)
 */
export const getActionIconHoverHandlers = (rotate = false) => ({
  style: {
    transition: 'box-shadow 0.2s ease-out, transform 0.2s ease-out'
  },
  onMouseEnter: (e) => {
    e.currentTarget.style.transform = rotate ? 'rotate(5deg)' : 'none'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)'
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.transform = 'rotate(0deg)'
    e.currentTarget.style.boxShadow = 'none'
  }
})

/**
 * Get card hover handlers (no scaling, just shadow)
 */
export const getCardHoverHandlers = () => ({
  style: {
    transition: 'box-shadow 0.2s ease-out',
    cursor: 'pointer'
  },
  onMouseEnter: (e) => {
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.2)'
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.boxShadow = 'none'
  }
})

/**
 * Get badge hover handlers (no scaling, just shadow)
 */
export const getBadgeHoverHandlers = () => ({
  style: {
    transition: 'box-shadow 0.2s ease-out'
  },
  onMouseEnter: (e) => {
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.boxShadow = 'none'
  }
})

