import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Newspaper, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBreakingNews } from '@/hooks/useBreakingNews';
import { selectEmergencyNews } from '@/lib/emergencyNews';

export function EmergencyNewsTicker() {
  const { items, loading, error, refresh } = useBreakingNews();
  const news = useMemo(() => selectEmergencyNews(items), [items]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [interacting, setInteracting] = useState(false);
  const currentIndex = news.length ? index % news.length : 0;
  const item = news[currentIndex];

  useEffect(() => {
    if (paused || interacting || news.length < 2) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % news.length), 12000);
    return () => window.clearInterval(timer);
  }, [paused, interacting, news.length]);

  const date = item ? new Date(item.pubDate) : null;
  return (
    <section aria-label="Noticias de emergencias" className="border-y border-border py-3" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Newspaper className="w-4 h-4 text-accent" />Noticias de emergencias</h2>
        {news.length > 1 && <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Noticia anterior" title="Noticia anterior" onClick={() => setIndex((currentIndex + news.length - 1) % news.length)}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={paused ? 'Reanudar noticias' : 'Pausar noticias'} title={paused ? 'Reanudar noticias' : 'Pausar noticias'} onClick={() => setPaused(p => !p)}>{paused ? <Play /> : <Pause />}</Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Siguiente noticia" title="Siguiente noticia" onClick={() => setIndex((currentIndex + 1) % news.length)}><ChevronRight /></Button>
        </div>}
      </div>
      <div className="min-h-[96px]" aria-live={paused ? 'polite' : 'off'}>
        {item ? <>
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-base font-medium text-foreground leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            <span className="line-clamp-3 break-words" title={item.title}>{item.title}</span><ExternalLink className="w-4 h-4 shrink-0 mt-1 text-muted-foreground" />
          </a>
          <div className="flex flex-wrap items-center gap-x-2 mt-2 text-xs text-muted-foreground">
            <span>{item.source}</span>
            {date && !Number.isNaN(date.getTime()) && <time dateTime={date.toISOString()}>{date.toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>}
            <span className="ml-auto">{currentIndex + 1} / {news.length}</span>
          </div>
        </> : <div className="flex items-center justify-between gap-2 py-3 text-sm text-muted-foreground">
          <p>{loading ? 'Consultando noticias…' : error ? 'Noticias no disponibles en este momento.' : 'Sin noticias recientes de emergencias, accidentes o sismos.'}</p>
          {error && <Button variant="outline" size="sm" onClick={refresh}>Reintentar</Button>}
        </div>}
      </div>
    </section>
  );
}