import React, { useState } from 'react'
import { 
  Container, Title, Text, Box, Card, Stack, Group, ThemeIcon, 
  Button, Badge, Grid, Anchor, TextInput, Textarea, NumberInput,
  Select, Alert, Image, SimpleGrid, Center, Divider
} from '@mantine/core'
import { 
  IconRocket, IconUsers, IconTrendingUp, IconArrowLeft, IconMail, 
  IconBrandYoutube, IconBrandTwitch, IconBrandDiscord, IconCoins, 
  IconCrown, IconStar, IconUserCheck, IconGift, IconCheck, IconSend,
  IconSparkles, IconTarget, IconChartBar
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'

export default function Affiliate() {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      platform: 'youtube',
      channelLink: '',
      followers: '',
      motivation: '',
      audience: ''
    },
    validate: {
      name: (value) => value.length < 2 ? 'Name must be at least 2 characters' : null,
      email: (value) => !/^\S+@\S+\.\S+$/.test(value) ? 'Invalid email' : null,
      channelLink: (value) => !value.startsWith('http') ? 'Please enter a valid URL' : null,
      motivation: (value) => value.length < 20 ? 'Please tell us more (at least 20 characters)' : null,
    },
  })

  const handleSubmit = async (values) => {
    try {
      console.log('Partnership application:', values)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSubmitted(true)
      form.reset()
      
      notifications.show({
        title: 'Application Submitted! 🎉',
        message: 'We\'ll review your application and get back to you within 48 hours.',
        color: 'green',
        icon: <IconCheck />,
      })
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to submit application. Please try again.',
        color: 'red',
      })
    }
  }

  const platformOptions = [
    { value: 'youtube', label: '📺 YouTube' },
    { value: 'twitch', label: '🟣 Twitch' },
    { value: 'discord', label: '💬 Discord Server' },
    { value: 'website', label: '🌐 Website/Blog' },
    { value: 'other', label: '🎯 Other Platform' }
  ]

  const audienceOptions = [
    { value: 'under-1k', label: 'Under 1,000' },
    { value: '1k-5k', label: '1,000 - 5,000' },
    { value: '5k-20k', label: '5,000 - 20,000' },
    { value: '20k-100k', label: '20,000 - 100,000' },
    { value: '100k+', label: '100,000+' }
  ]

  const benefits = [
    {
      icon: IconCoins,
      title: 'Earn Commission',
      description: '25-35% commission on all premium subscriptions from your referrals',
      color: 'orange'
    },
    {
      icon: IconGift,
      title: 'Milestone Bonuses',
      description: 'Unlock special bonuses at 10, 50, and 100 successful referrals',
      color: 'violet'
    },
    {
      icon: IconCrown,
      title: 'Premium Access',
      description: 'Free premium account for yourself and exclusive partner features',
      color: 'yellow'
    },
    {
      icon: IconChartBar,
      title: 'Real-time Analytics',
      description: 'Track your referrals, earnings, and performance with detailed stats',
      color: 'blue'
    }
  ]

  const partners = [
    { name: 'OSRS Content Creator', platform: 'YouTube', followers: '15K', specialty: 'PVM Guides' },
    { name: 'FlipMaster Discord', platform: 'Discord', followers: '8K', specialty: 'Trading Community' },
    { name: 'GP Hunter Stream', platform: 'Twitch', followers: '3K', specialty: 'Live Trading' },
    { name: 'RuneScape Analytics', platform: 'Website', followers: '25K', specialty: 'Market Analysis' }
  ]

  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.08) 0%, transparent 50%),
          linear-gradient(135deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[9]} 100%)
        `,
        padding: 0
      })}
    >
      <Container size="xl" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <Stack spacing="xl">
          {/* Hero Header */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[6]} 0%, ${theme.colors.dark[7]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                boxShadow: '0 12px 40px rgba(255, 215, 0, 0.2)',
                borderColor: theme.colors.dark[4]
              }
            })}
          >
            <Group position="apart" mb="lg">
              <Group spacing="md">
                <ThemeIcon
                  size={60}
                  radius="md"
                  variant="gradient"
                  gradient={{ from: 'orange', to: 'red' }}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.05) rotate(5deg)' }
                  }}
                >
                  <IconRocket size={32} />
                </ThemeIcon>
                <Box>
                  <Title order={1} style={{ 
                    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '2.5rem'
                  }}>
                    Partner with GE-Metrics
                  </Title>
                  <Text size="lg" color="dimmed" mt="xs">
                    Join our creator program and earn while helping the OSRS community make smarter trades
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
                    transform: 'translateX(-4px)',
                    boxShadow: '0 4px 16px rgba(255, 140, 0, 0.3)'
                  }
                })}
              >
                Back to App
              </Button>
            </Group>

            <Group spacing="xs">
              <Badge 
                variant="gradient" 
                gradient={{ from: 'orange', to: 'red' }} 
                size="lg"
                leftSection={<IconSparkles size={14} />}
              >
                Earn Real Money
              </Badge>
              <Badge variant="dot" color="green" size="md">Growing Platform</Badge>
              <Badge variant="dot" color="blue" size="md">Active Community</Badge>
              <Badge variant="dot" color="violet" size="md">Fair Commissions</Badge>
            </Group>
          </Card>

          {/* Benefits Section */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
            })}
          >
            <Group mb="xl" spacing="md">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'violet', to: 'pink' }}>
                <IconTarget size={20} />
              </ThemeIcon>
              <Title order={2} style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Why Partner with Us?
              </Title>
            </Group>

            <SimpleGrid cols={2} spacing="xl" breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
              {benefits.map((benefit, index) => (
                <Card
                  key={index}
                  padding="lg"
                  radius="md"
                  sx={(theme) => ({
                    background: theme.colors.dark[6],
                    border: `1px solid ${theme.colors.dark[4]}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(139, 92, 246, 0.15)',
                      borderColor: theme.colors[benefit.color][6]
                    }
                  })}
                >
                  <Group spacing="md" noWrap>
                    <ThemeIcon
                      size={50}
                      radius="md"
                      color={benefit.color}
                      variant="light"
                    >
                      <benefit.icon size={26} />
                    </ThemeIcon>
                    <Box style={{ flex: 1 }}>
                      <Text weight={600} size="lg" color="white" mb="xs">
                        {benefit.title}
                      </Text>
                      <Text size="sm" color="dimmed">
                        {benefit.description}
                      </Text>
                    </Box>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Card>

          <Grid>
            {/* Application Form */}
            <Grid.Col span={8}>
              <Card
                padding="xl"
                radius="lg"
                sx={(theme) => ({
                  background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                  border: `1px solid ${theme.colors.dark[5]}`,
                  transition: 'all 0.2s ease-out',
                  '&:hover': {
                    boxShadow: '0 8px 32px rgba(120, 219, 255, 0.15)',
                  }
                })}
              >
                <Group mb="xl" spacing="md">
                  <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'cyan' }}>
                    <IconUserCheck size={20} />
                  </ThemeIcon>
                  <Title order={2} color="blue.4">Apply to Become a Partner</Title>
                </Group>

                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack spacing="md">
                    <Group grow>
                      <TextInput
                        label="Your Name"
                        placeholder="Content Creator Name"
                        {...form.getInputProps('name')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#3b82f6',
                              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                            }
                          }
                        })}
                      />
                      <TextInput
                        label="Email Address"
                        placeholder="your@email.com"
                        {...form.getInputProps('email')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#3b82f6',
                              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                            }
                          }
                        })}
                      />
                    </Group>

                    <Group grow>
                      <Select
                        label="Primary Platform"
                        placeholder="Where do you create content?"
                        data={platformOptions}
                        {...form.getInputProps('platform')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#3b82f6',
                              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                            }
                          }
                        })}
                      />
                      <Select
                        label="Audience Size"
                        placeholder="How many followers/subscribers?"
                        data={audienceOptions}
                        {...form.getInputProps('audience')}
                        styles={(theme) => ({
                          input: {
                            background: theme.colors.dark[6],
                            border: `1px solid ${theme.colors.dark[5]}`,
                            '&:focus': {
                              borderColor: '#3b82f6',
                              boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                            }
                          }
                        })}
                      />
                    </Group>

                    <TextInput
                      label="Channel/Platform Link"
                      placeholder="https://youtube.com/c/yourchannel"
                      {...form.getInputProps('channelLink')}
                      styles={(theme) => ({
                        input: {
                          background: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[5]}`,
                          '&:focus': {
                            borderColor: '#3b82f6',
                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                          }
                        }
                      })}
                    />

                    <Textarea
                      label="Why do you want to partner with us?"
                      placeholder="Tell us about your content, audience, and how you'd promote GE-Metrics..."
                      minRows={4}
                      {...form.getInputProps('motivation')}
                      styles={(theme) => ({
                        input: {
                          background: theme.colors.dark[6],
                          border: `1px solid ${theme.colors.dark[5]}`,
                          '&:focus': {
                            borderColor: '#3b82f6',
                            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
                          }
                        }
                      })}
                    />

                    <Button
                      type="submit"
                      size="lg"
                      leftIcon={<IconSend size={18} />}
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'cyan' }}
                      sx={{
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
                        }
                      }}
                    >
                      Submit Partnership Application
                    </Button>
                  </Stack>
                </form>
              </Card>
            </Grid.Col>

            {/* Current Partners & Info */}
            <Grid.Col span={4}>
              <Stack spacing="md">
                {/* Current Partners */}
                <Card
                  padding="lg"
                  radius="lg"
                  sx={(theme) => ({
                    background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                    border: `1px solid ${theme.colors.dark[5]}`,
                  })}
                >
                  <Group mb="md" spacing="sm">
                    <IconUsers size={20} color="#8b5cf6" />
                    <Text weight={600} color="violet.4">Our Partners</Text>
                  </Group>
                  <Stack spacing="sm">
                    {partners.map((partner, index) => (
                      <Box
                        key={index}
                        p="xs"
                        sx={(theme) => ({
                          background: theme.colors.dark[6],
                          borderRadius: theme.radius.sm,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: theme.colors.dark[5],
                            transform: 'translateX(4px)'
                          }
                        })}
                      >
                        <Text size="sm" weight={600} color="white">{partner.name}</Text>
                        <Group spacing="xs" mt={2}>
                          <Badge size="xs" color="blue">{partner.platform}</Badge>
                          <Badge size="xs" color="orange">{partner.followers}</Badge>
                        </Group>
                        <Text size="xs" color="dimmed" mt={2}>{partner.specialty}</Text>
                      </Box>
                    ))}
                  </Stack>
                </Card>

                {/* Quick Stats */}
                <Card
                  padding="lg"
                  radius="lg"
                  sx={(theme) => ({
                    background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
                    border: `1px solid ${theme.colors.dark[5]}`,
                  })}
                >
                  <Group mb="md" spacing="sm">
                    <IconTrendingUp size={20} color="#10b981" />
                    <Text weight={600} color="green.4">Platform Stats</Text>
                  </Group>
                  <Stack spacing="xs">
                    <Group position="apart">
                      <Text size="sm" color="dimmed">Active Users</Text>
                      <Text size="sm" weight={600} color="white">2,500+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="sm" color="dimmed">Premium Members</Text>
                      <Text size="sm" weight={600} color="white">380+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="sm" color="dimmed">Items Tracked</Text>
                      <Text size="sm" weight={600} color="white">4,300+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="sm" color="dimmed">Data Updates</Text>
                      <Text size="sm" weight={600} color="green">Real-time</Text>
                    </Group>
                  </Stack>
                </Card>

                {/* Contact for Questions */}
                <Alert
                  icon={<IconMail size={16} />}
                  title="Questions?"
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
                    Need help with your application? 
                    <Anchor component={Link} to="/contact" color="blue" ml={4}>
                      Contact us
                    </Anchor> or join our <Anchor href="https://discord.gg/BdDfzg4ZMQ" target="_blank" color="blue">Discord</Anchor>.
                  </Text>
                </Alert>
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Success Message */}
          {submitted && (
            <Alert
              icon={<IconCheck size={16} />}
              title="Application Submitted Successfully! 🎉"
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
                Thank you for your interest in partnering with GE-Metrics! We'll review your application and 
                get back to you within 48 hours. Keep an eye on your email for next steps.
              </Text>
            </Alert>
          )}
        </Stack>
      </Container>
    </Box>
  )
}