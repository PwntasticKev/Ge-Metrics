import React from 'react'
import { Container, Title, Text, Box, Divider, List, Anchor, Stack, Card, Group, ThemeIcon, Badge, ActionIcon } from '@mantine/core'
import { IconScale, IconShield, IconArrowLeft, IconExternalLink } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

export default function TermsAndConditions() {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.colors.dark[8]} 0%, ${theme.colors.dark[9]} 100%)`,
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
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)',
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
                  gradient={{ from: 'blue', to: 'cyan' }}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.05)' }
                  }}
                >
                  <IconScale size={26} />
                </ThemeIcon>
                <Box>
                  <Title order={1} style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Terms & Privacy Policy
                  </Title>
                  <Text color="dimmed" size="sm">
                    Last updated: {new Date().toLocaleDateString()}
                  </Text>
                </Box>
              </Group>
              <ActionIcon
                component={Link}
                to="/all-items"
                variant="subtle"
                size="lg"
                sx={(theme) => ({
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: theme.colors.dark[5],
                    transform: 'scale(1.1)',
                    boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
                  }
                })}
              >
                <IconArrowLeft size={20} />
              </ActionIcon>
            </Group>
            <Group spacing="xs">
              <Badge variant="dot" color="green" size="sm">Legal Protection</Badge>
              <Badge variant="dot" color="blue" size="sm">Data Privacy</Badge>
              <Badge variant="dot" color="orange" size="sm">User Rights</Badge>
            </Group>
          </Card>

          {/* Terms of Service Card */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                borderColor: theme.colors.dark[4]
              }
            })}
          >
            <Group mb="xl" spacing="md">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'orange', to: 'red' }}>
                <IconScale size={20} />
              </ThemeIcon>
              <Title order={2} style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Terms of Service
              </Title>
            </Group>
            
            <Stack spacing="lg">
              <Box>
                <Title order={3} mb="sm" color="blue.4">1. Acceptance of Terms</Title>
                <Text mb="md" color="gray.3">
                  By accessing and using GE-Metrics, you accept and agree to be bound by these terms 
                  and conditions. If you do not agree to these terms, please do not use our service.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">2. User Accounts</Title>
                <List mb="md" sx={{ '& li': { marginBottom: '8px', color: '#C1C2C5' } }}>
                  <List.Item>You are limited to one account per person</List.Item>
                  <List.Item>You must be at least 16 years of age to create an account</List.Item>
                  <List.Item>You are responsible for maintaining the security of your account</List.Item>
                  <List.Item>You must provide accurate and complete information</List.Item>
                </List>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">3. Prohibited Activities</Title>
                <List mb="md" sx={{ '& li': { marginBottom: '8px', color: '#C1C2C5' } }}>
                  <List.Item>Using automated tools, robots, spiders, or scrapers to extract data</List.Item>
                  <List.Item>Creating competing services using our API or data</List.Item>
                  <List.Item>Attempting to reverse engineer or disassemble our software</List.Item>
                  <List.Item>Violating any applicable laws or regulations</List.Item>
                  <List.Item>Sharing account credentials with others</List.Item>
                </List>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">4. Intellectual Property</Title>
                <Text mb="md" color="gray.3">
                  All content, including text, graphics, logos, icons, images, software, and data 
                  compilations is the property of GE-Metrics or its licensors and is protected by 
                  copyright and other intellectual property laws.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">5. Service Availability</Title>
                <Text mb="md" color="gray.3">
                  We strive to maintain service availability but do not guarantee uninterrupted access. 
                  We reserve the right to modify, suspend, or discontinue services at any time.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">6. Data Accuracy</Title>
                <Text mb="md" color="gray.3">
                  While we strive to provide accurate Old School RuneScape market data, we cannot 
                  guarantee the completeness or accuracy of all information. Use data at your own discretion.
                </Text>
              </Box>
            </Stack>
          </Card>

          {/* Privacy Policy Card */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                borderColor: theme.colors.dark[4]
              }
            })}
          >
            <Group mb="xl" spacing="md">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'violet', to: 'blue' }}>
                <IconShield size={20} />
              </ThemeIcon>
              <Title order={2} style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Privacy Policy
              </Title>
            </Group>
            
            <Stack spacing="lg">
              <Box>
                <Title order={3} mb="sm" color="blue.4">1. Information We Collect</Title>
                <Text mb="sm" weight={500} color="orange.4">Personal Information:</Text>
                <List mb="md" sx={{ '& li': { marginBottom: '6px', color: '#C1C2C5' } }}>
                  <List.Item>Email address and username for account creation</List.Item>
                  <List.Item>Encrypted passwords using bcrypt security</List.Item>
                  <List.Item>Profile information you choose to provide</List.Item>
                </List>

                <Text mb="sm" weight={500} color="orange.4">Technical Information:</Text>
                <List mb="md" sx={{ '& li': { marginBottom: '6px', color: '#C1C2C5' } }}>
                  <List.Item>IP addresses for security and anti-abuse systems</List.Item>
                  <List.Item>Browser User Agent for optimal experience delivery</List.Item>
                  <List.Item>Session data and login activity for security monitoring</List.Item>
                  <List.Item>Usage analytics to improve our services</List.Item>
                </List>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">2. How We Use Your Information</Title>
                <List mb="md" sx={{ '& li': { marginBottom: '6px', color: '#C1C2C5' } }}>
                  <List.Item>Provide and maintain our market tracking services</List.Item>
                  <List.Item>Authenticate users and prevent unauthorized access</List.Item>
                  <List.Item>Improve user experience and service functionality</List.Item>
                  <List.Item>Communicate important service updates</List.Item>
                  <List.Item>Monitor for security threats and abuse prevention</List.Item>
                </List>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">3. Data Protection</Title>
                <List mb="md" sx={{ '& li': { marginBottom: '6px', color: '#C1C2C5' } }}>
                  <List.Item>All sensitive data is encrypted using industry-standard methods</List.Item>
                  <List.Item>We use SSL/TLS encryption for data transmission</List.Item>
                  <List.Item>Passwords are encrypted using bcrypt hashing</List.Item>
                  <List.Item>Access to personal data is restricted to authorized personnel only</List.Item>
                </List>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">4. Third-Party Services</Title>
                <Text mb="md" color="gray.3">
                  We may use third-party services for analytics, advertising, and service delivery. 
                  These services may have their own privacy policies and data collection practices.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">5. Data Sharing</Title>
                <Text mb="md" color="gray.3">
                  We do not sell, trade, or pass on your personal details to third parties without 
                  your consent, except as required by law or for legitimate business purposes 
                  (such as payment processing).
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">6. Data Retention</Title>
                <Text mb="md" color="gray.3">
                  We retain your personal information only as long as necessary to provide services 
                  and comply with legal obligations. You may request account deletion at any time.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">7. Your Rights</Title>
                <List mb="md" sx={{ '& li': { marginBottom: '6px', color: '#C1C2C5' } }}>
                  <List.Item>Access and review your personal information</List.Item>
                  <List.Item>Request correction of inaccurate data</List.Item>
                  <List.Item>Request deletion of your account and data</List.Item>
                  <List.Item>Opt-out of marketing communications</List.Item>
                  <List.Item>Export your data in a portable format</List.Item>
                </List>
              </Box>
            </Stack>
          </Card>

          {/* Legal & Contact Card */}
          <Card
            padding="xl"
            radius="lg"
            sx={(theme) => ({
              background: `linear-gradient(135deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 100%)`,
              border: `1px solid ${theme.colors.dark[5]}`,
              transition: 'all 0.2s ease-out',
              '&:hover': {
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.12)',
                borderColor: theme.colors.dark[4]
              }
            })}
          >
            <Group mb="xl" spacing="md">
              <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'red', to: 'orange' }}>
                <IconScale size={20} />
              </ThemeIcon>
              <Title order={2} style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Legal & Contact
              </Title>
            </Group>
            
            <Stack spacing="lg">
              <Box>
                <Title order={3} mb="sm" color="blue.4">1. Limitation of Liability</Title>
                <Text mb="md" color="gray.3">
                  GE-Metrics is provided "as is" without warranties of any kind. We are not liable 
                  for any trading losses, data inaccuracies, or other damages arising from the use 
                  of our service.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">2. RuneScape Disclaimer</Title>
                <Text mb="md" color="gray.3">
                  GE-Metrics is not affiliated with or endorsed by Jagex Ltd. Old School RuneScape 
                  is a trademark of Jagex Ltd. All game data is used for informational purposes only.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">3. Termination</Title>
                <Text mb="md" color="gray.3">
                  We reserve the right to terminate or suspend accounts that violate these terms, 
                  engage in abusive behavior, or pose security risks to our service.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">4. Changes to Terms</Title>
                <Text mb="md" color="gray.3">
                  We may update these terms periodically. Continued use of our service constitutes 
                  acceptance of any changes. We will notify users of significant changes when possible.
                </Text>
              </Box>

              <Box>
                <Title order={3} mb="sm" color="blue.4">5. Governing Law</Title>
                <Text mb="md" color="gray.3">
                  These terms are governed by applicable local laws. Any disputes will be resolved 
                  through appropriate legal channels in our jurisdiction.
                </Text>
              </Box>

              <Divider my="lg" />

              <Box>
                <Title order={3} mb="sm" color="blue.4">Contact Information</Title>
                <Text mb="md" color="gray.3">
                  If you have any questions about these Terms and Conditions or Privacy Policy, 
                  please contact us through our{' '}
                  <Anchor 
                    href="https://discord.gg/BdDfzg4ZMQ" 
                    target="_blank"
                    sx={{
                      color: '#667eea',
                      transition: 'color 0.2s ease',
                      '&:hover': { 
                        color: '#5a67d8',
                        textDecoration: 'none'
                      }
                    }}
                  >
                    Discord server <IconExternalLink size={14} style={{ display: 'inline', marginLeft: '2px' }} />
                  </Anchor>
                  {' '}or through the contact methods available in your account settings.
                </Text>
                
                <Group mt="md">
                  <Badge variant="outline" color="blue" size="lg">
                    Need Help?
                  </Badge>
                  <Badge variant="outline" color="green" size="lg">
                    24/7 Discord Support
                  </Badge>
                </Group>
              </Box>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}