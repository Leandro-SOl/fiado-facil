import { dataCurta, formatarReais, hojeISO, paraCentavos, soDigitos } from './dinheiro';

describe('dinheiro (testes unitários)', () => {
  it('converte valores digitados em centavos', () => {
    expect(paraCentavos('12')).toBe(1200);
    expect(paraCentavos('12,5')).toBe(1250);
    expect(paraCentavos('35,50')).toBe(3550);
    expect(paraCentavos('1.234,56')).toBe(123456);
    expect(paraCentavos('R$ 7,05')).toBe(705);
  });

  it('rejeita textos que não são valores válidos', () => {
    expect(paraCentavos('')).toBeNull();
    expect(paraCentavos('abc')).toBeNull();
    expect(paraCentavos('-5')).toBeNull();
    expect(paraCentavos('12,345')).toBeNull();
    expect(paraCentavos('<script>')).toBeNull();
  });

  it('formata centavos como reais', () => {
    expect(formatarReais(2750)).toBe('R$ 27,50');
    expect(formatarReais(5)).toBe('R$ 0,05');
    expect(formatarReais(123456)).toBe('R$ 1.234,56');
  });

  it('gera datas no formato certo', () => {
    expect(hojeISO(new Date(2026, 10, 7))).toBe('2026-11-07');
    expect(dataCurta('2026-11-07')).toBe('07/11');
  });

  it('mantém só os dígitos do telefone', () => {
    expect(soDigitos('(11) 98765-4321')).toBe('11987654321');
  });
});
