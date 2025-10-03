import React, { useState, useEffect, useRef } from 'react'

const LazyLoad = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const placeholderRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      })
    })

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current)
    }

    return () => {
      if (placeholderRef.current) {
        observer.unobserve(placeholderRef.current)
      }
    }
  }, [])

  return (
    <div ref={placeholderRef} style={{ minHeight: '40px' }}>
      {isVisible ? children : null}
    </div>
  )
}

export default LazyLoad
