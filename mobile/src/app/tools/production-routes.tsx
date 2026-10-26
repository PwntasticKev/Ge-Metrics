import { Stack } from 'expo-router'
import { ProductionRoutes } from '../../components/productionRoutes/ProductionRoutes'

export default function ProductionRoutesScreen () {
  return <><Stack.Screen options={{ title: 'Production routes' }} /><ProductionRoutes /></>
}
