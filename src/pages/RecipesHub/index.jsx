import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Box, Center, Group, Loader, Tabs, Text } from '@mantine/core'
import { IconChefHat } from '@tabler/icons-react'
import { DEFAULT_METHOD_KEY, METHODS } from './methodCatalog.js'
import WikiMethods from './WikiMethods.jsx'

// The custom-recipe editor is big (modals, item pickers); only load it on its tab.
const UserRecipes = lazy(() => import('../Recipes/index.jsx'))

const TAB_MINE = 'mine'
const TAB_WIKI = 'wiki'

export default function RecipesHub () {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === TAB_MINE ? TAB_MINE : TAB_WIKI
  const methodKey = params.get('method') ?? DEFAULT_METHOD_KEY

  const update = changes => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  return (
    <Box sx={{ py: 4 }}>
      <Group spacing="xs" mb={4}>
        <IconChefHat size={22} />
        <Text size="xl" weight={700}>Recipes</Text>
      </Group>
      <Text size="sm" color="dimmed" mb="md">
        Buy on the GE, make something, sell on the GE. Every recipe is priced live from the OSRS Wiki, after GE tax.
      </Text>

      <Tabs value={tab} onTabChange={value => update({ tab: value === TAB_MINE ? TAB_MINE : null })} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value={TAB_WIKI}>Wiki recipes ({METHODS.length} methods)</Tabs.Tab>
          <Tabs.Tab value={TAB_MINE}>My recipes</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value={TAB_WIKI}>
          <WikiMethods methodKey={methodKey} onMethodChange={key => update({ method: key })} />
        </Tabs.Panel>
        <Tabs.Panel value={TAB_MINE}>
          <Text size="xs" color="dimmed" mb="sm">Your recipes are saved in this browser only.</Text>
          <Suspense fallback={<Center h={240}><Loader /></Center>}>
            <UserRecipes />
          </Suspense>
        </Tabs.Panel>
      </Tabs>
    </Box>
  )
}
