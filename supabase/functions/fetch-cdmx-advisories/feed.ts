export type Category = 'roads' | 'rain' | 'transport';
export interface Advisory { title: string; url: string; source: string; publishedAt: string; }
export function normalizeItems(items: any[], now: number): Advisory[] {
  const seen = new Set<string>();
  return items.flatMap(item => {
    const title = String(item.title || '').trim();
    const source = typeof item.source === 'string' ? item.source : item.source?.['#text'];
    const date = Date.parse(item.pubDate);
    const text = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!title || !source || !String(item.link).startsWith('https://') || !Number.isFinite(date)
      || date > now || now - date > 86400000 || !(text.includes('cdmx') || text.includes('ciudad de mexico')) || seen.has(text)) return [];
    seen.add(text);
    return [{ title, source, url: item.link, publishedAt: new Date(date).toISOString() }];
  }).sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 8);
}

export interface RainForecast { title: string; url: string; source: string; publishedAt: string; validFor: string; level: string }
const SMN_URL = 'https://smn.conagua.gob.mx/es/pronosticos/pronosticoenmunicipios';
/** SMN (CONAGUA) official municipal forecast → CDMX alcaldías with significant rain today. Thresholds follow SMN rain categories. */
export function rainFromSmn(rows: any[], fetchedAt: string): RainForecast[] {
  const level = (mm: number) => mm >= 75 ? 'Lluvias intensas' : mm >= 50 ? 'Lluvias muy fuertes' : mm >= 25 ? 'Lluvias fuertes' : mm >= 10 ? 'Lluvias moderadas' : '';
  return rows.filter(r => String(r.ides) === '9' && String(r.ndia) === '0').flatMap(r => {
    const mm = Number(r.prec), prob = Number(r.probprec), lv = level(mm);
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(r.dloc));
    if (!lv || !(prob >= 50) || !m || !r.nmun) return [];
    return [{ title: `${r.nmun}: ${lv} (${mm} mm, probabilidad ${prob}%)`, level: lv, url: SMN_URL, source: 'SMN · CONAGUA (pronóstico oficial)', publishedAt: fetchedAt, validFor: `${m[1]}-${m[2]}-${m[3]}`, mm } as RainForecast & { mm: number }];
  }).sort((a: any, b: any) => b.mm - a.mm).map(({ mm: _mm, ...rest }: any) => rest);
}
