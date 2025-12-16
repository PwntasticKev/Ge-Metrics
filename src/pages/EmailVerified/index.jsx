// src/pages/EmailVerified/index.jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'

function EmailVerifiedPage () {
  const navigate = useNavigate()

  useEffect(() => {
    // Add entrance animation
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleLogin = () => {
    navigate('/login')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
        animation: 'pulse 4s ease-in-out infinite',
        pointerEvents: 'none'
      }} />
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.5;
          }
        }
        @keyframes shimmer {
          0%, 100% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
        }
        @keyframes checkmark {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .verified-card {
          animation: slideUp 0.6s ease-out;
        }
        .check-icon {
          animation: checkmark 0.8s ease-out 0.3s both;
        }
      `}</style>

      <div className="verified-card" style={{
        maxWidth: '600px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1b1e 0%, #2d2e32 100%)',
          padding: '40px 30px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.1) 100%)',
            animation: 'shimmer 3s infinite',
            pointerEvents: 'none'
          }} />
          <div style={{
            fontSize: '36px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            position: 'relative',
            zIndex: 1,
            marginBottom: '8px',
            letterSpacing: '-1px'
          }}>
            GE Metrics
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            position: 'relative',
            zIndex: 1
          }}>
            Live Market Data
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '50px 30px',
          textAlign: 'center'
        }}>
          {/* Success Icon */}
          <div className="check-icon" style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)'
          }}>
            <IconCheck size={48} color="white" strokeWidth={3} />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: 600,
            color: '#1a1b1e',
            marginBottom: '16px',
            lineHeight: 1.2
          }}>
            You're all set, bro! 🎉
          </h1>

          {/* Message */}
          <p style={{
            fontSize: '18px',
            color: '#495057',
            marginBottom: '32px',
            lineHeight: 1.7,
            maxWidth: '500px',
            margin: '0 auto 32px'
          }}>
            Your email has been verified successfully. Time to dive into your free trial and start tracking those flips!
          </p>

          {/* Button */}
          <Button
            onClick={handleLogin}
            size="lg"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)'
            }}
          >
            Let's Go - Log In
          </Button>

          {/* Footer note */}
          <p style={{
            fontSize: '13px',
            color: '#6c757d',
            marginTop: '32px',
            lineHeight: 1.6
          }}>
            Your 14-day free trial is ready to go. Let's make some GP! 💰
          </p>
        </div>
      </div>
    </div>
  )
}

export default EmailVerifiedPage

