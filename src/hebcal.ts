export interface HebcalEvent {
  title: string;
  date: string; // ISO date or datetime
  category: string;
  subcat?: string;
  yomtov?: boolean;
}

export type HebcalByDate = Record<string, HebcalEvent[]>;

export async function fetchHebcalEvents(
  startISO: string,
  endISO: string,
  geonameId: string
): Promise<HebcalByDate> {
  const url = new URL("https://www.hebcal.com/hebcal");
  url.searchParams.set("cfg", "json");
  url.searchParams.set("v", "1");
  url.searchParams.set("start", startISO);
  url.searchParams.set("end", endISO);
  url.searchParams.set("maj", "on");
  url.searchParams.set("min", "on");
  url.searchParams.set("mod", "on");
  url.searchParams.set("ss", "on");
  url.searchParams.set("mf", "on");
  url.searchParams.set("c", "on");
  url.searchParams.set("geonameid", geonameId);
  url.searchParams.set("M", "on");
  url.searchParams.set("lg", "fr");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`hebcal fetch failed: ${res.status}`);
  const data = await res.json();

  const byDate: HebcalByDate = {};
  for (const item of data.items ?? []) {
    const dayISO = (item.date as string).slice(0, 10);
    const entry: HebcalEvent = {
      title: item.title,
      date: item.date,
      category: item.category,
      subcat: item.subcat,
      yomtov: item.yomtov === true,
    };
    (byDate[dayISO] ??= []).push(entry);
  }
  return byDate;
}
