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
