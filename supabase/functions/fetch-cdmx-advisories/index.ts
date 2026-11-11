import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@4.5.3';
import { normalizeItems, rainFromSmn } from './feed.ts';
const queries = {
 roads: 'CDMX (accidente OR bloqueo OR "cierre vial" OR manifestación) when:1d',
 rain: 'CDMX ("lluvias intensas" OR "lluvias fuertes" OR inundaciones OR "alerta por lluvia") when:1d',
 transport: 'CDMX (Metro OR Metrobús OR RTP OR Cablebús) (suspensión OR retrasos OR cierre OR fallas) when:1d',
};
let cache: { fetchedAt: string; groups: unknown[] } | undefined;
Deno.serve(async req => {
 const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: {...corsHeaders, 'Content-Type':'application/json'} });
 if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
 const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
 if (!token) return respond({error:'Sesión requerida'},401);
 const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_ANON_KEY') || '');
 const {data, error} = await client.auth.getUser(token);
 if (error || !data.user) return respond({error:'Sesión requerida'},401);
 if (cache && Date.now()-Date.parse(cache.fetchedAt)<300000) return respond(cache);
 const fetchedAt = new Date().toISOString();
 const groups = await Promise.all(Object.entries(queries).map(async ([category,q]) => {
  if (category === 'rain') {
   try {
    const r = await fetch('https://smn.conagua.gob.mx/tools/GUI/webservices/?method=1', {signal: AbortSignal.timeout(15000)});
    if (!r.ok || !r.body) throw new Error('SMN unavailable');
    const text = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).text();
    return {category, status:'ok', official:true, items: rainFromSmn(JSON.parse(text), fetchedAt).slice(0, 8)};
   } catch { /* fall back to news below */ }
  }
  try {
   const url = new URL('https://news.google.com/rss/search');
   url.search = new URLSearchParams({q,hl:'es-419',gl:'MX',ceid:'MX:es-419'}).toString();
   const response = await fetch(url, {signal: AbortSignal.timeout(8000)});
   if (!response.ok) throw new Error('Feed unavailable');
   const xml = await response.text();
   if (!xml.includes('<rss')) throw new Error('Invalid feed');
   const parsed = new XMLParser({ignoreAttributes:false}).parse(xml);
   const raw = parsed.rss?.channel?.item || [];
   return {category, status:'ok', official:false, items: normalizeItems(Array.isArray(raw)?raw:[raw],Date.now())};
  } catch { return {category,status:'unavailable',items:[]}; }
 }));
 const result = {fetchedAt,groups};
 if (groups.some(g=>g.status==='ok')) cache=result;
 return respond(result);
});
