import { Stack } from 'expo-router'
import { BatchCoordinator } from '../../components/batchCoordinator/BatchCoordinator'

export default function BatchCoordinatorScreen () {
  return <><Stack.Screen options={{ title: 'Recipe batch coordinator' }} /><BatchCoordinator /></>
}
