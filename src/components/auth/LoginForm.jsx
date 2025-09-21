import React, { useState } from 'react'
import { useLogin, useGoogleLogin } from '../../hooks/useAuth'

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const loginMutation = useLogin()
  const googleLoginMutation = useGoogleLogin()

  const handleSubmit = (e) => {
    e.preventDefault()
    loginMutation.mutate(formData)
  }

  const handleGoogleLogin = async () => {
    // This would typically use Google's JavaScript SDK
    // For demo purposes, we'll show how to handle the ID token
    try {
      // Example: Get ID token from Google SDK
      // const idToken = await getGoogleIdToken();
      // googleLoginMutation.mutate({ idToken });

    } catch (error) {
      console.error('Google login error:', error)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="login-form">
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loginMutation.isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loginMutation.isPending}
          />
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="login-button"
        >
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>

        {loginMutation.error && (
          <div className="error-message">
            {loginMutation.error.message}
          </div>
        )}
      </form>

      <div className="divider">
        <span>OR</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={googleLoginMutation.isPending}
        className="google-login-button"
      >
        {googleLoginMutation.isPending ? 'Signing in...' : 'Sign in with Google'}
      </button>

      {googleLoginMutation.error && (
        <div className="error-message">
          {googleLoginMutation.error.message}
        </div>
      )}

      <style jsx>{`
        .login-form {
          max-width: 400px;
          margin: 0 auto;
          padding: 2rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }

        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .login-button, .google-login-button {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .login-button {
          background-color: #007bff;
          color: white;
          margin-bottom: 1rem;
        }

        .login-button:hover:not(:disabled) {
          background-color: #0056b3;
        }

        .google-login-button {
          background-color: #db4437;
          color: white;
        }

        .google-login-button:hover:not(:disabled) {
          background-color: #c23321;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .divider {
          text-align: center;
          margin: 1rem 0;
          position: relative;
        }

        .divider::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background-color: #ddd;
        }

        .divider span {
          background: white;
          padding: 0 1rem;
          color: #666;
        }

        .error-message {
          color: #dc3545;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

export default LoginForm
