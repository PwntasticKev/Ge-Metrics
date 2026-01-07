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
  IconQuestionMark,
  IconHeart,
  IconHome,
  IconTarget,
  IconBrain,
  IconCalculator,
  IconCrown,
  IconStar,
  IconCalendar,
  IconPlant2,
  IconWash,
  IconTool,
  IconLock,
  IconSparkles,
  IconShieldCheck,
  IconChefHat
} from '@tabler/icons-react'
import { Button, Group, Text, ThemeIcon, Tooltip, UnstyledButton, Collapse, Stack, ScrollArea, createStyles } from '@mantine/core'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import '../../../styles/scrollbar.css'

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
    transition: 'all 0.2s ease-out',
    position: 'relative',
    overflow: 'hidden',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
      transform: 'translateX(4px)',
      boxShadow: theme.colorScheme === 'dark' 
        ? '0 2px 8px rgba(102, 126, 234, 0.2)' 
        : '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '3px',
      backgroundColor: '#667eea',
      transform: 'scaleY(0)',
      transition: 'transform 0.2s ease-out',
      borderRadius: '0 2px 2px 0'
    },
    '&:hover::before': {
      transform: 'scaleY(1)'
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

function MainLink ({ icon, color, label, link, onClick, adminOnly, expanded, isMobile, onNavigate, isPremium, hasAccess }) {
  const { classes } = useStyles()
  const location = useLocation()
  const isActive = location.pathname === link

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
      component={Link}
      to={link}
      onClick={handleClick}
      className={`${classes.mainLink} ${isMobile ? classes.mobileMainLink : ''}`}
      sx={(theme) => ({
        display: 'block',
        padding: isMobile ? '12px 16px' : (expanded ? '8px 12px' : '8px 8px'),
        borderRadius: theme.radius.sm,
        color: isPremium && !hasAccess 
          ? theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[5]
          : theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        width: '100%',
        opacity: isPremium && !hasAccess ? 0.6 : 1,
        backgroundColor: isActive 
          ? theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1]
          : 'transparent',
        position: 'relative',

        '&:hover': {
          backgroundColor: isPremium && !hasAccess 
            ? 'transparent' 
            : theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
          transform: 'translateX(4px)',
          boxShadow: theme.colorScheme === 'dark' 
            ? '0 2px 8px rgba(102, 126, 234, 0.2)' 
            : '0 2px 4px rgba(0, 0, 0, 0.1)'
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: '#667eea',
          transform: isActive ? 'scaleY(1)' : 'scaleY(0)',
          transition: 'transform 0.2s ease-out',
          borderRadius: '0 2px 2px 0'
        },
        '&:hover::before': {
          transform: 'scaleY(1)'
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
            {isPremium && !hasAccess && (
              <ThemeIcon size="xs" color="gray" variant="light">
                <IconLock size={12} />
              </ThemeIcon>
            )}
          </>
        )}
      </Group>
    </UnstyledButton>
  )

  if (isMobile) {
    return linkContent
  }

  return (
    <Tooltip label={label} position="right" color={color} disabled={expanded}>
      {linkContent}
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
            <ThemeIcon 
              color={color} 
              variant="light" 
              size={isMobile ? 'lg' : 'md'} 
              style={{ 
                flexShrink: 0,
                transition: 'all 0.2s ease-out',
                transform: 'scale(1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
                e.currentTarget.style.filter = 'drop-shadow(0 0 6px rgba(102, 126, 234, 0.5))'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.filter = 'none'
              }}
            >
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

function SubmenuItem ({ icon, color, label, link, expanded, isMobile, onNavigate, isPremium, hasAccess }) {
  const { classes } = useStyles()

  const handleClick = (e) => {
    if (isMobile && onNavigate) {
      e.preventDefault()
      onNavigate(link)
    }
  }

  const content = (
    <UnstyledButton
      component={Link}
      to={link}
      onClick={handleClick}
      className={isMobile ? classes.mobileSubmenuItem : ''}
      sx={(theme) => ({
        display: 'block',
        width: '100%',
        padding: isMobile ? '10px 24px' : '6px 8px',
        borderRadius: theme.radius.sm,
        color: isPremium && !hasAccess 
          ? theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[5]
          : theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[6],
        fontSize: isMobile ? theme.fontSizes.sm : theme.fontSizes.sm,
        minHeight: isMobile ? 44 : 'auto',
        opacity: isPremium && !hasAccess ? 0.6 : 1,
        transition: 'all 0.2s ease-out',
        position: 'relative',
        overflow: 'hidden',

        '&:hover': {
          backgroundColor: isPremium && !hasAccess 
            ? 'transparent' 
            : theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
          color: isPremium && !hasAccess 
            ? theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[5]
            : theme.colorScheme === 'dark' ? theme.white : theme.black,
          transform: 'translateX(4px)',
          paddingLeft: isMobile ? '28px' : '12px'
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '2px',
          backgroundColor: '#667eea',
          transform: 'scaleY(0)',
          transition: 'transform 0.2s ease-out',
          borderRadius: '0 2px 2px 0'
        },
        '&:hover::before': {
          transform: 'scaleY(1)'
        }
      })}
    >
      <Group spacing="xs">
        <ThemeIcon 
          color={color} 
          variant="light" 
          size={isMobile ? 'md' : 'sm'}
          style={{
            transition: 'all 0.2s ease-out',
            transform: 'scale(1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.15)'
            e.currentTarget.style.filter = 'drop-shadow(0 0 4px rgba(102, 126, 234, 0.4))'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.filter = 'none'
          }}
        >
          {icon}
        </ThemeIcon>
        <Text size={isMobile ? 'sm' : 'sm'}>{label}</Text>
        {isPremium && !hasAccess && (
          <ThemeIcon size="xs" color="gray" variant="light">
            <IconLock size={10} />
          </ThemeIcon>
        )}
      </Group>
    </UnstyledButton>
  )

  if (isMobile) {
    return content
  }

  return (
    <Tooltip label={label} position="right" color={color} disabled={expanded}>
      {content}
    </Tooltip>
  )
}

export function MainLinks ({ expanded, isMobile = false, onNavigate }) {
  const [marketWatchOpen, setMarketWatchOpen] = useState(false)
  const [moneyMakingOpen, setMoneyMakingOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [herbloreOpen, setHerbloreOpen] = useState(false)
  const [magicOpen, setMagicOpen] = useState(false)
  const { user, isSubscribed, logout } = useAuth()

  // Check if user has access (admin/moderator bypass subscription requirement)
  const isAdminOrModerator = user?.role === 'admin' || user?.role === 'moderator'
  const hasAccess = isAdminOrModerator || isSubscribed

  // If user doesn't have access, show limited menu
  if (!hasAccess) {
    return (
      <ScrollArea
        className="navbar-scrollarea"
        style={{
          height: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 120px)',
          padding: isMobile ? '8px' : (expanded ? '8px' : '4px')
        }}
      >
        <Stack spacing="md" style={{ textAlign: 'center', padding: '20px' }}>
          <Text size="sm" color="dimmed">
            Subscribe to access all features
          </Text>
          <Button 
            variant="gradient" 
            gradient={{ from: 'blue', to: 'cyan' }}
            size="sm"
            onClick={() => window.location.href = '/pricing'}
          >
            Upgrade Now
          </Button>
        </Stack>
      </ScrollArea>
    )
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <ScrollArea
      className="navbar-scrollarea"
      style={{
        height: isMobile ? 'calc(100vh - 80px)' : 'calc(100vh - 120px)',
        padding: isMobile ? '8px' : (expanded ? '8px' : '4px')
      }}
    >
      <div>
        {/* ACTIVE MENU ITEMS - Keep these visible */}
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
          icon={<IconSword size="1rem"/>}
          color="violet"
          label="Combination Items"
          link="/combination-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        <MainLink
          icon={<IconChefHat size="1rem"/>}
          color="orange"
          label="Recipes"
          link="/recipes"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        {/* Global Recipes removed from public menu */}
        {/*
        <MainLink
          icon={<IconUsers size="1rem"/>}
          color="cyan"
          label="Global Recipes"
          link="/global-recipes"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />
        */}

        {/* Herblore Submenu */}
        <SubmenuLink
          icon={<IconFlask size="1rem"/>}
          color="teal"
          label="Herblore"
          isOpen={herbloreOpen}
          onToggle={() => setHerbloreOpen(!herbloreOpen)}
          expanded={expanded}
          isMobile={isMobile}
        >
          <SubmenuItem
            icon={<IconWash size="0.8rem"/>}
            color="cyan"
            label="Clean Herbs"
            link="/herb-cleaning"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconFlask size="0.8rem"/>}
            color="blue"
            label="Potions"
            link="/potion-combinations"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconTool size="0.8rem"/>}
            color="green"
            label="Make Potions"
            link="/make-potions"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconDroplet size="0.8rem"/>}
            color="violet"
            label="Unfinished Potions"
            link="/unfinished-potions"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconPlant2 size="1rem"/>}
          color="green"
          label="Saplings"
          link="/saplings"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        <MainLink
          icon={<IconHammer size="1rem"/>}
          color="orange"
          label="Plank Make"
          link="/plank-make"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        <MainLink
          icon={<IconDiamond size="1rem"/>}
          color="yellow"
          label="High Alchemy"
          link="/high-alchemy"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        {/* Magic Submenu */}
        <SubmenuLink
          icon={<IconWand size="1rem"/>}
          color="violet"
          label="Magic"
          isOpen={magicOpen}
          onToggle={() => setMagicOpen(!magicOpen)}
          expanded={expanded}
          isMobile={isMobile}
        >
          <SubmenuItem
            icon={<IconSparkles size="0.8rem"/>}
            color="purple"
            label="Magic Tablets"
            link="/magic-tablets"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconTarget size="0.8rem"/>}
            color="blue"
            label="Enchant Bolts"
            link="/enchanting-bolts"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconDroplet size="0.8rem"/>}
            color="cyan"
            label="Enchant Jewelry"
            link="/enchanting-jewelry"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconShieldCheck size="1rem"/>}
          color="grape"
          label="Barrows Repair"
          link="/barrows-repair"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        {/* Market Watch Submenu - Keep this one */}
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
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconFlask size="0.8rem"/>}
            color="blue"
            label="Potions"
            link="/market-watch/potions"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconLeaf size="0.8rem"/>}
            color="green"
            label="Herbs"
            link="/market-watch/herbs"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconWand size="0.8rem"/>}
            color="purple"
            label="Runes"
            link="/market-watch/runes"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconHammer size="0.8rem"/>}
            color="gray"
            label="Metals"
            link="/market-watch/metals"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconFlame size="0.8rem"/>}
            color="orange"
            label="Logs"
            link="/market-watch/logs"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconSword size="0.8rem"/>}
            color="dark"
            label="Raids"
            link="/market-watch/raids"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconSkull size="0.8rem"/>}
            color="red"
            label="Bot Farm"
            link="/market-watch/bot-farm"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconTarget size="1rem"/>}
          color="blue"
          label="Suggested Items"
          link="/suggested-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        <MainLink
          icon={<IconHeart size="1rem"/>}
          color="red"
          label="Favorites"
          link="/favorites"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
          isPremium={true}
          hasAccess={hasAccess}
        />

        <MainLink
          icon={<IconQuestionMark size="1rem"/>}
          color="blue"
          label="FAQ"
          link="/faq"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        {/* TEMPORARILY HIDDEN MENU ITEMS - Commented out for now */}
        {/*
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
          icon={<IconTrendingUp size="1rem"/>}
          color="green"
          label="High Volume"
          link="/high-volumes"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

        <MainLink
          icon={<IconTarget size="1rem"/>}
          color="blue"
          label="Suggested Items"
          link="/suggested-items"
          expanded={expanded}
          isMobile={isMobile}
          onNavigate={onNavigate}
        />

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
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconSkull size="0.8rem"/>}
            color="red"
            label="Deaths Coffer"
            link="/deaths-coffer"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
          <SubmenuItem
            icon={<IconSword size="0.8rem"/>}
            color="purple"
            label="Nightmare Zone"
            link="/nightmare-zone"
            expanded={expanded}
            isMobile={isMobile}
            onNavigate={onNavigate}
            isPremium={true}
            hasAccess={hasAccess}
          />
        </SubmenuLink>

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
        */}

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

        {/* Admin Submenu - Only for admin users */}
        {user && user.role === 'admin' && (
          <SubmenuLink
            icon={<IconShield size="1rem"/>}
            color="red"
            label="Admin"
            isOpen={adminOpen}
            onToggle={() => setAdminOpen(!adminOpen)}
            expanded={expanded}
            isMobile={isMobile}
          >
            <SubmenuItem
              icon={<IconDashboard size="0.8rem"/>}
              color="red"
              label="Admin Dashboard"
              link="/admin"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
            <SubmenuItem
              icon={<IconUsers size="0.8rem"/>}
              color="blue"
              label="User Management"
              link="/admin/user-management"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
            <SubmenuItem
              icon={<IconChartLine size="0.8rem"/>}
              color="green"
              label="Billing Dashboard"
              link="/admin/billing"
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
              icon={<IconSettings size="0.8rem"/>}
              color="gray"
              label="System Settings"
              link="/admin/settings"
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
            <SubmenuItem
              icon={<IconTool size="0.8rem"/>}
              color="teal"
              label="Cron Jobs"
              link="/admin/cron-jobs"
              expanded={expanded}
              isMobile={isMobile}
              onNavigate={onNavigate}
            />
            <SubmenuItem
              icon={<IconChefHat size="0.8rem"/>}
              color="orange"
              label="Global Recipes"
              link="/admin/global-recipes"
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
      </div>
    </ScrollArea>
  )
}
