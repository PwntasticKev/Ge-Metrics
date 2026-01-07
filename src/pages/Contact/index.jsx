import React, { useState } from 'react'
import { 
  Container, Title, Text, Box, Card, Stack, Group, ThemeIcon, 
  TextInput, Textarea, Button, Select, Anchor, Badge, Alert
} from '@mantine/core'
import { 
  IconMail, IconMessageCircle, IconBrandDiscord, IconArrowLeft, 
  IconCheck, IconInfoCircle, IconSend, IconUser, IconBulb, IconBug
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      subject: '',
      category: 'general',
      message: ''
    },
    validate: {
      name: (value) => value.length < 2 ? 'Name must be at least 2 characters' : null,
      email: (value) => !/^\S+@\S+\.\S+$/.test(value) ? 'Invalid email' : null,
      subject: (value) => value.length < 5 ? 'Subject must be at least 5 characters' : null,
      message: (value) => value.length < 10 ? 'Message must be at least 10 characters' : null,
    },
  })

  const handleSubmit = async (values) => {
    try {
      // Here you would typically send the form data to your backend
      console.log('Contact form submission:', values)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSubmitted(true)
      form.reset()
      
      notifications.show({
        title: 'Message Sent! 🚀',
        message: 'We\'ll get back to you within 24 hours.',
        color: 'green',
        icon: <IconCheck />,
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to send message. Please try again.',
        color: 'red',
      })
    }
  }

  const categoryOptions = [
    { value: 'general', label: '💬 General Question' },
    { value: 'technical', label: '🔧 Technical Issue' },
    { value: 'feature', label: '💡 Feature Request' },
    { value: 'bug', label: '🐛 Bug Report' },
    { value: 'billing', label: '💳 Billing Support' },
    { value: 'partnership', label: '🤝 Partnership Inquiry' }
  ]

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[9]} 100%)
        `,
        padding: 0
      })}
    >
      <Container size="lg" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <Stack spacing="xl">
          {/* Header Card */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(120, 119, 198, 0.2)',
                borderColor: theme.colors.dark[4]
              }
            })}
          >
            <Group position="apart" mb="md">
              <Group spacing="md">
                <ThemeIcon
                  size={50}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: 'violet', to: 'pink' }}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.05)' }
                  }}
                >
                  <IconMail size={26} />
                </ThemeIcon>
                <Box>
                  <Title order={1} style={{ 
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Get in Touch
                  </Title>
                  <Text color="dimmed" size="sm">
                    We'd love to hear from you! Send us a message and we'll respond within 24 hours.
                  </Text>
                </Box>
              </Group>
              <Button
                component={Link}
                to="/all-items"
                variant="subtle"
                leftIcon={<IconArrowLeft size={16} />}
                sx={(theme) => ({
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.colors.dark[5],
                    transform: 'translateX(-2px)',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)'
                  }
                })}
              >
                Back
              </Button>
            </Group>
            <Group spacing="xs">
              <Badge variant="dot" color="violet" size="sm">Super Responsive</Badge>
              <Badge variant="dot" color="pink" size="sm">Friendly Team</Badge>
              <Badge variant="dot" color="blue" size="sm">24hr Response</Badge>
            </Group>
          </Card>

          <Group align="flex-start" spacing="xl">
            {/* Contact Form */}
            <Box style={{ flex: 2 }}>
              <Card
                padding="xl"
                radius="lg"
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                  border: `1px solid ${theme.colors.dark[5]}`,
                  transition: 'all 0.2s ease-out',
                  '&:hover': {
                    boxShadow: '0 8px 32px rgba(120, 219, 255, 0.15)',
                    borderColor: theme.colors.dark[4]
                  }
                })}
              >
                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack spacing="md">
                    <Group grow>
                      <TextInput
                        label="Your Name"
                        placeholder="John Doe"
                        icon={<IconUser size={16} />}
                        {...form.getInputProps('name')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#8b5cf6',
                              boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)'
                            }
                          }
                        })}
                      />
                      <TextInput
                        label="Email Address"
                        placeholder="john@example.com"
                        icon={<IconMail size={16} />}
                        {...form.getInputProps('email')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#8b5cf6',
                              boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)'
                            }
                          }
                        })}
                      />
                    </Group>

                    <Select
                      label="Category"
                      placeholder="What's this about?"
                      data={categoryOptions}
                      {...form.getInputProps('category')}
                      styles={(theme) => ({
                        input: {
                          background: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[5]}`,
                          '&:focus': {
                            borderColor: '#8b5cf6',
                            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)'
                          }
                        },
                        item: {
                          '&[data-selected]': {
                            backgroundColor: '#8b5cf6',
                          }
                        }
                      })}
                    />

                    <TextInput
                      label="Subject"
                      placeholder="Brief description of your message"
                      icon={<IconMessageCircle size={16} />}
                      {...form.getInputProps('subject')}
                      styles={(theme) => ({
                        input: {
                          background: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[5]}`,
                          '&:focus': {
                            borderColor: '#8b5cf6',
                            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)'
                          }
                        }
                      })}
                    />

                    <Textarea
                      label="Message"
                      placeholder="Tell us more about how we can help you..."
                      minRows={6}
                      {...form.getInputProps('message')}
                      styles={(theme) => ({
                        input: {
                          background: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[5]}`,
                          '&:focus': {
                            borderColor: '#8b5cf6',
                            boxShadow: '0 0 0 2px rgba(139, 92, 246, 0.2)'
                          }
                        }
                      })}
                    />

                    <Button
                      type="submit"
                      size="md"
                      leftIcon={<IconSend size={16} />}
                      variant="gradient"
                      gradient={{ from: 'violet', to: 'pink' }}
                      sx={{
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.4)'
                        }
                      }}
                    >
                      Send Message
                    </Button>
                  </Stack>
                </form>
              </Card>
            </Box>

            {/* Quick Contact & Info */}
            <Box style={{ flex: 1 }}>
              <Stack spacing="md">
                {/* Discord Card */}
                <Card
                  padding="lg"
                  radius="lg"
                  sx={(theme) => ({
                    background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                    border: `1px solid ${theme.colors.dark[5]}`,
                    transition: 'all 0.2s ease-out',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 8px 32px rgba(114, 137, 218, 0.3)',
                      borderColor: '#7289da',
                      transform: 'translateY(-2px)'
                    }
                  })}
                  onClick={() => window.open('https://discord.gg/BdDfzg4ZMQ', '_blank')}
                >
                  <Group spacing="md" noWrap>
                    <ThemeIcon
                      size={40}
                      radius="md"
                      sx={{
                        backgroundColor: '#7289da',
                        '&:hover': { transform: 'scale(1.1)' }
                      }}
                    >
                      <IconBrandDiscord size={20} />
                    </ThemeIcon>
                    <div>
                      <Text weight={600} size="sm" color="white">Join our Discord</Text>
                      <Text size="xs" color="dimmed">Get instant help from our community</Text>
                    </div>
                  </Group>
                </Card>

                {/* Response Time Info */}
                <Alert
                  icon={<IconInfoCircle size={16} />}
                  title="Quick Response"
                  color="blue"
                  variant="outline"
                  styles={(theme) => ({
                    root: {
                      background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                      border: `1px solid ${theme.colors.blue[8]}`,
                    }
                  })}
                >
                  <Text size="sm">
                    We typically respond within <Text component="span" weight={600} color="blue">2-4 hours</Text> during business hours,
                    and within <Text component="span" weight={600} color="blue">24 hours</Text> on weekends.
                  </Text>
                </Alert>

                {/* Contact Tips */}
                <Card
                  padding="lg"
                  radius="lg"
                  sx={(theme) => ({
                    background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                    border: `1px solid ${theme.colors.dark[5]}`,
                  })}
                >
                  <Stack spacing="sm">
                    <Group spacing="xs">
                      <IconBulb size={16} color="#f59e0b" />
                      <Text weight={600} size="sm" color="orange">Pro Tips</Text>
                    </Group>
                    <Text size="xs" color="dimmed">
                      • Include screenshots for technical issues
                    </Text>
                    <Text size="xs" color="dimmed">
                      • Mention your account email for billing questions
                    </Text>
                    <Text size="xs" color="dimmed">
                      • Be specific about what you're trying to achieve
                    </Text>
                  </Stack>
                </Card>
              </Stack>
            </Box>
          </Group>

          {/* Success Message */}
          {submitted && (
            <Alert
              icon={<IconCheck size={16} />}
              title="Message Sent Successfully!"
              color="green"
              variant="outline"
              styles={(theme) => ({
                root: {
                  background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                  border: `1px solid ${theme.colors.green[8]}`,
                }
              })}
            >
              <Text>
                Thanks for reaching out! We've received your message and will get back to you soon. 
                Check our <Anchor component={Link} to="/" color="green">Discord</Anchor> for immediate community support.
              </Text>
            </Alert>
          )}
        </Stack>
      </Container>
    </Box>
  )
}