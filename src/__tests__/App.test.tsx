import AsyncStorage from '@react-native-async-storage/async-storage';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { requestPinWidget } from 'react-native-android-widget';
import App from '../../App';
import { formatBirthday } from '../domain/lifeDay';
import { loadBirthday, saveBirthday } from '../storage/birthday';
import { refreshWidgets, WIDGET_NAME } from '../widget/widgetTaskHandler';

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaProvider: View, SafeAreaView: View };
});
jest.mock('react-native-android-widget', () => ({ requestPinWidget: jest.fn() }));
jest.mock('../widget/widgetTaskHandler', () => ({
  WIDGET_NAME: 'DaysWidget',
  refreshWidgets: jest.fn(),
}));

const NOW = new Date(2026, 0, 3, 12);
const mockOpenPicker = jest.mocked(DateTimePickerAndroid.open);
const mockRefreshWidgets = jest.mocked(refreshWidgets);
const mockPinWidget = jest.mocked(requestPinWidget);

async function chooseDate(date: Date) {
  await fireEvent.press(screen.getByRole('button', { name: 'Choose birthday' }));
  const options = mockOpenPicker.mock.calls.at(-1)![0];
  expect(options.onValueChange).toEqual(expect.any(Function));
  await act(async () => {
    options.onValueChange!({ nativeEvent: { timestamp: date.getTime(), utcOffset: 0 } }, date);
  });
  return options;
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  jest.clearAllMocks();
  mockOpenPicker.mockReset();
  mockRefreshWidgets.mockReset().mockResolvedValue(undefined);
  mockPinWidget.mockReset().mockResolvedValue(true);
  await AsyncStorage.clear();
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('first launch chooses a date, saves it and displays the inclusive day of life', async () => {
  await render(<App />);

  expect(screen.getByRole('header', { name: 'Birthday' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Show my day' })).toBeDisabled();
  expect(screen.queryByTestId('day-count')).toBeNull();

  const picker = await chooseDate(new Date(2026, 0, 1, 12));
  expect(picker).toMatchObject({ mode: 'date', display: 'spinner', maximumDate: NOW });
  expect(screen.getByText(formatBirthday('2026-01-01'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Show my day' })).toBeEnabled();

  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));

  expect(screen.getByTestId('day-count')).toHaveTextContent('Day 3');
  expect(screen.getByLabelText('Day 3 of your life')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Show my day' })).toBeNull();
  await expect(loadBirthday()).resolves.toBe('2026-01-01');
  expect(mockRefreshWidgets).toHaveBeenCalled();
});

test('setup and day screen omit branding, slogans, privacy notes and widget prose', async () => {
  const removedCopy = /days\+\+|perspective|Every day is|Your story starts|Find out which day|day it all began|YOUR BIRTHDAY|Just for you|Stored locally|never uploaded|no account|no tracking|This day is yours|TODAY, YOU ARE LIVING|extraordinary life|SINCE |Not a countdown|make today count|Keep your day on your home screen|Refreshes periodically|tap Refresh|Your birthday is day 1/i;
  await render(<App />);
  expect(screen.queryAllByText(removedCopy)).toHaveLength(0);
  expect(screen.getAllByRole('button')).toHaveLength(2);

  await chooseDate(new Date(2026, 0, 1, 12));
  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));

  expect(screen.queryAllByText(removedCopy)).toHaveLength(0);
  expect(screen.getByText(NOW.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))).toBeOnTheScreen();
  expect(screen.getByTestId('day-count')).toHaveTextContent('Day 3');
  expect(screen.getByText('Birthday')).toBeOnTheScreen();
  expect(screen.getByText(formatBirthday('2026-01-01'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Edit birthday' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /Add home-screen widget/ })).toBeOnTheScreen();
  expect(screen.getAllByRole('button')).toHaveLength(2);
});

test('loads the persisted birthday again after unmounting and reopening', async () => {
  await render(<App />);
  await chooseDate(new Date(2026, 0, 2, 12));
  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));
  expect(screen.getByLabelText('Day 2 of your life')).toBeOnTheScreen();

  await cleanup();
  jest.setSystemTime(new Date(2026, 0, 4, 12));
  await render(<App />);

  expect(screen.getByLabelText('Day 3 of your life')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Choose birthday' })).toBeNull();
});

test('cancelling an edit preserves the saved birthday and discards the draft', async () => {
  await saveBirthday('2026-01-01');
  jest.mocked(AsyncStorage.setItem).mockClear();
  await render(<App />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit birthday' }));
  await chooseDate(new Date(2026, 0, 2, 12));
  expect(screen.getByText(formatBirthday('2026-01-02'))).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.getByLabelText('Day 3 of your life')).toBeOnTheScreen();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  await expect(loadBirthday()).resolves.toBe('2026-01-01');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit birthday' }));
  expect(screen.getByText(formatBirthday('2026-01-01'))).toBeOnTheScreen();
});

test('saving an edit replaces the persisted birthday and recalculates the count', async () => {
  await saveBirthday('2026-01-01');
  await render(<App />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit birthday' }));
  const picker = await chooseDate(new Date(2026, 0, 3, 12));
  expect(picker.value).toEqual(new Date(2026, 0, 1, 12));

  await fireEvent.press(screen.getByRole('button', { name: 'Save birthday' }));

  expect(screen.getByLabelText('Day 1 of your life')).toBeOnTheScreen();
  await expect(loadBirthday()).resolves.toBe('2026-01-03');
});

test('shows a load error and allows recovery by choosing and saving a birthday', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage is unavailable'));
  await render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('Storage is unavailable');
  expect(screen.getByRole('button', { name: 'Show my day' })).toBeDisabled();

  await chooseDate(new Date(2026, 0, 1, 12));
  expect(screen.queryByRole('alert')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));
  expect(screen.getByLabelText('Day 3 of your life')).toBeOnTheScreen();
});

test('shows corrupted persisted data as a recoverable setup error', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('not-a-date');
  await render(<App />);
  expect(screen.getByRole('alert')).toHaveTextContent('Your saved birthday could not be read. Please choose it again.');
  expect(screen.getByRole('button', { name: 'Choose birthday' })).toBeOnTheScreen();
  expect(screen.queryByTestId('day-count')).toBeNull();
});

test('save failure retains the draft and original storage, and permits retry', async () => {
  await saveBirthday('2026-01-01');
  await render(<App />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit birthday' }));
  await chooseDate(new Date(2026, 0, 2, 12));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Disk full'));
  await fireEvent.press(screen.getByRole('button', { name: 'Save birthday' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Could not save your birthday. Please try again.');
  expect(screen.getByText(formatBirthday('2026-01-02'))).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Save birthday' })).toBeEnabled();
  await expect(loadBirthday()).resolves.toBe('2026-01-01');

  await fireEvent.press(screen.getByRole('button', { name: 'Save birthday' }));
  expect(screen.getByLabelText('Day 2 of your life')).toBeOnTheScreen();
  expect(screen.queryByRole('alert')).toBeNull();
  await expect(loadBirthday()).resolves.toBe('2026-01-02');
});

test('rejects a future date from the picker without persisting it', async () => {
  await render(<App />);
  await chooseDate(new Date(2026, 0, 4, 12));
  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Birthday cannot be in the future.');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(screen.queryByTestId('day-count')).toBeNull();
});

test('does not display a misleading count for a future persisted birthday', async () => {
  await saveBirthday('2026-01-04');
  await render(<App />);

  expect(screen.getByLabelText('Day count unavailable')).toHaveTextContent('Day —');
  expect(screen.getByRole('alert')).toHaveTextContent('Birthday cannot be in the future. Check your birthday or device date.');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit birthday' }));
  await chooseDate(new Date(2026, 0, 3, 12));
  await fireEvent.press(screen.getByRole('button', { name: 'Save birthday' }));
  expect(screen.getByLabelText('Day 1 of your life')).toBeOnTheScreen();
});

test('reports picker errors without enabling save or writing storage', async () => {
  await render(<App />);
  await fireEvent.press(screen.getByRole('button', { name: 'Choose birthday' }));
  const picker = mockOpenPicker.mock.calls[0]![0];
  await act(async () => { picker.onError!(new Error('Native picker unavailable')); });

  expect(screen.getByRole('alert')).toHaveTextContent('Could not open the date picker. Please try again.');
  expect(screen.getByRole('button', { name: 'Show my day' })).toBeDisabled();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

test('keeps a successful birthday save when native widget refresh fails', async () => {
  await render(<App />);
  await chooseDate(new Date(2026, 0, 1, 12));
  mockRefreshWidgets.mockRejectedValue(new Error('Native widget unavailable'));
  await fireEvent.press(screen.getByRole('button', { name: 'Show my day' }));

  expect(screen.getByLabelText('Day 3 of your life')).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toHaveTextContent('Widget could not refresh. Reopen the app to retry.');
  expect(screen.queryByText(/tap Refresh/i)).toBeNull();
  await expect(loadBirthday()).resolves.toBe('2026-01-01');
});

test.each(['unsupported', 'failure'] as const)('provides manual placement instructions when widget pinning reports %s', async (reason) => {
  await saveBirthday('2026-01-01');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  if (reason === 'unsupported') mockPinWidget.mockResolvedValue(false);
  else mockPinWidget.mockRejectedValue(new Error('Pinning failed'));
  await render(<App />);

  await fireEvent.press(screen.getByRole('button', { name: /Add home-screen widget/ }));

  expect(mockPinWidget).toHaveBeenCalledWith({ widgetName: WIDGET_NAME });
  expect(alert).toHaveBeenCalledWith('Add Days++ to your home screen', expect.stringContaining('Touch and hold an empty space'));
});
