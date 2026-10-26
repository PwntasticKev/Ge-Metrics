import { Stack } from 'expo-router'
import { DoseBasket } from '../../components/doseBasket/DoseBasket'

export default function DoseBasketScreen () {
  return <><Stack.Screen options={{ title: 'Dose basket' }} /><DoseBasket /></>
}
