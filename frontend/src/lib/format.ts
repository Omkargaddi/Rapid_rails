export function hhmm(dt: string): string {
  return dt.slice(11, 16);
}

export function dateOf(dt: string): string {
  return dt.slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function shortDate(dt: string): string {
  const [y, m, d] = dt.slice(0, 10).split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[wd]} ${d} ${MONTHS[m - 1]}`;
}

/** Whole days between two naive dates (for "+1" day badges). */
export function dayDiff(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function duration(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${String(m).padStart(d || h ? 2 : 1, "0")}m`);
  return parts.join(" ");
}

export function stationLabel(s: { code: string | null; name: string }): string {
  return s.code ? `${s.name} (${s.code})` : s.name;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
