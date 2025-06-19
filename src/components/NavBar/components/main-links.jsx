import React, { useState } from 'react'
import {
  IconBoxMultiple3,
  IconCoffin,
  IconCoin,
  IconHelpHexagon,
  IconListDetails,
  IconLogout,
  IconPlant2,
  IconTrendingUp,
  IconEye,
  IconSettings,
  IconShield,
  IconHeartbeat,
  IconChevronDown,
  IconChevronRight,
  IconChartLine,
  IconApple,
  IconTree,
  IconWand,
  IconTool,
  IconRobot,
  IconFlask,
  IconSword,
  IconLeaf,
  IconActivity,
  IconTrophy,
  IconUsers
} from '@tabler/icons-react'
import { Group, MediaQuery, Text, ThemeIcon, Tooltip, UnstyledButton, Collapse, Stack, ScrollArea, createStyles } from '@mantine/core'
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
    padding: expanded => expanded ? '8px 12px' : '8px 8px',
    borderRadius: theme.radius.sm,
    color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
    textDecoration: 'none',
    transition: 'all 0.2s ease',

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
    }
  }
}))

// Market Watch Index Data
const marketWatchIndexes = {
  food: [
    'Cooked karambwan', 'Guthix rest(4)', 'Jug of wine', 'Lobster', 'Manta ray',
    'Monkfish', 'Pineapple pizza', 'Saradomin brew(4)', 'Tuna potato', 'Anglerfish'
  ],
  logs: [
    'Achey tree logs', 'Arctic pine logs', 'Logs', 'Magic logs', 'Mahogany logs',
    'Maple logs', 'Oak logs', 'Teak logs', 'Willow logs', 'Yew logs', 'Redwood logs'
  ],
  runes: [
    'Astral rune', 'Blood rune', 'Chaos rune', 'Cosmic rune', 'Death rune',
    'Law rune', 'Nature rune', 'Soul rune'
  ],
  metals: [
    'Adamantite bar', 'Adamantite ore', 'Bronze bar', 'Coal', 'Copper ore',
    'Gold bar', 'Gold ore', 'Iron bar', 'Iron ore', 'Mithril bar', 'Mithril ore',
    'Runite bar', 'Runite ore', 'Silver bar', 'Silver ore', 'Steel bar', 'Tin ore'
  ],
  botFarm: [
    'Adamantite bar', 'Air orb', 'Black dragonhide', 'Blue dragon scale', 'Blue dragonhide',
    'Bow string', 'Cannonball', 'Chinchompa', 'Coal', 'Dragon bones', 'Flax',
    'Green dragonhide', 'Iron ore', 'Magic logs', 'Mithril bar', 'Nature rune',
    'Pure essence', 'Raw lobster', 'Raw monkfish', 'Raw shark', 'Raw swordfish',
    'Red chinchompa', 'Rune essence', 'Runite bar', 'Steel bar', 'White berries',
    'Wine of zamorak', 'Yew logs'
  ],
  potions: [
    'Anti-venom+(4)', 'Antidote++(4)', 'Extended antifire(4)', 'Magic potion(4)',
    'Prayer potion(4)', 'Ranging potion(4)', 'Sanfew serum(4)', 'Saradomin brew(4)',
    'Stamina potion(4)', 'Super attack(4)', 'Super combat potion(4)', 'Super defence(4)',
    'Super energy(4)', 'Super restore(4)', 'Super strength(4)', 'Superantipoison(4)'
  ],
  raids: [
    'Ancestral robe bottom', 'Ancestral robe top', "Dinh's bulwark", 'Dragon claws',
    'Dragon hunter crossbow', 'Elder maul', 'Kodai wand', 'Dexterous prayer scroll',
    'Twisted bow', 'Twisted buckler', 'Arcane prayer scroll'
  ],
  herbs: [
    'Avantoe', 'Cadantine', 'Dwarf weed', 'Grimy avantoe', 'Grimy cadantine',
    'Grimy dwarf weed', 'Grimy guam leaf', 'Grimy harralander', 'Grimy irit leaf',
    'Grimy kwuarm', 'Grimy lantadyme', 'Grimy marrentill', 'Grimy ranarr weed',
    'Grimy snapdragon', 'Grimy tarromin', 'Grimy toadflax', 'Grimy torstol',
    'Guam leaf', 'Harralander', 'Irit leaf', 'Kwuarm', 'Lantadyme', 'Marrentill',
    'Ranarr weed', 'Snapdragon', 'Tarromin', 'Toadflax', 'Torstol'
  ]
}

