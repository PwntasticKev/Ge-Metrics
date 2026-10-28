import { Stack } from 'expo-router'
import { ProcessingLab } from '../../components/processingLab/ProcessingLab'

export default function ProcessingLabScreen () {
  return <><Stack.Screen options={{ title: 'Processing profit lab' }} /><ProcessingLab /></>
}
