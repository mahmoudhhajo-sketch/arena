export type ClubEra = { userId?: string | null; isBot?: boolean; startedAt?: string };

/** Missing takeover dates must not attribute an old bot's achievements to a manager. */
export function belongsToManager(era: ClubEra | undefined, date: string | Date | null | undefined): boolean {
  if (!era || era.isBot || !era.userId || !era.startedAt || !date) return false;
  return Number.isFinite(+new Date(date)) && +new Date(date) >= +new Date(era.startedAt);
}

export function firstWeekRefund(registeredAt: string | undefined, entries: any[], clubId: string) {
  const bill = Date.parse('2026-10-12T04:00:00Z');
  if (!registeredAt || !(Date.parse(registeredAt) > bill - 7 * 86400000 && Date.parse(registeredAt) <= bill)) return [];
  const categories = new Set(['Spelarlöner','Tränare','Läkare','Talangscout','Arenadrift','Magi']);
  return entries.filter(e => e.clubId === clubId && String(e.id).startsWith('week-') &&
    +new Date(e.date) === bill && e.amount < 0 && categories.has(e.category));
}
