import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { requestPinWidget } from 'react-native-android-widget';
import { birthdayToDate, formatBirthday, getDayOfLife, localDateString, validateBirthday } from './src/domain/lifeDay';
import { loadBirthday, saveBirthday } from './src/storage/birthday';
import { refreshWidgets, WIDGET_NAME } from './src/widget/widgetTaskHandler';

const palettes = {
  light: { background: '#F3F0E9', surface: '#FAF7F0', ink: '#24231F', muted: '#716E66', border: '#DCD7CD', accent: '#24231F', buttonInk: '#FAF7F0', error: '#A3342A' },
  dark: { background: '#171715', surface: '#242420', ink: '#F3F0E9', muted: '#B8B4AA', border: '#44433D', accent: '#F3F0E9', buttonInk: '#242420', error: '#F0A49B' },
};

export function DaysScreen() {
  const dark = useColorScheme() === 'dark';
  const colors = dark ? palettes.dark : palettes.light;
  const [birthday, setBirthday] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const updateWidgets = useCallback(async () => {
    try {
      await refreshWidgets();
      setWidgetNotice(null);
    } catch {
      setWidgetNotice('Widget could not refresh. Reopen the app to retry.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void loadBirthday().then((saved) => {
      if (!mounted) return;
      setBirthday(saved);
      setDraft(saved);
      setEditing(saved === null);
    }).catch((cause: unknown) => {
      if (!mounted) return;
      setError(cause instanceof Error ? cause.message : 'Could not load your birthday. Please try again.');
      setEditing(true);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (loading) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(new Date());
        void updateWidgets();
      }
    });
    // Only a foreground clock. Background refresh belongs to the native widget.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') setNow(new Date());
    }, 1000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [loading, updateWidgets]);

  const today = localDateString(now);
  useEffect(() => {
    if (!loading) void updateWidgets();
  }, [today, loading, updateWidgets]);

  function chooseBirthday() {
    const todayDate = new Date();
    const initial = draft && !validateBirthday(draft, todayDate) ? birthdayToDate(draft) : new Date(2000, 0, 1, 12);
    DateTimePickerAndroid.open({
      value: initial > todayDate ? todayDate : initial,
      mode: 'date',
      display: 'spinner',
      minimumDate: new Date(1900, 0, 1),
      maximumDate: todayDate,
      onValueChange: (_event, selected) => {
        setDraft(localDateString(selected));
        setError(null);
      },
      onError: () => setError('Could not open the date picker. Please try again.'),
    });
  }

  async function save() {
    const validation = validateBirthday(draft ?? '');
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError(null);
    try {
      await saveBirthday(draft!);
      setBirthday(draft);
      setEditing(false);
      setNow(new Date());
      await updateWidgets();
    } catch {
      setError('Could not save your birthday. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function addWidget() {
    try {
      if (await requestPinWidget({ widgetName: WIDGET_NAME })) return;
    } catch {
      // Not every launcher supports the pinning API; manual placement still works.
    }
    Alert.alert('Add Days++ to your home screen', 'Touch and hold an empty space on your home screen, choose Widgets, find Days++, then drag it onto your screen.');
  }

  const birthdayError = birthday ? validateBirthday(birthday, now) : null;
  const day = birthday && !birthdayError ? getDayOfLife(birthday, now) : null;
  const textColor = { color: colors.ink };
  const mutedColor = { color: colors.muted };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading your birthday" color={colors.ink} /></View>
        ) : editing || !birthday ? (
          <View style={styles.section}>
            <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.title, textColor]} accessibilityRole="header">Birthday</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Choose birthday" onPress={chooseBirthday} disabled={saving} style={({ pressed }) => [styles.dateButton, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                <Text style={[styles.dateText, textColor]}>{draft ? formatBirthday(draft) : 'Choose a date'}</Text>
                <Text style={mutedColor}>↗</Text>
              </Pressable>
              {error && <Text accessibilityRole="alert" style={[styles.message, { color: colors.error }]}>{error}</Text>}
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: !draft || saving, busy: saving }} disabled={!draft || saving} onPress={() => void save()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: !draft || saving || pressed ? 0.55 : 1 }]}>
                <Text style={[styles.primaryButtonText, { color: colors.buttonInk }]}>{saving ? 'Saving…' : birthday ? 'Save birthday' : 'Show my day'}</Text>
              </Pressable>
              {birthday && <Pressable accessibilityRole="button" disabled={saving} onPress={() => { setDraft(birthday); setEditing(false); setError(null); }} style={styles.textButton}><Text style={[styles.link, textColor]}>Cancel</Text></Pressable>}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View style={[styles.counterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.today, mutedColor]}>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              <Text testID="day-count" accessibilityRole="header" accessibilityLabel={day === null ? 'Day count unavailable' : `Day ${day} of your life`} adjustsFontSizeToFit minimumFontScale={0.4} numberOfLines={1} style={[styles.counter, textColor]}>Day {day?.toLocaleString() ?? '—'}</Text>
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
              <Text style={[styles.birthdayLabel, mutedColor]}>Birthday</Text>
              <Text style={[styles.dateText, textColor]}>{formatBirthday(birthday)}</Text>
            </View>
            {birthdayError && <Text accessibilityRole="alert" style={[styles.message, { color: colors.error }]}>{birthdayError} Check your birthday or device date.</Text>}
            <Pressable accessibilityRole="button" onPress={() => { setDraft(birthday); setEditing(true); setError(null); }} style={styles.textButton}><Text style={[styles.link, textColor]}>Edit birthday</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => void addWidget()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.65 : 1 }]}><Text style={[styles.primaryButtonText, { color: colors.buttonInk }]}>Add home-screen widget  ↗</Text></Pressable>
            {widgetNotice && <Text accessibilityRole="alert" style={[styles.message, { color: colors.error }]}>{widgetNotice}</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><DaysScreen /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: 36, width: '100%', maxWidth: 580, alignSelf: 'center' },
  section: { gap: 16 },
  title: { fontFamily: 'serif', fontSize: 32, textAlign: 'center' },
  form: { padding: 24, borderRadius: 24, borderWidth: 1, gap: 20 },
  dateButton: { borderWidth: 1, borderRadius: 14, padding: 18, minHeight: 56, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 18, flexShrink: 1, textAlign: 'center' },
  primaryButton: { minHeight: 54, borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  textButton: { minHeight: 48, padding: 12, alignItems: 'center', justifyContent: 'center' },
  link: { fontSize: 15, textDecorationLine: 'underline' },
  loading: { padding: 80 },
  today: { fontSize: 14, textAlign: 'center' },
  counterCard: { borderRadius: 28, borderWidth: 1, padding: 28, alignItems: 'center' },
  counter: { fontFamily: 'serif', fontSize: 64, fontWeight: '400', letterSpacing: -2, fontVariant: ['tabular-nums'], marginVertical: 28, width: '100%', textAlign: 'center' },
  cardDivider: { height: 1, width: '100%', marginBottom: 24 },
  birthdayLabel: { fontSize: 13, marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 22 },
});
