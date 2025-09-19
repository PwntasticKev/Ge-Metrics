import axios from 'axios'

export const getPricingData = async () => {
  try {
    const response = await axios.get(
      'https://prices.runescape.wiki/api/v1/osrs/latest'
    )
    return response
  } catch (error) {
    console.error('Error fetching Pricing data:', error)
    throw error
  }
}

export const getDmmPricingData = async () => {
  try {
    const response = await axios.get(
      'https://prices.runescape.wiki/api/v1/dmm/latest'
    )
    return response
  } catch (error) {
    console.error('Error fetching Pricing data for DMM:', error)
    throw error
  }
}

export const getMappingData = async () => {
  try {
    const response = await axios.get(
      'https://prices.runescape.wiki/api/v1/osrs/mapping'
    )
    // Cache items when first grabbing and add images for performance
    return response.data.map(item => ({
      ...item,
      img: `https://oldschool.runescape.wiki/images/c/c1/${item.name.replace(/\s+/g, '_')}.png?${item.id}b`
    }))
  } catch (error) {
    console.error('Error fetching Mapping data:', error)
    throw error
  }
}

export const getItemHistoryById = async (time, itemId) => {
  try {
    const response = await axios.get(
      `https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${time}&id=${itemId}`,
      {
        headers: {
          'User-Agent': 'Ge-Metrics - OSRS Grand Exchange Analytics - kevinlee@email.com'
        }
      }
    )
    return response
  } catch (error) {
    console.error('Error fetching item History:', error)
    throw error
  }
}

export const getVolumeData = async () => {
  try {
    const response = await axios.get(
      'https://prices.runescape.wiki/api/v1/osrs/latest'
    )
    return response
  } catch (error) {
    console.error('Error fetching Volume data:', error)
    throw error
  }
}

export const get5MinuteData = async (timestamp) => {
  try {
    const url = timestamp
      ? `https://prices.runescape.wiki/api/v1/osrs/5m?timestamp=${timestamp}`
      : 'https://prices.runescape.wiki/api/v1/osrs/5m'
    const response = await axios.get(url)
    return response
  } catch (error) {
    console.error('Error fetching 5-minute data:', error)
    throw error
  }
}

export const get1HourData = async (timestamp) => {
  try {
    const url = timestamp
      ? `https://prices.runescape.wiki/api/v1/osrs/1h?timestamp=${timestamp}`
      : 'https://prices.runescape.wiki/api/v1/osrs/1h'
    const response = await axios.get(url)
    return response
  } catch (error) {
    console.error('Error fetching 1-hour data:', error)
    throw error
  }
}
