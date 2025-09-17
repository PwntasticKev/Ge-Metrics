import React, { useState } from 'react'
import {
  IconListDetails,
  IconTrendingUp,
  IconEye,
  IconBookmark,
  IconCrystalBall,
  IconUsers,
  IconSettings,
  IconLogout,
  IconChevronDown,
  IconChevronRight,
  IconDashboard,
  IconCoins,
  IconFlask,
  IconSword,
  IconShield,
  IconLeaf,
  IconMeat,
  IconWand,
  IconDiamond,
  IconHammer,
  IconFlame,
  IconDroplet,
  IconSkull,
  IconUser,
  IconChartLine,
  IconTrophy,
  IconHelp,
  IconActivity,
  IconCheck,
  IconHeart,
  IconHome,
  IconTarget,
  IconBrain,
  IconCalculator,
  IconCrown,
  IconStar,
  IconCalendar
} from '@tabler/icons-react'
import { Group, Text, ThemeIcon, Tooltip, UnstyledButton, Collapse, Stack, ScrollArea, createStyles } from '@mantine/core'
import { Link } from 'react-router-dom'
import { employeeService } from '../../../services/employeeService'

const useStyles = createStyles((theme) => ({
  control: {
    fontWeight: 500,
    display: 'block',
    width: '100%',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
    fontSize: theme.fontSizes.sm,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
      color: theme.colorScheme === 'dark' ? theme.white : theme.black
    }
  },

  link: {
    fontWeight: 500,
    display: 'block',
    textDecoration: 'none',
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    paddingLeft: theme.spacing.xl,
    marginLeft: theme.spacing.md,
    fontSize: theme.fontSizes.sm,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],
    borderLeft: `1px solid ${
      theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
    }`,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[0],
      color: theme.colorScheme === 'dark' ? theme.white : theme.black
    }
  },

  chevron: {
    transition: 'transform 200ms ease'
  },

  mainLink: {
    display: 'block',
    marginBottom: 8,
    borderRadius: theme.radius.sm,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
    textDecoration: 'none',
    transition: 'all 0.2s ease',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
    }
  },

  mobileMainLink: {
    padding: '12px 16px',
    marginBottom: 4,
    minHeight: 48, // Better touch target

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1]
    }
  },

  mobileSubmenuItem: {
    padding: '10px 24px',
    marginBottom: 2,
    minHeight: 44,
    fontSize: theme.fontSizes.sm,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1]
    }
  }
}))

function MainLink ({ icon, color, label, link, onClick, adminOnly, expanded, isMobile, onNavigate }) {
  const { classes } = useStyles()

  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    }
    if (isMobile && onNavigate) {
      e.preventDefault()
      onNavigate(link)
    }
  }

  const linkContent = (
    <UnstyledButton
      className={`${classes.mainLink} ${isMobile ? classes.mobileMainLink : ''}`}
      onClick={handleClick}
      sx={(theme) => ({
        display: 'block',
        padding: isMobile ? '12px 16px' : (expanded ? '8px 12px' : '8px 8px'),
        borderRadius: theme.radius.sm,
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        width: '100%',

        '&:hover': {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
        }
      })}
    >
      <Group
        spacing={expanded || isMobile ? 'xs' : 0}
        style={{
          width: '100%',
          flexWrap: 'nowrap',
          justifyContent: (expanded || isMobile) ? 'flex-start' : 'center'
        }}
      >
        <ThemeIcon color={color} variant="light" size={isMobile ? 'lg' : 'md'} style={{ flexShrink: 0 }}>
          {icon}
        </ThemeIcon>
        {(expanded || isMobile) && (
          <Text
            size={isMobile ? 'md' : 'sm'}
            weight={500}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexGrow: 1,
              minWidth: 0
            }}
          >
            {label}
          </Text>
        )}
      </Group>
    </UnstyledButton>
  )

  if (isMobile) {
    return linkContent
  }

  return (
    <Tooltip label={label} position="right" color={color} disabled={expanded}>
      <Link to={link} style={{ textDecoration: 'none' }} onClick={onClick}>
        {linkContent}
      </Link>
    </Tooltip>
  )
}

