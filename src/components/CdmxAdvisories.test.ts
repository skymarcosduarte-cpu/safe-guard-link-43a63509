import { describe, it, expect } from 'vitest';
import { normalizeItems } from '../../supabase/functions/fetch-cdmx-advisories/feed';
const now=Date.parse('2026-11-11T00:37:00Z');
const item={title:'Bloqueo en CDMX',link:'https://news.google.com/article',source:{'#text':'N+'},pubDate:'2026-11-10T20:00:00Z'};
describe('CDMX advisories',()=>{
 it('preserves publisher and original publication time',()=>expect(normalizeItems([item],now)[0]).toMatchObject({source:'N+',publishedAt:'2026-11-10T20:00:00.000Z'}));
 it('excludes reports older than 24 hours',()=>expect(normalizeItems([{...item,pubDate:'2026-11-09T20:00:00Z'}],now)).toEqual([]));
 it('excludes reports outside CDMX',()=>expect(normalizeItems([{...item,title:'Bloqueo en Guadalajara'}],now)).toEqual([]));
 it('rejects future and undated publications',()=>expect(normalizeItems([{...item,pubDate:'2026-11-12T00:00:00Z'},{...item,pubDate:''}],now)).toEqual([]));
});
import { rainFromSmn } from '../../supabase/functions/fetch-cdmx-advisories/feed';
describe('SMN rain',()=>{
 const row={ides:'9',ndia:'0',nmun:'Coyoacán',prec:'30',probprec:'80',dloc:'20261111T00'};
 it('classifies 25 mm as lluvias fuertes',()=>expect(rainFromSmn([row],'x')[0].level).toBe('Lluvias fuertes'));
 it('ignores other states, days and low probability',()=>expect(rainFromSmn([{...row,ides:'15'},{...row,ndia:'1'},{...row,probprec:'30'}],'x')).toEqual([]));
});
