import { Stack } from 'expo-router'
import { RepairComparison } from '../../components/repairComparison/RepairComparison'

export default function RepairComparisonScreen () {
  return <><Stack.Screen options={{ title: 'Repair comparison' }} /><RepairComparison /></>
}