function SubmenuLink ({ icon, color, label, link, isOpen, onToggle, children, expanded, isMobile }) {
  return (
        <>
      <Tooltip label={label} position="right" color={color} disabled={expanded || isMobile}>
                    <UnstyledButton
          onClick={onToggle}
                        sx={(theme) => ({
                          display: 'block',
                          marginBottom: isMobile ? 4 : 8,
                          padding: isMobile ? '12px 16px' : (expanded ? '8px 12px' : '8px 8px'),
                          borderRadius: theme.radius.sm,
                          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
                          width: '100%',
                          backgroundColor: isOpen && (expanded || isMobile) ? theme.colors.dark[5] : 'transparent',
                          minHeight: isMobile ? 48 : 'auto',

                          '&:hover': {
                            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
                          }
                        })}
                    >
          <Group
            spacing={expanded || isMobile ? 'xs' : 0}
            style={{
              width: '100%',
              flexWrap: 'nowrap',
              justifyContent: (expanded || isMobile) ? 'flex-start' : 'center'
            }}
          >
            <ThemeIcon color={color} variant="light" size={isMobile ? 'lg' : 'md'} style={{ flexShrink: 0 }}>
                                {icon}
                            </ThemeIcon>
            {(expanded || isMobile) && (
              <>
                <Text
                  size={isMobile ? 'md' : 'sm'}
                  weight={500}
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexGrow: 1,
                    minWidth: 0
                  }}
                >
                  {label}
                </Text>
                <ThemeIcon
                  variant="transparent"
                  size="sm"
                  sx={{
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms ease'
                  }}
                >
                  <IconChevronRight size={14} />
                </ThemeIcon>
              </>
            )}
                        </Group>
                    </UnstyledButton>
            </Tooltip>
      {(expanded || isMobile) && (
        <Collapse in={isOpen}>
          <Stack spacing={isMobile ? 2 : 4} pl={isMobile ? 'sm' : 'md'}>
            {children}
          </Stack>
        </Collapse>
      )}
        </>
  )
}

function SubmenuItem ({ icon, color, label, link, expanded, isMobile, onNavigate }) {
  const { classes } = useStyles()

  const handleClick = (e) => {
    if (isMobile && onNavigate) {
      e.preventDefault()
      onNavigate(link)
    }
  }

  const content = (
    <UnstyledButton
      onClick={handleClick}
      className={isMobile ? classes.mobileSubmenuItem : ''}
      sx={(theme) => ({
        display: 'block',
        width: '100%',
        padding: isMobile ? '10px 24px' : '6px 8px',
        borderRadius: theme.radius.sm,
        color: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
        fontSize: isMobile ? theme.fontSizes.sm : theme.fontSizes.sm,
        minHeight: isMobile ? 44 : 'auto',

        '&:hover': {
          backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
          color: theme.colorScheme === 'dark' ? theme.white : theme.black
        }
      })}
    >
      <Group spacing="xs">
        <ThemeIcon color={color} variant="light" size={isMobile ? 'md' : 'sm'}>
          {icon}
        </ThemeIcon>
        <Text size={isMobile ? 'sm' : 'sm'}>{label}</Text>
      </Group>
    </UnstyledButton>
  )

  if (isMobile) {
    return content
  }

  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      {content}
    </Link>
  )
}

