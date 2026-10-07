const SWEDISH_WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const swedishClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Stockholm',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

/** Returns the next Swedish weekly server time in the visitor's local zone. */
export function localWeeklyTimeFromSweden(
  weekday: number,
  hour: number,
  minute = 0,
  now = new Date(),
  localTimeZone?: string
): string {
  const start = Math.floor(now.getTime() / 900_000) * 900_000;
  const wantedDay = SWEDISH_WEEKDAYS[weekday];

  for (let step = 0; step <= 8 * 24 * 4; step += 1) {
    const candidate = new Date(start + step * 900_000);
    const parts = Object.fromEntries(
      swedishClock.formatToParts(candidate).map(part => [part.type, part.value])
    );
    if (parts.weekday === wantedDay && Number(parts.hour) === hour && Number(parts.minute) === minute) {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      };
      if (localTimeZone) options.timeZone = localTimeZone;
      return new Intl.DateTimeFormat('sv-SE', options).format(candidate).replace(':', '.');
    }
  }

  return '';
}
