import { faker } from '@faker-js/faker'

export interface OSRSItem {
  id: number
  name: string
  icon: string
  highalch: number
  lowalch: number
  limit: number
  value: number
  members: boolean
  examine: string
}

export interface ItemPrice {
  high: number
  low: number
  highTime: number
  lowTime: number
}

export const createOSRSItem = (overrides?: Partial<OSRSItem>): OSRSItem => ({
  id: faker.number.int({ min: 1, max: 50000 }),
  name: faker.helpers.arrayElement([
    'Abyssal whip',
    'Dragon bones',
    'Ranarr seed',
    'Adamantite bar',
    'Yew logs',
    'Magic logs',
    'Shark',
    'Rune scimitar',
    'Black chinchompa',
    'Twisted bow',
    'Elysian spirit shield'
  ]),
  icon: faker.image.url(),
  highalch: faker.number.int({ min: 1, max: 1000000 }),
  lowalch: faker.number.int({ min: 1, max: 500000 }),
  limit: faker.helpers.arrayElement([1, 5, 10, 25, 50, 100, 500, 1000, 5000, 10000]),
  value: faker.number.int({ min: 1, max: 100000 }),
  members: faker.datatype.boolean(),
  examine: faker.lorem.sentence(),
  ...overrides
})

export const createItemPrice = (overrides?: Partial<ItemPrice>): ItemPrice => {
  const low = faker.number.int({ min: 100, max: 10000000 })
  const high = faker.number.int({ min: low, max: low * 1.2 })
  
  return {
    high,
    low,
    highTime: faker.date.recent().getTime() / 1000,
    lowTime: faker.date.recent().getTime() / 1000,
    ...overrides
  }
}

export const createItemWithPrice = () => ({
  item: createOSRSItem(),
  price: createItemPrice()
})