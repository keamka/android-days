'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface DaysWidgetProps {
  day: number | null;
  dateLabel: string;
  error?: boolean;
  dark?: boolean;
  compact?: boolean;
}

// Keep the reference's cream paper surface in either system theme.
export function DaysWidget({ day, dateLabel, error = false, compact = false }: DaysWidgetProps) {
  return (
    <FlexWidget
      style={{
        width: 'match_parent', height: 'match_parent',
        paddingHorizontal: compact ? 16 : 24, paddingVertical: compact ? 14 : 22,
        backgroundColor: '#F8F5EF', borderRadius: 32,
        alignItems: 'center', justifyContent: 'center', flexGap: compact ? 6 : 10,
      }}
      clickAction="OPEN_APP"
      accessibilityLabel={day === null ? 'Open Days++ to set your birthday' : `${dateLabel}. Day ${day} of your life. Open Days++`}
    >
      <TextWidget
        text={dateLabel}
        style={{ width: 'match_parent', color: '#191919', fontFamily: 'WidgetSerif', fontWeight: 'bold', fontSize: compact ? 25 : 32, textAlign: 'center', adjustsFontSizeToFit: true }}
        maxLines={1}
      />
      <TextWidget
        text={day === null ? (error ? 'Open app' : 'Set your birthday') : 'Today you are living'}
        style={{ width: 'match_parent', color: '#615E59', fontSize: compact ? 13 : 16, textAlign: 'center', adjustsFontSizeToFit: true }}
        maxLines={1}
      />
      <TextWidget
        text={day === null ? 'Day —' : `Day ${day.toLocaleString()}`}
        style={{ width: 'match_parent', color: '#191919', fontFamily: 'WidgetSerif', fontWeight: 'bold', fontSize: compact ? 38 : 52, textAlign: 'center', adjustsFontSizeToFit: true }}
        maxLines={1}
      />
    </FlexWidget>
  );
}
