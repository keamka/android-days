import type { ReactElement } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getWidgetInfo,
  requestWidgetUpdateById,
  type WidgetInfo,
  type WidgetTaskHandlerProps,
} from 'react-native-android-widget';
import { saveBirthday } from '../../storage/birthday';
import { DaysWidget, type DaysWidgetProps } from '../DaysWidget';
import { loadWidgetState, refreshWidgets, widgetTaskHandler, WIDGET_NAME } from '../widgetTaskHandler';

// Keep native widget registration and rendering out of these headless task tests.
jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  getWidgetInfo: jest.fn(),
  requestWidgetUpdateById: jest.fn(),
}));

const NOW = new Date(2026, 0, 3, 12);
const mockGetWidgetInfo = jest.mocked(getWidgetInfo);
const mockUpdateById = jest.mocked(requestWidgetUpdateById);

type Representation = {
  light: ReactElement<DaysWidgetProps>;
  dark: ReactElement<DaysWidgetProps>;
};

function widgetInfo(overrides: Partial<WidgetInfo> = {}): WidgetInfo {
  return {
    widgetName: WIDGET_NAME,
    widgetId: 42,
    width: 320,
    height: 180,
    screenInfo: { screenWidthDp: 400, screenHeightDp: 800, density: 2, densityDpi: 320 },
    ...overrides,
  };
}

function task(overrides: Partial<WidgetTaskHandlerProps> = {}) {
  return {
    widgetInfo: widgetInfo(),
    widgetAction: 'WIDGET_ADDED' as const,
    renderWidget: jest.fn(),
    ...overrides,
  };
}

function expectRepresentation(actual: unknown, expected: Partial<DaysWidgetProps>) {
  const representation = actual as Representation;
  expect(representation.light.type).toBe(DaysWidget);
  expect(representation.dark.type).toBe(DaysWidget);
  expect(representation.light.props).toEqual(expect.objectContaining(expected));
  expect(representation.light.props.dark).toBeUndefined();
  expect(representation.dark.props).toEqual(expect.objectContaining({ ...expected, dark: true }));
}

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.clearAllMocks();
  mockGetWidgetInfo.mockReset().mockResolvedValue([]);
  mockUpdateById.mockReset().mockResolvedValue(undefined);
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('widgetTaskHandler', () => {
  test.each([
    ['deleted widgets', { widgetAction: 'WIDGET_DELETED' }],
    ['unknown widgets', { widgetInfo: widgetInfo({ widgetName: 'AnotherWidget' }) }],
    ['open-app clicks', { widgetAction: 'WIDGET_CLICK', clickAction: 'OPEN_APP' }],
    ['unrecognized clicks', { widgetAction: 'WIDGET_CLICK', clickAction: 'UNKNOWN' }],
    ['clicks without an action', { widgetAction: 'WIDGET_CLICK' }],
  ] satisfies Array<[string, Partial<WidgetTaskHandlerProps>]>)('ignores %s without reading storage or rendering', async (_name, overrides) => {
    const props = task(overrides);

    await widgetTaskHandler(props);

    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(props.renderWidget).not.toHaveBeenCalled();
    expect(mockUpdateById).not.toHaveBeenCalled();
  });

  test.each([
    ['add', { widgetAction: 'WIDGET_ADDED' }],
    ['update', { widgetAction: 'WIDGET_UPDATE' }],
    ['resize', { widgetAction: 'WIDGET_RESIZED' }],
    ['refresh', { widgetAction: 'WIDGET_CLICK', clickAction: 'REFRESH' }],
  ] satisfies Array<[string, Partial<WidgetTaskHandlerProps>]>)('loads persisted birthday and recomputes the day on %s', async (_name, overrides) => {
    await saveBirthday('2026-01-01');
    const renderWidget = jest.fn();
    const props = task({ ...overrides, renderWidget });

    await widgetTaskHandler(props);
    expectRepresentation(renderWidget.mock.calls[0]![0], {
      day: 3, error: false, compact: false,
      dateLabel: NOW.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
    });

    const tomorrow = new Date(2026, 0, 4, 0, 1);
    jest.setSystemTime(tomorrow);
    await widgetTaskHandler(props);
    expectRepresentation(renderWidget.mock.calls[1]![0], {
      day: 4,
      dateLabel: tomorrow.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
    });

    await saveBirthday('2026-01-02');
    await widgetTaskHandler(props);
    expectRepresentation(renderWidget.mock.calls[2]![0], { day: 3 });
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(3);
    expect(renderWidget).toHaveBeenCalledTimes(3);
  });

  test.each([
    [279, 180, true],
    [320, 149, true],
    [280, 150, false],
  ])('uses width %s and height %s to select compact=%s', async (width, height, compact) => {
    const renderWidget = jest.fn();
    await widgetTaskHandler(task({ widgetInfo: widgetInfo({ width, height }), renderWidget }));
    expectRepresentation(renderWidget.mock.calls[0]![0], { day: null, error: false, compact });
  });

  test('replaces a previous count with a safe error state when storage fails', async () => {
    await saveBirthday('2026-01-01');
    const renderWidget = jest.fn();
    const props = task({ renderWidget });
    await widgetTaskHandler(props);
    expectRepresentation(renderWidget.mock.calls[0]![0], { day: 3, error: false });

    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(widgetTaskHandler(props)).resolves.toBeUndefined();
    expectRepresentation(renderWidget.mock.calls[1]![0], { day: null, error: true });
  });
});

