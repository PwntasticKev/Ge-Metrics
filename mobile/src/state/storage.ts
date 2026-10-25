import AsyncStorage from '@react-native-async-storage/async-storage'

// JSON values in AsyncStorage with validation on the way out; bad or missing
// data falls back to the default instead of crashing the app.
export async function loadJson<T> (key: string, fallback: T, isValid: (value: unknown) => value is T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : fallback
  } catch (error) {
    console.warn(`[storage] could not read ${key}, using defaults`, error)
    return fallback
  }
}

export async function saveJson (key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[storage] could not save ${key}`, error)
  }
}
