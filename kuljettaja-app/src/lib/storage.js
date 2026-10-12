import AsyncStorage from '@react-native-async-storage/async-storage'

// JSON-arvot puhelimen muistiin. Virheet niellään: asetukset toimivat silloin
// istunnon ajan, vaikka tallennus ei onnistuisi.

export async function readJson(key) {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function writeJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Tallennus ei onnistunut - arvo pysyy muistissa istunnon ajan.
  }
}
