import { faker } from '@faker-js/faker'

export interface Flip {
  id: number
  userId: string
  itemId: number
  itemName: string
  buyPrice: number
  sellPrice: number
  quantity: number
  profit: number
  roi: number
  date: Date
  notes?: string
}

export const createFlip = (overrides?: Partial<Flip>): Flip => {
  const buyPrice = faker.number.int({ min: 100, max: 10000000 })
  const sellPrice = faker.number.int({ min: buyPrice, max: buyPrice * 2 })
  const quantity = faker.number.int({ min: 1, max: 10000 })
  const profit = (sellPrice - buyPrice) * quantity
  const roi = ((sellPrice - buyPrice) / buyPrice) * 100

  return {
    id: faker.number.int({ min: 1, max: 10000 }),
    userId: faker.string.uuid(),
    itemId: faker.number.int({ min: 1, max: 50000 }),
    itemName: faker.helpers.arrayElement([
      'Abyssal whip',
      'Dragon bones',
      'Ranarr potion (unf)',
      'Adamantite bar',
      'Yew logs',
      'Magic logs',
      'Shark',
      'Rune scimitar',
      'Black chinchompa'
    ]),
    buyPrice,
    sellPrice,
    quantity,
    profit,
    roi,
    date: faker.date.recent({ days: 30 }),
    notes: faker.helpers.maybe(() => faker.lorem.sentence()),
    ...overrides
  }
}

export const createFlips = (count: number = 10): Flip[] => {
  return Array.from({ length: count }, () => createFlip())
}