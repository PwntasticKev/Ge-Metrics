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
  IconActivity
} from '@tabler/icons-react'
import { Group, MediaQuery, Text, ThemeIcon, Tooltip, UnstyledButton, Collapse, Stack, ScrollArea } from '@mantine/core'
import { Link } from 'react-router-dom'

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
  return (
        <>
            <Tooltip label={label} position="right" color={color} disabled={expanded}>
                <Link to={link} style={{ textDecoration: 'none' }} onClick={onClick}>
                    <UnstyledButton
                        sx={(theme) => ({
                          display: 'block',
                          marginBottom: 8,
                          padding: '6px 8px',
                          borderRadius: theme.radius.sm,
                          color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

                          '&:hover': {
                            backgroundColor:
                                    theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
                          }
                        })}
                    >
                        <Group spacing="xs" style={{ width: '100%', flexWrap: 'nowrap' }}>
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
        </>
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
            padding: '6px 8px',
            borderRadius: theme.radius.sm,
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
            width: '100%',
            backgroundColor: isOpen && expanded ? theme.colors.dark[5] : 'transparent',

            '&:hover': {
              backgroundColor:
                theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
            }
          })}
        >
          <Group spacing="xs" style={{ width: '100%', flexWrap: 'nowrap' }}>
            <ThemeIcon color={color} variant="light" size="md" style={{ flexShrink: 0 }}>
              {icon}
            </ThemeIcon>
            {expanded && (
              <Group position="apart" style={{ width: '100%', flexWrap: 'nowrap', minWidth: 0 }}>
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
                <div style={{ flexShrink: 0 }}>
                  {isOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </div>
              </Group>
            )}
          </Group>
        </UnstyledButton>
      </Tooltip>
      <Collapse in={isOpen && expanded}>
        <div style={{
          backgroundColor: expanded ? 'rgba(55, 58, 64, 0.3)' : 'transparent',
          borderRadius: '4px',
          padding: expanded ? '4px' : '0',
          marginLeft: '8px',
          marginBottom: '8px'
        }}>
          <Stack spacing="xs">
            {children}
          </Stack>
        </div>
      </Collapse>
    </>
  )
}

function SubmenuItem ({ icon, color, label, link, expanded }) {
  return (
    <Tooltip label={label} position="right" color={color} disabled={expanded}>
      <Link to={link} style={{ textDecoration: 'none' }}>
        <UnstyledButton
          sx={(theme) => ({
            display: 'block',
            marginBottom: 4,
            padding: '4px 6px',
            borderRadius: theme.radius.sm,
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
            width: '100%',

            '&:hover': {
              backgroundColor:
                theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0]
            }
          })}
        >
          <Group spacing="xs" style={{ width: '100%', flexWrap: 'nowrap' }}>
            <ThemeIcon color={color} variant="light" size="sm" style={{ flexShrink: 0 }}>
              {icon}
            </ThemeIcon>
            {expanded && (
              <Text
                size="xs"
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

export function MainLinks ({ expanded }) {
  const [moneyMakingOpen, setMoneyMakingOpen] = useState(false)
  const [marketWatchOpen, setMarketWatchOpen] = useState(false)
  const [flippingUtilsOpen, setFlippingUtilsOpen] = useState(false)

  // Mock user role check - in real app, get from auth context
  const isAdmin = true // This should come from your auth context

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logging out...')
  }

  return (
    <ScrollArea style={{ height: 'calc(100vh - 120px)' }}>
      <div style={{ padding: '4px' }}>
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

        {/* Admin Only - Arbitrage Tracker */}
        {isAdmin && (
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

        {/* Admin Only Links */}
        {isAdmin && (
          <>
            <MainLink
              icon={<IconShield size="1rem"/>}
              color="red"
              label="Admin"
              link="/admin"
              expanded={expanded}
            />
            <MainLink
              icon={<IconHeartbeat size="1rem"/>}
              color="lime"
              label="API Status"
              link="/status"
              expanded={expanded}
            />
          </>
        )}

        <MainLink
          icon={<IconLogout size="1rem"/>}
          color="grape"
          label="Log Out"
          link="/login"
          onClick={handleLogout}
          expanded={expanded}
        />
      </div>
    </ScrollArea>
  )
}
