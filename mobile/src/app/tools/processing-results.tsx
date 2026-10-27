import { Stack } from 'expo-router'
import ProcessingResultsScreen from '../../components/processingResults/ProcessingResultsScreen'

export default function ProcessingResultsRoute () {
  return <><Stack.Screen options={{ title: 'Recorded processing results' }} /><ProcessingResultsScreen /></>
}
