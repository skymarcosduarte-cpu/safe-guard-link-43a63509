import { describe, expect, it } from 'vitest';
import { selectEmergencyNews } from './emergencyNews';

const news = (title: string) => ({ title, link: 'https://example.org/noticia', source: 'Diario', pubDate: '2026-11-13T00:00:00Z' });

describe('Noticias de Inicio', () => {
  it('incluye emergencias', () => expect(selectEmergencyNews([news('Protección Civil atiende emergencia')])).toHaveLength(1));
  it('incluye accidentes', () => expect(selectEmergencyNews([news('Accidente en carretera')])).toHaveLength(1));
  it('incluye sismos', () => expect(selectEmergencyNews([news('Sismo registrado en México')])).toHaveLength(1));
  it('excluye noticias sin relación con emergencias', () => expect(selectEmergencyNews([news('Resultados del fútbol')])).toEqual([]));
  it('excluye noticias de negocios aunque mencionen accidentes', () =>
    expect(selectEmergencyNews([{ ...news('Ternium reporta resultados trimestrales'), description: 'La empresa mencionó un accidente laboral menor en su informe.' }])).toEqual([]));
  it('exige el tema de emergencia en el titular, no solo en la descripción', () =>
    expect(selectEmergencyNews([{ ...news('Ternium invertirá en nueva planta'), description: 'El anuncio se dio tras un sismo en la región.' }])).toEqual([]));
  it('rechaza enlaces que no son páginas web', () => expect(selectEmergencyNews([{ ...news('Sismo'), link: 'javascript:alert(1)' }])).toEqual([]));
});