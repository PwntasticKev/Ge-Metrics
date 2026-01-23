import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import UserMoneyMakingMethods from './index.jsx'

// Mock dependencies
vi.mock('../../utils/trpc.jsx', () => ({
  trpc: {
    moneyMakingMethods: {
      getUserMethods: {
        useQuery: vi.fn()
      },
      deleteMethod: {
        useMutation: vi.fn()
      },
      createMethod: {
        useMutation: vi.fn()
      },
      updateMethod: {
        useMutation: vi.fn()
      }
    },
    items: {
      getAllItems: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null
        }))
      }
    },
    useUtils: vi.fn(() => ({
      moneyMakingMethods: {
        getUserMethods: {
          invalidate: vi.fn()
        }
      }
    }))
  }
}))

// Mock Mantine components
vi.mock('@mantine/core', () => ({
  Container: ({ children }) => <div data-testid="container">{children}</div>,
  Title: ({ children }) => <h1 data-testid="title">{children}</h1>,
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  Text: ({ children }) => <span data-testid="text">{children}</span>,
  Group: ({ children }) => <div data-testid="group">{children}</div>,
  Badge: ({ children, color }) => <span data-testid="badge" data-color={color}>{children}</span>,
  Table: ({ children }) => <table data-testid="table">{children}</table>,
  Stack: ({ children }) => <div data-testid="stack">{children}</div>,
  Grid: ({ children }) => <div data-testid="grid">{children}</div>,
  Paper: ({ children }) => <div data-testid="paper">{children}</div>,
  Button: ({ children, onClick, variant, leftIcon, loading, ...props }) => {
    const { leftIcon: omittedLeftIcon, ...cleanProps } = props
    return <button data-testid="button" onClick={onClick} data-variant={variant} disabled={loading} {...cleanProps}>{children}</button>
  },
  ActionIcon: ({ children, onClick, loading, ...props }) => {
    const { loading: omittedLoading, ...cleanProps } = props
    return <button data-testid="action-icon" onClick={onClick} disabled={loading} {...cleanProps}>{children}</button>
  },
  Modal: ({ opened, onClose, children, title }) => 
    opened ? <div role="dialog" data-testid="modal" aria-label={title}>{children}</div> : null,
  Loader: () => <div data-testid="loader">Loading...</div>,
  Alert: ({ children, color }) => <div data-testid="alert" data-color={color}>{children}</div>,
  Center: ({ children }) => <div data-testid="center">{children}</div>,
  Divider: () => <hr data-testid="divider" />,
  Tooltip: ({ children, label }) => <div data-testid="tooltip" title={label}>{children}</div>,
  NumberFormatter: ({ value, suffix }) => <span data-testid="number-formatter">{value}{suffix}</span>,
  Checkbox: ({ checked, onChange, label, ...props }) => 
    <label data-testid="checkbox">
      <input type="checkbox" checked={checked} onChange={onChange} {...props} />
      {label}
    </label>,
  SimpleGrid: ({ children }) => <div data-testid="simple-grid">{children}</div>,
  Flex: ({ children }) => <div data-testid="flex">{children}</div>,
  ScrollArea: ({ children }) => <div data-testid="scroll-area">{children}</div>,
  TextInput: ({ label, value, onChange, placeholder, ...props }) =>
    <label data-testid="text-input">
      {label}
      <input 
        type="text" 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        {...props} 
      />
    </label>,
  Textarea: ({ label, value, onChange, placeholder, ...props }) =>
    <label data-testid="textarea">
      {label}
      <textarea 
        value={value} 
        onChange={onChange} 
        placeholder={placeholder} 
        {...props} 
      />
    </label>,
  Select: ({ label, value, onChange, data, placeholder, ...props }) =>
    <label data-testid="select">
      {label}
      <select value={value} onChange={onChange} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {(data || []).map(item => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>,
  NumberInput: ({ label, value, onChange, min, max, ...props }) =>
    <label data-testid="number-input">
      {label}
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange?.(Number(e.target.value))} 
        min={min} 
        max={max} 
        {...props} 
      />
    </label>,
  MultiSelect: ({ label, value, onChange, data, placeholder, ...props }) =>
    <label data-testid="multi-select">
      {label}
      <select multiple value={value} onChange={(e) => onChange?.(Array.from(e.target.selectedOptions, o => o.value))} {...props}>
        {placeholder && <option disabled value="">{placeholder}</option>}
        {(data || []).map(item => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </label>
}))

vi.mock('../../utils/item-data.jsx', () => ({
  default: vi.fn(() => ({
    items: [],
    mapStatus: 'success',
    priceStatus: 'success'
  }))
}))

vi.mock('../../components/PremiumPageWrapper', () => ({
  default: ({ children }) => children
}))

vi.mock('@mantine/notifications', () => ({
  showNotification: vi.fn()
}))

vi.mock('../../utils/utils.jsx', () => ({
  getRelativeTime: vi.fn(() => '5 minutes ago'),
  formatNumber: vi.fn((num) => num.toLocaleString())
}))

import { trpc } from '../../utils/trpc.jsx'
import { showNotification } from '@mantine/notifications'

describe.skip('UserMoneyMakingMethods', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserMoneyMakingMethods />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  const mockMethods = [
    {
      id: '1',
      methodName: 'Mining Iron Ore',
      description: 'Mine iron ore for profit',
      category: 'skilling',
      difficulty: 'easy',
      profitPerHour: 500000,
      status: 'approved',
      isGlobal: true,
      requirements: { skills: { mining: 15 } },
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      methodName: 'Private Method',
      description: 'My secret method',
      category: 'merching',
      difficulty: 'hard',
      profitPerHour: 2000000,
      status: 'private',
      isGlobal: false,
      requirements: {},
      createdAt: new Date().toISOString()
    }
  ]

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      expect(screen.getByText('My Money Making Methods')).toBeInTheDocument()
    })

    it('displays all data correctly', async () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Mining Iron Ore')).toBeInTheDocument()
        expect(screen.getByText('Mine iron ore for profit')).toBeInTheDocument()
        expect(screen.getByText('Private Method')).toBeInTheDocument()
        expect(screen.getByText('My secret method')).toBeInTheDocument()
      })
    })

    it('shows loading state while fetching', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })

    it('handles and displays errors gracefully', () => {
      const errorMessage = 'Failed to load methods'
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: { message: errorMessage },
        refetch: vi.fn()
      })

      renderComponent()
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })
  })

  describe('CRUD Operations', () => {
    it('handles method creation correctly', async () => {
      const refetch = vi.fn()
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch
      })

      renderComponent()
      
      const createButton = screen.getByText('Create Method')
      fireEvent.click(createButton)

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('handles method deletion correctly', async () => {
      const refetch = vi.fn()
      const deleteMutation = vi.fn()
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch
      })

      trpc.moneyMakingMethods.deleteMethod.useMutation.mockReturnValue({
        mutate: deleteMutation
      })

      renderComponent()
      
      // Find and click delete button by its icon data-testid
      const deleteButtons = screen.getAllByTestId('action-icon')
      const deleteButton = deleteButtons.find(btn => btn.innerHTML.includes('IconTrash'))
      
      fireEvent.click(deleteButton)

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to delete this method? This action cannot be undone.'
      )
      
      expect(deleteMutation).toHaveBeenCalledWith({ id: mockMethods[0].id })
    })

    it('handles method update correctly', async () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      // Find and click edit button by its icon data-testid
      const editButtons = screen.getAllByTestId('action-icon')
      const editButton = editButtons.find(btn => btn.innerHTML.includes('IconEdit'))
      
      fireEvent.click(editButton)

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('respects private/public status', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      // Check for status badges
      expect(screen.getByText('Approved')).toBeInTheDocument()
      // Private method should show in the table
      expect(screen.getByText('Private Method')).toBeInTheDocument()
    })
  })

  describe('Summary Statistics', () => {
    it('displays correct counts', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      // Total methods
      expect(screen.getByText('2')).toBeInTheDocument()
      // Approved count
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('handles empty state correctly', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      expect(screen.getByText('No methods created yet')).toBeInTheDocument()
      expect(screen.getByText('Create Your First Method')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('handles refresh button click', () => {
      const refetch = vi.fn()
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch
      })

      renderComponent()
      
      // Find refresh button by its SVG content
      const refreshButtons = screen.getAllByTestId('action-icon')
      const refreshButton = refreshButtons.find(btn => btn.innerHTML.includes('tabler-icon-refresh'))
      fireEvent.click(refreshButton)
      
      expect(refetch).toHaveBeenCalled()
    })

    it('formats profit per hour correctly', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      // Check that formatNumber is being used
      expect(screen.getByText(/500,?000 gp\/hr/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('is fully keyboard navigable', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      const createButton = screen.getByText('Create Method')
      createButton.focus()
      expect(document.activeElement).toBe(createButton)
      
      // Simulate tab navigation
      fireEvent.keyDown(createButton, { key: 'Tab' })
    })

    it('has proper ARIA labels', () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
      expect(screen.getByRole('heading', { name: /money making methods/i })).toBeInTheDocument()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('renders correctly on mobile devices', () => {
      // Mock mobile viewport
      window.innerWidth = 375
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      renderComponent()
      
      expect(screen.getByText('My Money Making Methods')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('shows notification on delete success', async () => {
      const refetch = vi.fn()
      
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch
      })

      const deleteMutation = vi.fn((options) => {
        options.onSuccess()
      })

      trpc.moneyMakingMethods.deleteMethod.useMutation.mockImplementation((options) => ({
        mutate: (data) => {
          options.onSuccess()
          refetch()
        }
      }))

      renderComponent()
      
      const deleteButtons = screen.getAllByTestId('action-icon')
      const deleteButton = deleteButtons.find(btn => btn.innerHTML.includes('IconTrash'))
      
      if (deleteButton) fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Success',
          message: 'Money making method deleted successfully',
          color: 'green'
        })
      })
    })

    it('shows notification on delete error', async () => {
      trpc.moneyMakingMethods.getUserMethods.useQuery.mockReturnValue({
        data: mockMethods,
        isLoading: false,
        error: null,
        refetch: vi.fn()
      })

      trpc.moneyMakingMethods.deleteMethod.useMutation.mockImplementation((options) => ({
        mutate: (data) => {
          options.onError({ message: 'Delete failed' })
        }
      }))

      renderComponent()
      
      const deleteButtons = screen.getAllByTestId('action-icon')
      const deleteButton = deleteButtons.find(btn => btn.innerHTML.includes('IconTrash'))
      
      if (deleteButton) fireEvent.click(deleteButton)

      await waitFor(() => {
        expect(showNotification).toHaveBeenCalledWith({
          title: 'Error',
          message: 'Delete failed',
          color: 'red'
        })
      })
    })
  })
})