export function MainLinks ({ expanded, isMobile = false, onNavigate }) {
  const [marketWatchOpen, setMarketWatchOpen] = useState(false)
  const [moneyMakingOpen, setMoneyMakingOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  // Get user role from employee service
  const currentUserEmail = 'admin@ge-metrics.com' // This should come from auth context
  const isEmployee = employeeService.isEmployee(currentUserEmail)

  // Check specific permissions
  const canViewBilling = employeeService.hasPermission(currentUserEmail, 'billing:read')
  const canManageUsers = employeeService.hasPermission(currentUserEmail, 'users:read')

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...')
  }

  return (
    <ScrollArea
      style={{
        height: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 120px)',
        padding: isMobile ? '8px' : (expanded ? '8px' : '4px')
      }}
    >
      <div>
        <MainLink
          icon={<IconDashboard size="1rem"/>}
          color="blue"
          label="Dashboard"
          link="/"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconListDetails size="1rem"/>}
          color="indigo"
          label="All Items"
          link="/all-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconTrendingUp size="1rem"/>}
          color="green"
          label="High Volume"
          link="/high-volumes"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        {/* Market Watch Submenu */}
        <SubmenuLink
          icon={<IconEye size="1rem"/>}
          color="orange"
          label="Market Watch"
          isOpen={marketWatchOpen}
          onToggle={() => setMarketWatchOpen(!marketWatchOpen)}
          expanded={expanded}
          isMobile={isMobile}
        >
          <SubmenuItem
            icon={<IconMeat size="0.8rem"/>}
            color="red"
            label="Food"
            link="/market-watch/food"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconFlask size="0.8rem"/>}
            color="blue"
            label="Potions"
            link="/market-watch/potions"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconLeaf size="0.8rem"/>}
            color="green"
            label="Herbs"
            link="/market-watch/herbs"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconWand size="0.8rem"/>}
            color="purple"
            label="Runes"
            link="/market-watch/runes"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconHammer size="0.8rem"/>}
            color="gray"
            label="Metals"
            link="/market-watch/metals"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconFlame size="0.8rem"/>}
            color="orange"
            label="Logs"
            link="/market-watch/logs"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconSword size="0.8rem"/>}
            color="dark"
            label="Raids"
            link="/market-watch/raids"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconSkull size="0.8rem"/>}
            color="red"
            label="Bot Farm"
            link="/market-watch/bot-farm"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconBookmark size="1rem"/>}
          color="yellow"
          label="Watchlist"
          link="/watchlist"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconHeart size="1rem"/>}
          color="red"
          label="Favorites"
          link="/favorites"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconCrystalBall size="1rem"/>}
          color="purple"
          label="Future Items"
          link="/future-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconActivity size="1rem"/>}
          color="cyan"
          label="AI Predictions"
          link="/ai-predictions"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        {/* Money Making Submenu */}
        <SubmenuLink
          icon={<IconCoins size="1rem"/>}
          color="gold"
          label="Money Making"
          isOpen={moneyMakingOpen}
          onToggle={() => setMoneyMakingOpen(!moneyMakingOpen)}
          expanded={expanded}
          isMobile={isMobile}
        >
          <SubmenuItem
            icon={<IconFlame size="0.8rem"/>}
            color="green"
            label="Herbs"
            link="/herbs"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconSkull size="0.8rem"/>}
            color="red"
            label="Deaths Coffer"
            link="/deaths-coffer"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
          <SubmenuItem
            icon={<IconSword size="0.8rem"/>}
            color="purple"
            label="Nightmare Zone"
            link="/nightmare-zone"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconFlask size="1rem"/>}
          color="teal"
          label="Potion Combinations"
          link="/potion-combinations"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconSword size="1rem"/>}
          color="violet"
          label="Combination Items"
          link="/combination-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconUsers size="1rem"/>}
          color="cyan"
          label="Community Leaderboard"
          link="/community"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconUser size="1rem"/>}
          color="pink"
          label="Profile"
          link="/profile/1"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconSettings size="1rem"/>}
          color="gray"
          label="Settings"
          link="/settings"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconHelp size="1rem"/>}
          color="blue"
          label="FAQ"
          link="/faq"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconCheck size="1rem"/>}
          color="green"
          label="API Status"
          link="/status"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        {/* Admin Submenu - Only for employees with proper permissions */}
        {isEmployee && (
          <SubmenuLink
            icon={<IconShield size="1rem"/>}
            color="red"
            label="Admin"
            isOpen={adminOpen}
            onToggle={() => setAdminOpen(!adminOpen)}
            expanded={expanded}
            isMobile={isMobile}
          >
            {canViewBilling && (
              <SubmenuItem
                icon={<IconChartLine size="0.8rem"/>}
                color="green"
                label="Billing Dashboard"
                link="/admin/billing"
                expanded={expanded}
                isMobile={isMobile}
                onNavigate={onNavigate}
              />
            )}
            {canManageUsers && (
              <SubmenuItem
                icon={<IconUsers size="0.8rem"/>}
                color="blue"
                label="User Management"
                link="/admin/users"
                expanded={expanded}
                isMobile={isMobile}
                onNavigate={onNavigate}
              />
            )}
            <SubmenuItem
              icon={<IconShield size="0.8rem"/>}
              color="gray"
              label="System Settings"
              link="/admin/settings"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
            <SubmenuItem
              icon={<IconShield size="0.8rem"/>}
              color="orange"
              label="Security Logs"
              link="/admin/security"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
            <SubmenuItem
              icon={<IconCalculator size="0.8rem"/>}
              color="purple"
              label="Formula Documentation"
              link="/admin/formulas"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
          </SubmenuLink>
        )}

        <MainLink
          icon={<IconLogout size="1rem"/>}
          color="red"
          label="Log Out"
          link="/login"
          onClick={handleLogout}
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        {/* New link for Profit Opportunities */}
        <MainLink
          icon={<IconCrown size="1rem"/>}
          color="gold"
          label="Profit Opportunities"
          link="/profit-opportunities"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />
      </div>
    </ScrollArea>
  )
}
