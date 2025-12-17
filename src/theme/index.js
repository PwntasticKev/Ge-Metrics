import { MantineProvider } from '@mantine/core'

// WCAG AA compliant color palette
export const accessibleColors = {
  // Primary brand colors
  primary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main brand color
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12'
  },

  // Success colors (green)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Main success
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d'
  },

  // Error colors (red)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Main error
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d'
  },

  // Warning colors (yellow/orange)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main warning
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f'
  },

  // Info colors (blue)
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Main info
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  },

  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717'
  },

  // Purple color
  purple: [
    '#f5f3ff', // 50
    '#ede9fe', // 100
    '#ddd6fe', // 200
    '#c4b5fd', // 300
    '#a78bfa', // 400
    '#8b5cf6', // 500
    '#7c3aed', // 600
    '#6d28d9', // 700
    '#5b21b6', // 800
    '#4c1d95' // 900
  ]
}

// Dark theme configuration
export const darkTheme = {
  colorScheme: 'dark',
  colors: {
    // Override default Mantine colors with accessible ones
    orange: [
      accessibleColors.primary[50],
      accessibleColors.primary[100],
      accessibleColors.primary[200],
      accessibleColors.primary[300],
      accessibleColors.primary[400],
      accessibleColors.primary[500],
      accessibleColors.primary[600],
      accessibleColors.primary[700],
      accessibleColors.primary[800],
      accessibleColors.primary[900]
    ],
    green: [
      accessibleColors.success[50],
      accessibleColors.success[100],
      accessibleColors.success[200],
      accessibleColors.success[300],
      accessibleColors.success[400],
      accessibleColors.success[500],
      accessibleColors.success[600],
      accessibleColors.success[700],
      accessibleColors.success[800],
      accessibleColors.success[900]
    ],
    red: [
      accessibleColors.error[50],
      accessibleColors.error[100],
      accessibleColors.error[200],
      accessibleColors.error[300],
      accessibleColors.error[400],
      accessibleColors.error[500],
      accessibleColors.error[600],
      accessibleColors.error[700],
      accessibleColors.error[800],
      accessibleColors.error[900]
    ],
    yellow: [
      accessibleColors.warning[50],
      accessibleColors.warning[100],
      accessibleColors.warning[200],
      accessibleColors.warning[300],
      accessibleColors.warning[400],
      accessibleColors.warning[500],
      accessibleColors.warning[600],
      accessibleColors.warning[700],
      accessibleColors.warning[800],
      accessibleColors.warning[900]
    ],
    blue: [
      accessibleColors.info[50],
      accessibleColors.info[100],
      accessibleColors.info[200],
      accessibleColors.info[300],
      accessibleColors.info[400],
      accessibleColors.info[500],
      accessibleColors.info[600],
      accessibleColors.info[700],
      accessibleColors.info[800],
      accessibleColors.info[900]
    ],
    gray: [
      accessibleColors.neutral[50],
      accessibleColors.neutral[100],
      accessibleColors.neutral[200],
      accessibleColors.neutral[300],
      accessibleColors.neutral[400],
      accessibleColors.neutral[500],
      accessibleColors.neutral[600],
      accessibleColors.neutral[700],
      accessibleColors.neutral[800],
      accessibleColors.neutral[900]
    ],
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113'
    ],
    purple: [
      '#f5f3ff', // 50
      '#ede9fe', // 100
      '#ddd6fe', // 200
      '#c4b5fd', // 300
      '#a78bfa', // 400
      '#8b5cf6', // 500
      '#7c3aed', // 600
      '#6d28d9', // 700
      '#5b21b6', // 800
      '#4c1d95' // 900
    ]
  },

  primaryColor: 'orange',
  primaryShade: { light: 6, dark: 4 },

  // Typography with better readability
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',

  headings: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: 600,
    sizes: {
      h1: { fontSize: '2.125rem', lineHeight: 1.3 },
      h2: { fontSize: '1.625rem', lineHeight: 1.35 },
      h3: { fontSize: '1.375rem', lineHeight: 1.4 },
      h4: { fontSize: '1.125rem', lineHeight: 1.45 },
      h5: { fontSize: '1rem', lineHeight: 1.5 },
      h6: { fontSize: '0.875rem', lineHeight: 1.5 }
    }
  },

  // Component-specific theme overrides with global hover effects
  components: {
    Button: {
      styles: (theme) => ({
        root: {
          fontWeight: 500,
          transition: 'box-shadow 0.2s ease-out, background-color 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          },
          '&:focus': {
            outline: `2px solid ${theme.colors.blue[4]}`,
            outlineOffset: '2px'
          }
        }
      })
    },

    Card: {
      styles: (theme) => ({
        root: {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
          borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3],
          transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.2)',
            borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[4]
          }
        }
      })
    },

    Badge: {
      styles: (theme) => ({
        root: {
          fontWeight: 500,
          textTransform: 'none',
          transition: 'box-shadow 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }
        }
      })
    },

    Table: {
      styles: (theme) => ({
        root: {
          '& th': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
            color: theme.colorScheme === 'dark' ? theme.colors.gray[2] : theme.colors.gray[7],
            fontWeight: 600,
            borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[3]}`,
            transition: 'background-color 0.2s ease-out',
            '&:hover': {
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
            }
          },
          '& td': {
            borderBottom: `1px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]}`,
            transition: 'background-color 0.2s ease-out'
          },
          '& tr': {
            transition: 'background-color 0.2s ease-out',
            '&:hover': {
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
            }
          }
        }
      })
    },

    Input: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        }
      })
    },

    TextInput: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        }
      })
    },

    PasswordInput: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        }
      })
    },

    NumberInput: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        }
      })
    },

    Textarea: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        }
      })
    },

    Select: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        },
        item: {
          transition: 'background-color 0.2s ease-out, transform 0.2s ease-out',
          '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
            transform: 'translateX(4px)'
          }
        }
      })
    },

    Autocomplete: {
      styles: (theme) => ({
        input: {
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            borderColor: '#228be6',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]
          },
          '&:focus': {
            borderColor: '#ffd700',
            boxShadow: '0 0 0 2px rgba(255, 215, 0, 0.2)',
            outline: 'none'
          }
        },
        item: {
          transition: 'background-color 0.2s ease-out, transform 0.2s ease-out',
          '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
            transform: 'translateX(4px)'
          }
        }
      })
    },

    Checkbox: {
      styles: (theme) => ({
        input: {
          transition: 'box-shadow 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }
        }
      })
    },

    Switch: {
      styles: (theme) => ({
        input: {
          transition: 'background-color 0.2s ease-out'
        }
      })
    },

    ActionIcon: {
      styles: (theme) => ({
        root: {
          transition: 'box-shadow 0.2s ease-out, background-color 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
          }
        }
      })
    },

    Menu: {
      styles: (theme) => ({
        item: {
          transition: 'background-color 0.2s ease-out',
          position: 'relative',
          '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              backgroundColor: '#667eea',
              borderRadius: '0 2px 2px 0'
            }
          }
        }
      })
    },

    Pagination: {
      styles: (theme) => ({
        control: {
          transition: 'box-shadow 0.2s ease-out, background-color 0.2s ease-out',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          },
          '&[data-active]': {
            backgroundColor: theme.colors.blue[6],
            '&:hover': {
              backgroundColor: theme.colors.blue[7]
            }
          }
        }
      })
    },

    Tabs: {
      styles: (theme) => ({
        tab: {
          transition: 'color 0.2s ease-out, border-color 0.2s ease-out',
          '&:hover': {
            color: theme.colors.blue[4]
          },
          '&:focus': {
            outline: `2px solid ${theme.colors.blue[4]}`,
            outlineOffset: '2px'
          },
          '&[data-active]': {
            borderBottomColor: theme.colors.orange[4],
            color: theme.colors.orange[4]
          }
        }
      })
    },

    Modal: {
      styles: (theme) => ({
        content: {
          transition: 'transform 0.2s ease-out, opacity 0.2s ease-out'
        },
        header: {
          transition: 'background-color 0.2s ease-out'
        }
      }),
      defaultProps: {
        transitionProps: {
          transition: 'pop',
          duration: 200
        },
        overlayProps: {
          blur: 3,
          opacity: 0.55
        }
      }
    },

    CloseButton: {
      styles: (theme) => ({
        root: {
          transition: 'background-color 0.2s ease-out, box-shadow 0.2s ease-out, transform 0.2s ease-out',
          '&:hover': {
            transform: 'rotate(90deg)',
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
          }
        }
      })
    }
  },

  // Better spacing system
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem'
  },

  // Improved radius system
  radius: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem'
  },

  // Shadow system for depth
  shadows: {
    xs: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.2)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  }
}

// Light theme configuration
export const lightTheme = {
  ...darkTheme,
  colorScheme: 'light',
  colors: {
    ...darkTheme.colors,
    dark: [
      '#ffffff',
      '#f8f9fa',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529'
    ]
  }
}

// Theme context and provider
export const getTheme = (colorScheme = 'dark') => {
  return colorScheme === 'dark' ? darkTheme : lightTheme
}
