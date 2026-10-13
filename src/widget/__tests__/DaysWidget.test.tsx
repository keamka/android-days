import { buildWidgetTree } from 'react-native-android-widget/src/api/build-widget-tree';
import { DaysWidget } from '../DaysWidget';

// Exercise the library's real primitive/style conversion, not mocked RN Views.
describe('DaysWidget native tree conversion', () => {
  test.each([false, true])('converts a counter in dark=%s', (dark) => {
    const tree = buildWidgetTree(<DaysWidget day={12345} dateLabel="Sep 26" dark={dark} />);
    expect(tree.type).toBe('LinearLayoutWidget');
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('Day 12,345');
    expect(serialized).toContain('OPEN_APP');
    expect(serialized).not.toContain('REFRESH');
    expect(serialized).not.toContain('YOUR LIFE, TODAY');
    expect(serialized).toContain('Today you are living');
    expect(serialized).toContain('WidgetSerif');
    expect(tree.children).toHaveLength(3);
    expect(serialized).toContain('Sep 26');
  });

  test('converts compact setup and error states without invalid primitives', () => {
    const setup = buildWidgetTree(<DaysWidget day={null} dateLabel="Sep 26" compact />);
    expect(JSON.stringify(setup)).toContain('Set your birthday');
    const error = buildWidgetTree(<DaysWidget day={null} dateLabel="Sep 26" compact error />);
    expect(JSON.stringify(error)).toContain('Open app');
  });
});
