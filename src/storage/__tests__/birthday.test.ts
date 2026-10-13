import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadBirthday, saveBirthday } from '../birthday';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('returns null before setup', async () => {
  expect(await loadBirthday()).toBeNull();
});

test('round trips a date without a timestamp', async () => {
  await saveBirthday('2000-02-29');
  expect(await loadBirthday()).toBe('2000-02-29');
});

test('rejects invalid input without overwriting the birthday', async () => {
  await saveBirthday('1990-01-01');
  await expect(saveBirthday('2001-02-29')).rejects.toThrow('valid birthday');
  expect(await loadBirthday()).toBe('1990-01-01');
});

test('surfaces corrupted saved data', async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('not-a-date');
  await expect(loadBirthday()).rejects.toThrow('choose it again');
});

test('surfaces storage failures', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disk full'));
  await expect(saveBirthday('2000-01-01')).rejects.toThrow('Disk full');
});
