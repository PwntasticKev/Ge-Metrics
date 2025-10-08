import { useAuth } from '../../hooks/useAuth'
import PremiumOverlay from '../PremiumOverlay'

const PremiumPageWrapper = ({ children }) => {
  const { user, isSubscribed } = useAuth()
  
  // Check if user has access (admin/moderator bypass subscription requirement)
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator'
  const hasAccess = isAdminOrModerator || isSubscribed

  // If user doesn't have access, wrap with premium overlay
  if (!hasAccess) {
    return (
      <PremiumOverlay>
        {children}
      </PremiumOverlay>
    )
  }

  // User has access, show the page normally
  return children
}

export default PremiumPageWrapper