import { Stack } from 'expo-router'
import { CombinedBatches } from '../../components/combinedBatches/CombinedBatches'

export default function CombinedBatchesScreen () {
  return <><Stack.Screen options={{ title: 'Combined two-batch coordinator' }} /><CombinedBatches /></>
}
