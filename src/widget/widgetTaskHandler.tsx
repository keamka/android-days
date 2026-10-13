'use no memo';

import { Platform } from 'react-native';
import { getWidgetInfo, requestWidgetUpdateById, type WidgetInfo, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getDayOfLife } from '../domain/lifeDay';
import { loadBirthday } from '../storage/birthday';
import { DaysWidget } from './DaysWidget';

export const WIDGET_NAME = 'DaysWidget';

export async function loadWidgetState(now = new Date()) {
  const dateLabel = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
  try {
    const birthday = await loadBirthday();
    return { day: birthday ? getDayOfLife(birthday, now) : null, dateLabel, error: false };
  } catch {
    // Do not leave a misleading old count on storage failure or invalid data.
    return { day: null, dateLabel, error: true };
  }
}

function representation(state: Awaited<ReturnType<typeof loadWidgetState>>, info: WidgetInfo) {
  const compact = info.height < 150 || info.width < 280;
  return {
    light: <DaysWidget {...state} compact={compact} />,
    dark: <DaysWidget {...state} compact={compact} dark />,
  };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== WIDGET_NAME || props.widgetAction === 'WIDGET_DELETED') return;
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction !== 'REFRESH') return;
  const state = await loadWidgetState();
  props.renderWidget(representation(state, props.widgetInfo));
}

export async function refreshWidgets(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const state = await loadWidgetState();
  const widgets = await getWidgetInfo(WIDGET_NAME);
  // The by-id API awaits its render callback, unlike the library's bulk API.
  await Promise.all(widgets.map(({ widgetId }) => requestWidgetUpdateById({
    widgetName: WIDGET_NAME,
    widgetId,
    renderWidget: (info) => representation(state, info),
  })));
}
