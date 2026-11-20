import { Group, NumberInput, SegmentedControl, Text } from '@mantine/core'
import { ROW_SORTS } from '../../utils/flipRows.js'

const formatGp = value => (value === '' || value === undefined ? '' : Number(value).toLocaleString('en-US'))
const parseGp = value => value.replace(/[^0-9]/g, '')

// "Rank by" + optional cash stack, shared by the item and set pages.
export default function RankControls ({ sortBy, onSortChange, budget, onBudgetChange }) {
  return (
    <Group spacing="md" mb="sm" align="flex-end">
      <div>
        <Text size="sm" weight={500} mb={4}>Rank by</Text>
        <SegmentedControl size="xs" data={Object.values(ROW_SORTS)} value={sortBy} onChange={onSortChange} />
      </div>
      <NumberInput
        size="xs"
        label="Cash stack (gp)"
        description="Caps each 4h quantity to what you can afford"
        placeholder="No limit"
        min={0}
        step={1_000_000}
        value={budget ?? ''}
        onChange={value => onBudgetChange(value === '' ? null : Number(value))}
        parser={parseGp}
        formatter={formatGp}
        hideControls
        sx={{ width: 220 }}
      />
    </Group>
  )
}
