import { useQuery } from '@tanstack/react-query';
import { Car, CloudRain, TrainFront, RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
interface Item { title: string; source: string; url: string; publishedAt: string; validFor?: string }
interface Result { fetchedAt: string; groups: {category: string; status: string; official?: boolean; items: Item[]}[] }
const categories = [
 {id:'roads', label:'Incidentes viales', Icon:Car, official:'https://x.com/OVIALCDMX', source:'OVIAL CDMX'},
 {id:'rain', label:'Lluvias intensas', Icon:CloudRain, official:'https://smn.conagua.gob.mx/es/pronosticos/pronosticoenmunicipios', source:'SMN · CONAGUA'},
 {id:'transport', label:'Afectaciones del transporte', Icon:TrainFront, official:'https://x.com/MetroCDMX', source:'Metro CDMX'},
];
const time = (value:string) => new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));
export function CdmxAdvisories() {
 const {data,isPending,isFetching,isError,refetch} = useQuery<Result>({
  queryKey:['cdmx-advisories'], queryFn:async()=>{
   const {data,error}=await supabase.functions.invoke('fetch-cdmx-advisories');
   if(error || !data?.groups) throw new Error('Avisos no disponibles');
   return data;
  }, staleTime:300000,refetchInterval:300000,retry:1,
 });
 return <section className="px-4 py-5 border-b border-border" aria-label="Avisos Ciudad de México">
  <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Avisos · Ciudad de México</h2><Button variant="outline" size="icon" aria-label="Actualizar avisos CDMX" title="Actualizar avisos" disabled={isFetching} onClick={()=>refetch()}><RefreshCw className={`h-5 w-5 ${isFetching?'animate-spin':''}`} /></Button></div>
  <p className="text-sm text-muted-foreground mt-2">Publicaciones de las últimas 24 horas · No confirman que el incidente siga activo.</p>
  {data && <p className="text-sm mt-1">Última consulta: {time(data.fetchedAt)} · hora CDMX</p>}
  {isPending && <p role="status" className="py-4">Consultando avisos…</p>}
  {isError && <p role="alert" className="text-destructive py-3">No se pudieron actualizar los avisos. Consulta las fuentes oficiales.</p>}
  <div className="grid gap-5 mt-4 lg:grid-cols-3">{categories.map(({id,label,Icon,official,source})=>{
   const group=data?.groups.find(g=>g.category===id);
   const items=group?.items.filter(i=>Date.now()-Date.parse(i.publishedAt)<=86400000) || [];
   const day=(v:string)=>new Intl.DateTimeFormat('es-MX',{day:'2-digit',month:'long',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z'));
   return <div key={id} className="min-w-0"><h3 className="font-bold flex items-center gap-2"><Icon className="h-5 w-5 text-primary shrink-0" />{label}</h3>
    {group?.status==='unavailable' && <p className="text-destructive text-sm my-3">Fuente temporalmente no disponible.</p>}
    {group?.status==='ok' && !items.length && <p className="text-muted-foreground text-sm my-3">{group.official?'El pronóstico oficial no prevé lluvias de 10 mm o más hoy en ninguna alcaldía.':'Sin publicaciones recientes encontradas; no significa que no haya afectaciones.'}</p>}
    {group?.status==='ok' && <p className="text-xs font-semibold mt-1">{group.official?'Fuente oficial: pronóstico por alcaldía':'Fuente: reportes de medios (no oficial)'}</p>}
    <ul className="divide-y divide-border">{items.slice(0,3).map(item=><li key={item.title} className="py-3"><a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:underline break-words">{item.title}<ExternalLink className="inline h-3 w-3 ml-1" /></a><p className="text-sm text-muted-foreground mt-1">Fuente: {item.source}</p>{item.validFor?<p className="text-sm text-muted-foreground">Pronóstico para el {day(item.validFor)} · consultado {time(item.publishedAt)}</p>:<p className="text-sm text-muted-foreground">Publicado: {time(item.publishedAt)} · CDMX</p>}</li>)}</ul>
    <a href={official} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm inline-flex items-center gap-1 mt-2">{source}<ExternalLink className="h-4 w-4" /></a>
   </div>;
  })}</div>
  <p className="text-sm text-muted-foreground mt-4">Lluvias: pronóstico oficial del SMN (CONAGUA). Vialidad y transporte: el gobierno no publica un servicio automático, por eso se recopilan reportes de medios vía Google Noticias. No es un servicio oficial de alertamiento.</p>
 </section>;
}
