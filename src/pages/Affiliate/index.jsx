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
        backgroundColor: theme.colors.dark[8],
        padding: 0
      })}
    >
      <Container size="xl" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <Stack spacing="xl">
          {/* Header */}
          <Card
            padding="lg"
            radius="md"
            sx={(theme) => ({
              backgroundColor: theme.colors.dark[7],
              border: `1px solid ${theme.colors.dark[3]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                backgroundColor: theme.colors.dark[6]
              }
            })}
          >
            <Group position="apart" align="center">
              <Box>
                <Group spacing="md" align="center">
                  <IconRocket size={24} color="#228be6" />
                  <Title order={1} color="white">
                    Partner with GE-Metrics
                  </Title>
                </Group>
                <Text color="dimmed" size="sm" mt="xs">
                  Join our creator program and earn commission on referrals
                </Text>
              </Box>
              <Button
                component={Link}
                to="/all-items"
                variant="subtle"
                leftIcon={<IconArrowLeft size={16} />}
                color="gray"
              >
                Back
              </Button>
            </Group>
          </Card>

          {/* Benefits */}
          <Card
            padding="lg"
            radius="md"
            sx={(theme) => ({
              backgroundColor: theme.colors.dark[7],
              border: `1px solid ${theme.colors.dark[3]}`
            })}
          >
            <Group spacing="xs" mb="lg">
              <IconTarget size={20} color="#228be6" />
              <Title order={2} color="white">Partner Benefits</Title>
            </Group>

            <SimpleGrid cols={2} spacing="lg" breakpoints={[{ maxWidth: 'md', cols: 1 }]}>
              {benefits.map((benefit, index) => (
                <Box
                  key={index}
                  p="md"
                  sx={(theme) => ({
                    backgroundColor: theme.colors.dark[6],
                    borderRadius: theme.radius.sm,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: theme.colors.dark[5]
                    }
                  })}
                >
                  <Group spacing="md" noWrap>
                    <benefit.icon size={20} color="#228be6" />
                    <Box style={{ flex: 1 }}>
                      <Text weight={600} size="sm" color="white" mb="xs">
                        {benefit.title}
                      </Text>
                      <Text size="xs" color="dimmed">
                        {benefit.description}
                      </Text>
                    </Box>
                  </Group>
                </Box>
              ))}
            </SimpleGrid>
          </Card>

          <Grid>
            {/* Application Form */}
            <Grid.Col span={8}>
              <Card
                padding="lg"
                radius="md"
                sx={(theme) => ({
                  backgroundColor: theme.colors.dark[7],
                  border: `1px solid ${theme.colors.dark[3]}`
                })}
              >
                <Group spacing="xs" mb="lg">
                  <IconUserCheck size={20} color="#228be6" />
                  <Title order={2} color="white">Apply to Become a Partner</Title>
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
                              borderColor: '#228be6',
                              boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)'
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
                              borderColor: '#228be6',
                              boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)'
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
                              borderColor: '#228be6',
                              boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)'
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
                              borderColor: '#228be6',
                              boxShadow: '0 0 0 2px rgba(34, 139, 230, 0.2)'
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
                      size="md"
                      leftIcon={<IconSend size={16} />}
                      color="blue"
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
                  radius="md"
                  sx={(theme) => ({
                    backgroundColor: theme.colors.dark[7],
                    border: `1px solid ${theme.colors.dark[3]}`
                  })}
                >
                  <Group spacing="xs" mb="md">
                    <IconUsers size={16} color="#228be6" />
                    <Text weight={600} size="sm" color="white">Our Partners</Text>
                  </Group>
                  <Stack spacing="xs">
                    {partners.map((partner, index) => (
                      <Box
                        key={index}
                        p="xs"
                        sx={(theme) => ({
                          backgroundColor: theme.colors.dark[6],
                          borderRadius: theme.radius.sm,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: theme.colors.dark[5]
                          }
                        })}
                      >
                        <Text size="xs" weight={600} color="white">{partner.name}</Text>
                        <Group spacing="xs" mt={2}>
                          <Text size="xs" color="dimmed">{partner.platform}</Text>
                          <Text size="xs" color="dimmed">•</Text>
                          <Text size="xs" color="dimmed">{partner.followers}</Text>
                        </Group>
                        <Text size="xs" color="dimmed" mt={2}>{partner.specialty}</Text>
                      </Box>
                    ))}
                  </Stack>
                </Card>

                {/* Platform Stats */}
                <Card
                  padding="lg"
                  radius="md"
                  sx={(theme) => ({
                    backgroundColor: theme.colors.dark[7],
                    border: `1px solid ${theme.colors.dark[3]}`
                  })}
                >
                  <Group spacing="xs" mb="md">
                    <IconTrendingUp size={16} color="#228be6" />
                    <Text weight={600} size="sm" color="white">Platform Stats</Text>
                  </Group>
                  <Stack spacing="xs">
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Active Users</Text>
                      <Text size="xs" weight={600} color="white">2,500+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Premium Members</Text>
                      <Text size="xs" weight={600} color="white">380+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Items Tracked</Text>
                      <Text size="xs" weight={600} color="white">4,300+</Text>
                    </Group>
                    <Group position="apart">
                      <Text size="xs" color="dimmed">Data Updates</Text>
                      <Text size="xs" weight={600} color="white">Real-time</Text>
                    </Group>
                  </Stack>
                </Card>

                {/* Contact for Questions */}
                <Card
                  padding="lg"
                  radius="md"
                  sx={(theme) => ({
                    backgroundColor: theme.colors.dark[7],
                    border: `1px solid ${theme.colors.dark[3]}`
                  })}
                >
                  <Group spacing="xs" mb="xs">
                    <IconMail size={16} color="#228be6" />
                    <Text weight={600} size="sm" color="white">Questions?</Text>
                  </Group>
                  <Text size="xs" color="dimmed">
                    Need help with your application? <Anchor component={Link} to="/contact" color="#228be6">Contact us</Anchor> or join our <Anchor href="https://discord.gg/BdDfzg4ZMQ" target="_blank" color="#228be6">Discord</Anchor>.
                  </Text>
                </Card>
              </Stack>
            </Grid.Col>
          </Grid>

          {/* Success Message */}
          {submitted && (
            <Card
              padding="lg"
              radius="md"
              sx={(theme) => ({
                backgroundColor: theme.colors.dark[7],
                border: `1px solid ${theme.colors.dark[3]}`
              })}
            >
              <Group spacing="xs" mb="xs">
                <IconCheck size={16} color="#228be6" />
                <Text weight={600} size="sm" color="white">Application Submitted Successfully!</Text>
              </Group>
              <Text size="sm" color="dimmed">
                Thank you for your interest in partnering with GE-Metrics! We'll review your application and 
                get back to you within 48 hours. Keep an eye on your email for next steps.
              </Text>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  )
}