function MainLink ({ icon, color, label, link, onClick, adminOnly, expanded }) {
  const { classes } = useStyles()

  return (
    <Tooltip label={label} position="right" color={color} disabled={expanded}>
      <Link to={link} style={{ textDecoration: 'none' }} onClick={onClick}>
        <UnstyledButton
          className={classes.mainLink}
          sx={(theme) => ({
            display: 'block',
            marginBottom: 8,
            padding: expanded ? '8px 12px' : '8px 8px',
            borderRadius: theme.radius.sm,
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
            width: '100%',

            '&:hover': {
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
            }
          })}
        >
          <Group spacing={expanded ? 'xs' : 0} style={{ width: '100%', flexWrap: 'nowrap', justifyContent: expanded ? 'flex-start' : 'center' }}>
            <ThemeIcon color={color} variant="light" size="md" style={{ flexShrink: 0 }}>
              {icon}
            </ThemeIcon>
            {expanded && (
              <Text
                size="sm"
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
      </Link>
    </Tooltip>
  )
}

function SubmenuLink ({ icon, color, label, link, isOpen, onToggle, children, expanded }) {
  return (
    <>
      <Tooltip label={label} position="right" color={color} disabled={expanded}>
        <UnstyledButton
          onClick={onToggle}
          sx={(theme) => ({
            display: 'block',
            marginBottom: 8,
            padding: expanded ? '8px 12px' : '8px 8px',
            borderRadius: theme.radius.sm,
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
            width: '100%',
            backgroundColor: isOpen && expanded ? theme.colors.dark[5] : 'transparent',

            '&:hover': {
              backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
            }
          })}
        >
          <Group spacing={expanded ? 'xs' : 0} style={{ width: '100%', flexWrap: 'nowrap', justifyContent: expanded ? 'space-between' : 'center' }}>
            <Group spacing="xs" style={{ flexWrap: 'nowrap', minWidth: 0 }}>
              <ThemeIcon color={color} variant="light" size="md" style={{ flexShrink: 0 }}>
                {icon}
              </ThemeIcon>
              {expanded && (
                <Text
                  size="sm"
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
            {expanded && (
              <IconChevronDown
                size={16}
                style={{
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 200ms ease'
                }}
              />
            )}
          </Group>
        </UnstyledButton>
      </Tooltip>
      {expanded && (
        <Collapse in={isOpen}>
          <Stack spacing={4} style={{ paddingLeft: '12px', marginBottom: '8px' }}>
            {children}
          </Stack>
        </Collapse>
      )}
    </>
  )
}

function SubmenuItem ({ icon, color, label, link, expanded }) {
  return (
    <Link to={link} style={{ textDecoration: 'none' }}>
      <UnstyledButton
        sx={(theme) => ({
          display: 'block',
          width: '100%',
          padding: '6px 8px',
          borderRadius: theme.radius.sm,
          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],
          fontSize: theme.fontSizes.sm,
          borderLeft: `2px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
          marginLeft: '8px',

          '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
            borderLeftColor: theme.colorScheme === 'dark' ? theme.colors.dark[2] : theme.colors.gray[5]
          }
        })}
      >
        <Group spacing="xs" style={{ flexWrap: 'nowrap' }}>
          <ThemeIcon color={color} variant="light" size="sm" style={{ flexShrink: 0 }}>
            {icon}
          </ThemeIcon>
          <Text
            size="sm"
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
        </Group>
      </UnstyledButton>
    </Link>
  )
}

const LinksGroup = ({ icon: Icon, label, initiallyOpened, links }) => {
  const { classes, theme } = useStyles()
  const hasLinks = Array.isArray(links)
  const [opened, setOpened] = useState(initiallyOpened || false)
  const ChevronIcon = opened ? IconChevronDown : IconChevronRight

  const items = (hasLinks ? links : []).map((link) => (
    <Text
      component={Link}
      className={classes.link}
      to={link.link}
      key={link.label}
    >
      {link.label}
    </Text>
  ))

  return (
    <>
      <UnstyledButton onClick={() => setOpened((o) => !o)} className={classes.control}>
        <Group position="apart" spacing={0}>
          <Group>
            <Icon size={18} />
            <Text>{label}</Text>
          </Group>
          {hasLinks && (
            <ChevronIcon
              className={classes.chevron}
              size={16}
              style={{
                transform: opened ? 'rotate(0deg)' : 'rotate(-90deg)'
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  )
}

// Navigation structure
export const mockdata = [
  { label: 'Dashboard', icon: 'IconGauge', link: '/' },
  { label: 'All Items', icon: 'IconDatabase', link: '/all-items' },
  { label: 'Item Sets', icon: 'IconPackages', link: '/item-sets' },
  { label: 'High Volume', icon: 'IconTrendingUp', link: '/high-volume' },
  { label: 'Deaths Coffer', icon: 'IconSkull', link: '/deaths-coffer' },
  { label: 'Market Watch', icon: 'IconEye', link: '/market-watch' },
  { label: 'Watchlist', icon: 'IconBookmark', link: '/watchlist' },
  { label: 'Future Items', icon: 'IconCrystalBall', link: '/future-items' },
  { label: 'Community', icon: 'IconUsers', link: '/community' },
  { label: 'Status', icon: 'IconHeartbeat', link: '/status' },
  {
    label: 'Admin',
    icon: 'IconSettings',
    links: [
      { label: 'Billing Dashboard', link: '/admin/billing' },
      { label: 'User Management', link: '/admin/users' },
      { label: 'System Settings', link: '/admin/settings' },
      { label: 'Security Logs', link: '/admin/security' },
      { label: 'API Keys', link: '/admin/api-keys' },
      { label: 'Database', link: '/admin/database' }
    ]
  }
]

export function MainLinks ({ expanded }) {
  const [moneyMakingOpen, setMoneyMakingOpen] = useState(false)
  const [marketWatchOpen, setMarketWatchOpen] = useState(false)
  const [flippingUtilsOpen, setFlippingUtilsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  // Get user role from employee service
  // TODO: Replace with actual user email from auth context
  const currentUserEmail = 'admin@ge-metrics.com' // This should come from auth context
  const userRole = employeeService.getUserRole(currentUserEmail)
  const isEmployee = employeeService.isEmployee(currentUserEmail)
  const userPermissions = employeeService.getUserPermissions(currentUserEmail)

  // Check specific permissions
  const canViewBilling = employeeService.hasPermission(currentUserEmail, 'billing:read')
  const canManageUsers = employeeService.hasPermission(currentUserEmail, 'users:read')
  const canViewSystemSettings = employeeService.hasPermission(currentUserEmail, 'system:settings')
  const canViewSecurityLogs = employeeService.hasPermission(currentUserEmail, 'system:logs')

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...')
  }

  const links = mockdata.map((item) => <LinksGroup {...item} key={item.label} />)

  return (
    <ScrollArea style={{ height: 'calc(100vh - 120px)', padding: expanded ? '8px' : '4px' }}>
      <div>
        <MainLink
          icon={<IconListDetails size="1rem"/>}
          color="blue"
          label="All Items"
          link="/"
          expanded={expanded}
        />
        <MainLink
          icon={<IconTrendingUp size="1rem"/>}
          color="green"
          label="High Volumes"
          link="/high-volumes"
          expanded={expanded}
        />
        <MainLink
          icon={<IconEye size="1rem"/>}
          color="orange"
          label="Watchlist"
          link="/watchlist"
          expanded={expanded}
        />

        {/* Employee Only - Arbitrage Tracker */}
        {isEmployee && (
          <MainLink
            icon={<IconBoxMultiple3 size="1rem"/>}
            color="teal"
            label="Arbitrage Tracker"
            link="/combination-items"
            expanded={expanded}
          />
        )}

        {/* Market Watch Submenu */}
        <SubmenuLink
          icon={<IconChartLine size="1rem"/>}
          color="indigo"
          label="Market Watch"
          isOpen={marketWatchOpen}
          onToggle={() => setMarketWatchOpen(!marketWatchOpen)}
          expanded={expanded}
        >
          <SubmenuItem
            icon={<IconApple size="0.8rem"/>}
            color="red"
            label="Food Index"
            link="/market-watch/food"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconTree size="0.8rem"/>}
            color="green"
            label="Log Index"
            link="/market-watch/logs"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconWand size="0.8rem"/>}
            color="purple"
            label="Rune Index"
            link="/market-watch/runes"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconTool size="0.8rem"/>}
            color="gray"
            label="Metal Index"
            link="/market-watch/metals"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconRobot size="0.8rem"/>}
            color="red"
            label="Bot Farm Index"
            link="/market-watch/bot-farm"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconFlask size="0.8rem"/>}
            color="blue"
            label="Potions Index"
            link="/market-watch/potions"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconSword size="0.8rem"/>}
            color="yellow"
            label="Raids Index"
            link="/market-watch/raids"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconLeaf size="0.8rem"/>}
            color="green"
            label="Herb Index"
            link="/market-watch/herbs"
            expanded={expanded}
          />
        </SubmenuLink>

        {/* Flipping Utils Submenu */}
        <SubmenuLink
          icon={<IconTrendingUp size="1rem"/>}
          color="teal"
          label="Flipping Utils"
          isOpen={flippingUtilsOpen}
          onToggle={() => setFlippingUtilsOpen(!flippingUtilsOpen)}
          expanded={expanded}
        >
          <SubmenuItem
            icon={<IconWand size="0.8rem"/>}
            color="purple"
            label="Future Items"
            link="/future-items"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconActivity size="0.8rem"/>}
            color="blue"
            label="Flip Tracker"
            link="/flip-tracker"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconTrendingUp size="0.8rem"/>}
            color="green"
            label="Margin Calculator"
            link="/margin-calculator"
            expanded={expanded}
          />
        </SubmenuLink>

        {/* Money Making Submenu */}
        <SubmenuLink
          icon={<IconCoin size="1rem"/>}
          color="violet"
          label="Money Making"
          isOpen={moneyMakingOpen}
          onToggle={() => setMoneyMakingOpen(!moneyMakingOpen)}
          expanded={expanded}
        >
          <SubmenuItem
            icon={<IconPlant2 size="0.8rem"/>}
            color="green"
            label="Herblore Profit"
            link="/herbs"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconCoffin size="0.8rem"/>}
            color="dark"
            label="Deaths Coffer"
            link="/deaths-coffer"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconCoin size="0.8rem"/>}
            color="yellow"
            label="General Money Making"
            link="/money-making"
            expanded={expanded}
          />
          <SubmenuItem
            icon={<IconShield size="0.8rem"/>}
            color="purple"
            label="Nightmare Zone"
            link="/nightmare-zone"
            expanded={expanded}
          />
        </SubmenuLink>

        <MainLink
          icon={<IconTrophy size="1rem"/>}
          color="gold"
          label="Community"
          link="/community"
          expanded={expanded}
        />

        <MainLink
          icon={<IconSettings size="1rem"/>}
          color="gray"
          label="Settings"
          link="/settings"
          expanded={expanded}
        />

        <MainLink
          icon={<IconHelpHexagon size="1rem"/>}
          color="grape"
          label="FAQ"
          link="/faq"
          expanded={expanded}
        />

        {/* Admin Submenu - Only for employees with proper permissions */}
        {isEmployee && (
          <SubmenuLink
            icon={<IconSettings size="1rem"/>}
            color="red"
            label="Admin"
            isOpen={adminOpen}
            onToggle={() => setAdminOpen(!adminOpen)}
            expanded={expanded}
          >
            {canViewBilling && (
              <SubmenuItem
                icon={<IconCoin size="0.8rem"/>}
                color="green"
                label="Billing Dashboard"
                link="/admin/billing"
                expanded={expanded}
              />
            )}
            {canManageUsers && (
              <SubmenuItem
                icon={<IconUsers size="0.8rem"/>}
                color="blue"
                label="User Management"
                link="/admin/users"
                expanded={expanded}
              />
            )}
            {canViewSystemSettings && (
              <SubmenuItem
                icon={<IconSettings size="0.8rem"/>}
                color="gray"
                label="System Settings"
                link="/admin/settings"
                expanded={expanded}
              />
            )}
            {canViewSecurityLogs && (
              <SubmenuItem
                icon={<IconShield size="0.8rem"/>}
                color="red"
                label="Security Logs"
                link="/admin/security"
                expanded={expanded}
              />
            )}
            <SubmenuItem
              icon={<IconHeartbeat size="0.8rem"/>}
              color="lime"
              label="API Status"
              link="/status"
              expanded={expanded}
            />
          </SubmenuLink>
        )}

        <MainLink
          icon={<IconLogout size="1rem"/>}
          color="grape"
          label="Log Out"
          link="/login"
          onClick={handleLogout}
          expanded={expanded}
        />

        {links}
      </div>
    </ScrollArea>
  )
}
