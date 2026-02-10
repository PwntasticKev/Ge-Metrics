import React from 'react'

class ThreeJsErrorBoundary extends React.Component {
  constructor (props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError () {
    return { hasError: true }
  }

  componentDidCatch (error) {
    console.warn('Three.js background failed to load:', error.message)
  }

  render () {
    if (this.state.hasError) return null
    return this.props.children
  }
}

export default ThreeJsErrorBoundary
