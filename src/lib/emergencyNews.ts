import type { NewsItem } from '@/hooks/useBreakingNews';

const EMERGENCY_TOPICS = /\b(emergencias?|accidentes?|sismos?|terremotos?|temblores?|tsunamis?|incendios?|inundaciones?|inundacion|huracanes?|ciclones?|derrumbes?|deslaves?|choques?|volcaduras?|explosiones?|explosion|evacuaciones?|evacuacion|rescates?|proteccion civil|alerta sismica)\b/;

// Noticias de negocios, finanzas o espectáculos no son emergencias aunque
// mencionen alguna palabra clave en el texto.
const NON_EMERGENCY_CONTEXT = /\b(ternium|inversion|inversiones|bolsa|acciones|utilidades|resultados financieros|economia|empresa|empresarial|negocio|fusion|adquisicion|concert|concierto|futbol|deporte|entretenimiento|celebridad|estreno|taquilla)\b/;

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function selectEmergencyNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const title = normalize(item.title);
    const text = normalize(`${item.title} ${item.description ?? ''}`);
    // El tema de emergencia debe estar en el titular; la descripcion solo
    // sirve como apoyo cuando el titular ya es de emergencia.
    if (!EMERGENCY_TOPICS.test(title)) return false;
    if (NON_EMERGENCY_CONTEXT.test(text)) return false;
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