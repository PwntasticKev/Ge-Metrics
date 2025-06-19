import React, { useState } from 'react'
import { useRegister } from '../../hooks/useAuth'

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  })

  const registerMutation = useRegister()

  const handleSubmit = (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    registerMutation.mutate({
      email: formData.email,
      password: formData.password,
      name: formData.name
    })
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="register-form">
      <h2>Register</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={registerMutation.isPending}
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={registerMutation.isPending}
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
            minLength={8}
            disabled={registerMutation.isPending}
          />
          <small>Password must be at least 8 characters long</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            disabled={registerMutation.isPending}
          />
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="register-button"
        >
          {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
        </button>

        {registerMutation.error && (
          <div className="error-message">
            {registerMutation.error.message}
          </div>
        )}

        {registerMutation.isSuccess && (
          <div className="success-message">
            Account created successfully! You are now logged in.
          </div>
        )}
      </form>

      <style jsx>{`
        .register-form {
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
          border-color: #28a745;
          box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
        }

        small {
          color: #666;
          font-size: 0.875rem;
          margin-top: 0.25rem;
          display: block;
        }

        .register-button {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
          background-color: #28a745;
          color: white;
        }

        .register-button:hover:not(:disabled) {
          background-color: #218838;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc3545;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
        }

        .success-message {
          color: #155724;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          border-radius: 4px;
        }
      `}</style>
    </div>
  )
}

export default RegisterForm