describe('loadWidgetState', () => {
  test('returns setup state when no birthday is stored', async () => {
    await expect(loadWidgetState(NOW)).resolves.toEqual({
      day: null,
      dateLabel: NOW.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
      error: false,
    });
  });

  test.each(['not-a-date', '2025-02-29', '2026-01-04'])('hides invalid or future persisted date %s', async (stored) => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(stored);
    await expect(loadWidgetState(NOW)).resolves.toEqual({
      day: null,
      dateLabel: NOW.toLocaleDateString(undefined, { day: 'numeric', month: 'long' }),
      error: true,
    });
  });

  test('uses the supplied local date and counts the birthday as day one', async () => {
    await saveBirthday('2026-01-02');
    await expect(loadWidgetState(new Date(2026, 0, 2, 23, 59))).resolves.toMatchObject({ day: 1, error: false });
  });
});

describe('refreshWidgets', () => {
  test('updates every widget ID using its own dimensions and both themes', async () => {
    await saveBirthday('2026-01-01');
    const widgets = [widgetInfo({ widgetId: 7 }), widgetInfo({ widgetId: 81, width: 240 })];
    mockGetWidgetInfo.mockResolvedValue(widgets);

    await refreshWidgets();

    expect(mockGetWidgetInfo).toHaveBeenCalledWith(WIDGET_NAME);
    expect(mockUpdateById).toHaveBeenCalledTimes(2);
    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    for (const [index, info] of widgets.entries()) {
      const request = mockUpdateById.mock.calls[index]![0];
      expect(request).toMatchObject({ widgetName: WIDGET_NAME, widgetId: info.widgetId });
      expectRepresentation(await request.renderWidget(info), {
        day: 3, error: false, compact: info.width < 280,
      });
    }
  });

  test('sends safe error state to every widget on storage failure', async () => {
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Storage unavailable'));
    const widgets = [widgetInfo({ widgetId: 1 }), widgetInfo({ widgetId: 2 })];
    mockGetWidgetInfo.mockResolvedValue(widgets);

    await expect(refreshWidgets()).resolves.toBeUndefined();

    expect(mockUpdateById).toHaveBeenCalledTimes(2);
    for (const [index, info] of widgets.entries()) {
      expectRepresentation(await mockUpdateById.mock.calls[index]![0].renderWidget(info), { day: null, error: true });
    }
  });

  test('does not request updates when no widgets are installed', async () => {
    await expect(refreshWidgets()).resolves.toBeUndefined();
    expect(mockUpdateById).not.toHaveBeenCalled();
  });

  test('does no native or storage work on non-Android platforms', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await refreshWidgets();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(mockGetWidgetInfo).not.toHaveBeenCalled();
    expect(mockUpdateById).not.toHaveBeenCalled();
  });

  test('waits for every JavaScript update request to resolve', async () => {
    mockGetWidgetInfo.mockResolvedValue([widgetInfo({ widgetId: 1 }), widgetInfo({ widgetId: 2 })]);
    const releases: Array<() => void> = [];
    let allUpdatesStarted!: () => void;
    const started = new Promise<void>((resolve) => { allUpdatesStarted = resolve; });
    mockUpdateById.mockImplementation(() => new Promise<void>((resolve) => {
      releases.push(resolve);
      if (releases.length === 2) allUpdatesStarted();
    }));
    let finished = false;
    const refresh = refreshWidgets().then(() => { finished = true; });
    await started;
    expect(releases).toHaveLength(2);
    expect(finished).toBe(false);
    releases[0]!();
    await Promise.resolve();
    expect(finished).toBe(false);
    releases[1]!();
    await refresh;
    expect(finished).toBe(true);
  });

  test('propagates rejected update requests so the app can warn the user', async () => {
    mockGetWidgetInfo.mockResolvedValue([widgetInfo()]);
    mockUpdateById.mockRejectedValueOnce(new Error('Native update failed'));
    await expect(refreshWidgets()).rejects.toThrow('Native update failed');
  });
});
