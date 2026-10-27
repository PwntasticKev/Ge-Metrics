import { Stack } from 'expo-router'
import RuneLiteEvidenceScreen from '../../components/runeliteEvidence/RuneLiteEvidenceScreen'

export default function RuneLiteEvidenceRoute () {
  return <><Stack.Screen options={{ title: 'RuneLite evidence' }} /><RuneLiteEvidenceScreen /></>
}
