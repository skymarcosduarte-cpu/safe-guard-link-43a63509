import type { NewsItem } from '@/hooks/useBreakingNews';

const EMERGENCY_TOPICS = /\b(emergencias?|accidentes?|sismos?|terremotos?|temblores?|tsunamis?|incendios?|inundaciones?|inundacion|huracanes?|ciclones?|derrumbes?|deslaves?|choques?|volcaduras?|explosiones?|explosion|evacuaciones?|evacuacion|rescates?|proteccion civil|alerta sismica)\b/;

export function selectEmergencyNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const text = `${item.title} ${item.description ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!EMERGENCY_TOPICS.test(text)) return false;
    try {
      if (!['https:', 'http:'].includes(new URL(item.link).protocol)) return false;
    } catch {
      return false;
    }
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
}