export type StatusCliente = 'ativo' | 'inativo';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  observacao?: string;
  status: StatusCliente;
  criadoEm: string;
}

export interface Compra {
  id: string;
  clienteId: string;
  valorCentavos: number;
  data: string; // AAAA-MM-DD
  descricao?: string;
  registradoPor: string;
  criadoEm: string;
}

export interface Pagamento {
  id: string;
  clienteId: string;
  valorCentavos: number;
  data: string; // AAAA-MM-DD
  formaPagamento: FormaPagamento;
  registradoPor: string;
  criadoEm: string;
}

export interface ItemHistorico {
  tipo: 'COMPRA' | 'PAGAMENTO';
  valorCentavos: number;
  data: string;
  detalhe: string;
  registradoPor: string;
  criadoEm: string;
}

export interface Devedor {
  cliente: Cliente;
  saldoCentavos: number;
}

export interface ResumoMensal {
  vendidoCentavos: number;
  recebidoCentavos: number;
  emAbertoCentavos: number;
}
