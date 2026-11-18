/**
 * Converte o texto digitado pelo usuário (ex.: "12", "12,5", "12,50", "1.234,56")
 * em centavos (número inteiro). Retorna null quando o texto não é um valor válido.
 * Valores em dinheiro são guardados em centavos para evitar erros de arredondamento.
 */
export function paraCentavos(texto: string): number | null {
  let limpo = (texto ?? '').trim().replace(/\s/g, '').replace(/^R\$/i, '');
  // Aceita ponto como separador decimal (ex.: "12.50"), comum no teclado do celular.
  if (/^\d+\.\d{1,2}$/.test(limpo)) {
    limpo = limpo.replace('.', ',');
  }
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) {
    return null;
  }
  const [inteiro, decimal = ''] = limpo.replace(/\./g, '').split(',');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
}

/** Formata centavos como moeda brasileira (ex.: 2750 -> "R$ 27,50"). */
export function formatarReais(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cent = (abs % 100).toString().padStart(2, '0');
  return `${negativo ? '-' : ''}R$ ${reais},${cent}`;
}

/** Data de hoje no formato AAAA-MM-DD, no fuso local. */
export function hojeISO(agora: Date = new Date()): string {
  const a = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
}

/** Converte AAAA-MM-DD em DD/MM. */
export function dataCurta(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Mantém só os dígitos de um telefone. */
export function soDigitos(texto: string): string {
  return (texto ?? '').replace(/\D/g, '');
}
