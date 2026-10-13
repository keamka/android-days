import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseBirthday } from '../domain/lifeDay';

const BIRTHDAY_KEY = '@days-plus-plus/birthday/v1';

/** Date-only storage shared by the foreground app and headless widget task. */
export async function loadBirthday(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(BIRTHDAY_KEY);
  if (stored === null) return null;
  if (!parseBirthday(stored)) {
    throw new Error('Your saved birthday could not be read. Please choose it again.');
  }
  return stored;
}

export async function saveBirthday(value: string): Promise<void> {
  if (!parseBirthday(value)) throw new Error('Please choose a valid birthday.');
  await AsyncStorage.setItem(BIRTHDAY_KEY, value);
}
