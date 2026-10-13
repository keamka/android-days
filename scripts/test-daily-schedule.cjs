// Execute the actual native calendar helper on a JDK, without an Android emulator.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, '.cache/daily-schedule-test');
fs.mkdirSync(out, { recursive: true });
const source = fs.readFileSync(path.join(root, 'plugins/android/DailyWidgetSchedule.java'), 'utf8');
fs.writeFileSync(path.join(out, 'DailyWidgetSchedule.java'), source.replace('package __PACKAGE__.widget;\n', ''));
fs.writeFileSync(path.join(out, 'DailyWidgetScheduleTest.java'), `
import java.time.*;
import java.util.TimeZone;
public class DailyWidgetScheduleTest {
    static void check(String now, String zone, String expected) {
        long actual = DailyWidgetSchedule.nextMidnight(Instant.parse(now).toEpochMilli(), TimeZone.getTimeZone(zone));
        if (actual != Instant.parse(expected).toEpochMilli()) throw new AssertionError(now + " / " + zone + " -> " + Instant.ofEpochMilli(actual));
    }
    public static void main(String[] args) {
        check("2026-01-03T12:00:00Z", "UTC", "2026-01-04T00:00:00Z");
        check("2026-01-03T00:00:00Z", "UTC", "2026-01-04T00:00:00Z");
        check("2026-01-03T23:59:59.999Z", "UTC", "2026-01-04T00:00:00Z");
        check("2026-03-08T05:00:00Z", "America/New_York", "2026-03-09T04:00:00Z");
        check("2026-11-01T04:00:00Z", "America/New_York", "2026-11-02T05:00:00Z");
        check("2024-02-28T12:00:00Z", "UTC", "2024-02-29T00:00:00Z");
        check("2026-12-31T12:00:00Z", "UTC", "2027-01-01T00:00:00Z");
        check("2026-01-03T12:00:00Z", "Pacific/Kiritimati", "2026-01-04T10:00:00Z");
        check("2011-12-30T09:00:00Z", "Pacific/Apia", "2011-12-30T10:00:00Z");
        System.out.println("9 native next-midnight calendar checks passed");
    }
}
`);
const java = (name) => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', name) : name;
execFileSync(java('javac'), ['-d', out, path.join(out, 'DailyWidgetSchedule.java'), path.join(out, 'DailyWidgetScheduleTest.java')], { stdio: 'inherit' });
execFileSync(java('java'), ['-cp', out, 'DailyWidgetScheduleTest'], { stdio: 'inherit' });
