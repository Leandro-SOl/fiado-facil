import { Injectable, inject, signal } from '@angular/core';
import { FIADO_REPOSITORY, FiadoRepository } from '../data/fiado-repository';
import {
  Cliente,
  Compra,
  Devedor,
  FormaPagamento,
  ItemHistorico,
  Pagamento,
  ResumoMensal,
} from '../models/models';
import { formatarReais, hojeISO, paraCentavos, soDigitos } from '../utils/dinheiro';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: string };

export interface NovoClienteDados {
  nome: string;
  telefone: string;
  observacao?: string;
}

export interface NovaCompraDados {
  clienteId: string;
  valor: string;
  data: string;
  descricao?: string;
}

export interface NovoPagamentoDados {
  clienteId: string;
  valor: string;
  data: string;
  formaPagamento: FormaPagamento;
}

const FORMAS_VALIDAS: FormaPagamento[] = ['dinheiro', 'pix', 'cartao'];
const MARCACAO = /[<>]/;

/**
 * Camada de regras de negócio do fiado. As telas nunca acessam o repositório
 * diretamente: toda validação e todo cálculo de saldo ficam aqui.
 */
@Injectable({ providedIn: 'root' })
export class FiadoService {
  private readonly repo: FiadoRepository = inject(FIADO_REPOSITORY);

  /** Usuário que está registrando (no MVP, escolhido na tela inicial). */
  readonly usuarioAtual = signal('João');

  /** Muda a cada gravação, para as telas recalcularem os dados. */
  readonly versao = signal(0);

  private agora: () => Date = () => new Date();

  /** Permite fixar a data nos testes. */
  definirRelogio(relogio: () => Date): void {
    this.agora = relogio;
  }

  // ---------- Clientes (RF01) ----------

  cadastrarCliente(dados: NovoClienteDados): Resultado<Cliente> {
    const nome = (dados.nome ?? '').trim();
    const telefone = soDigitos(dados.telefone);
    const observacao = (dados.observacao ?? '').trim();

    if (nome.length < 2 || nome.length > 80) {
      return { ok: false, erro: 'Digite o nome do cliente (de 2 a 80 letras).' };
    }
    if (MARCACAO.test(nome) || MARCACAO.test(observacao)) {
      return { ok: false, erro: 'Não use os sinais < ou > no nome ou na observação.' };
    }
    if (telefone.length < 10 || telefone.length > 11) {
      return { ok: false, erro: 'Digite o telefone com DDD, só números (ex.: 11987654321).' };
    }
    if (observacao.length > 100) {
      return { ok: false, erro: 'A observação pode ter no máximo 100 letras.' };
    }
    if (this.repo.listarClientes().some((c) => c.telefone === telefone)) {
      return { ok: false, erro: 'Já existe um cliente com este telefone.' };
    }

    const cliente: Cliente = {
      id: this.novoId(),
      nome,
      telefone,
      observacao: observacao || undefined,
      status: 'ativo',
      criadoEm: this.agora().toISOString(),
    };
    this.repo.salvarCliente(cliente);
    this.versao.update((v) => v + 1);
    return { ok: true, valor: cliente };
  }

  listarClientes(): Cliente[] {
    return this.repo
      .listarClientes()
      .filter((c) => c.status === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  buscarCliente(id: string): Cliente | undefined {
    return this.repo.listarClientes().find((c) => c.id === id);
  }

  // ---------- Compras (RF02) ----------

  registrarCompra(dados: NovaCompraDados): Resultado<Compra> {
    const cliente = this.buscarCliente(dados.clienteId);
    if (!cliente || cliente.status !== 'ativo') {
      return { ok: false, erro: 'Escolha um cliente da lista.' };
    }
    const valorCentavos = paraCentavos(dados.valor);
    if (valorCentavos === null || valorCentavos <= 0) {
      return { ok: false, erro: 'Digite um valor maior que zero.' };
    }
    const erroData = this.validarData(dados.data);
    if (erroData) return { ok: false, erro: erroData };

    const descricao = (dados.descricao ?? '').trim();
    if (descricao.length > 100) {
      return { ok: false, erro: 'A descrição pode ter no máximo 100 letras.' };
    }
    if (MARCACAO.test(descricao)) {
      return { ok: false, erro: 'Não use os sinais < ou > na descrição.' };
    }

    const compra: Compra = {
      id: this.novoId(),
      clienteId: cliente.id,
      valorCentavos,
      data: dados.data,
      descricao: descricao || undefined,
      registradoPor: this.usuarioAtual(),
      criadoEm: this.agora().toISOString(),
    };
    this.repo.salvarCompra(compra);
    this.versao.update((v) => v + 1);
    return { ok: true, valor: compra };
  }

  // ---------- Pagamentos (RF03) ----------

  registrarPagamento(dados: NovoPagamentoDados): Resultado<Pagamento> {
    const cliente = this.buscarCliente(dados.clienteId);
    if (!cliente) {
      return { ok: false, erro: 'Escolha um cliente da lista.' };
    }
    const valorCentavos = paraCentavos(dados.valor);
    if (valorCentavos === null || valorCentavos <= 0) {
      return { ok: false, erro: 'Digite um valor maior que zero.' };
    }
    if (valorCentavos > this.saldoDoCliente(cliente.id)) {
      return { ok: false, erro: 'O valor é maior que o saldo devedor.' };
    }
    if (!FORMAS_VALIDAS.includes(dados.formaPagamento)) {
      return { ok: false, erro: 'Escolha a forma de pagamento.' };
    }
    const erroData = this.validarData(dados.data);
    if (erroData) return { ok: false, erro: erroData };

    const pagamento: Pagamento = {
      id: this.novoId(),
      clienteId: cliente.id,
      valorCentavos,
      data: dados.data,
      formaPagamento: dados.formaPagamento,
      registradoPor: this.usuarioAtual(),
      criadoEm: this.agora().toISOString(),
    };
    this.repo.salvarPagamento(pagamento);
    this.versao.update((v) => v + 1);
    return { ok: true, valor: pagamento };
  }

  // ---------- Saldo e histórico (RF04) ----------

  /** O saldo nunca é guardado: é sempre calculado a partir dos registros. */
  saldoDoCliente(clienteId: string): number {
    const compras = this.repo.listarCompras(clienteId).reduce((s, c) => s + c.valorCentavos, 0);
    const pagos = this.repo.listarPagamentos(clienteId).reduce((s, p) => s + p.valorCentavos, 0);
    return compras - pagos;
  }

  historico(clienteId: string, limite = 20): ItemHistorico[] {
    const compras: ItemHistorico[] = this.repo.listarCompras(clienteId).map((c) => ({
      tipo: 'COMPRA',
      valorCentavos: c.valorCentavos,
      data: c.data,
      detalhe: c.descricao ?? 'sem descrição',
      registradoPor: c.registradoPor,
      criadoEm: c.criadoEm,
    }));
    const pagamentos: ItemHistorico[] = this.repo.listarPagamentos(clienteId).map((p) => ({
      tipo: 'PAGAMENTO',
      valorCentavos: p.valorCentavos,
      data: p.data,
      detalhe: p.formaPagamento === 'cartao' ? 'cartão' : p.formaPagamento,
      registradoPor: p.registradoPor,
      criadoEm: p.criadoEm,
    }));
    return [...compras, ...pagamentos]
      .sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm))
      .slice(0, limite);
  }

  // ---------- Devedores (RF05) ----------

  listarDevedores(): Devedor[] {
    return this.listarClientes()
      .map((cliente) => ({ cliente, saldoCentavos: this.saldoDoCliente(cliente.id) }))
      .filter((d) => d.saldoCentavos > 0)
      .sort((a, b) => b.saldoCentavos - a.saldoCentavos);
  }

  totalAReceber(): number {
    return this.listarDevedores().reduce((s, d) => s + d.saldoCentavos, 0);
  }

  // ---------- Cobrança pelo WhatsApp (RF06) ----------

  /** Retorna o link que abre o WhatsApp com a mensagem pronta, ou null se não houver dívida. */
  linkCobranca(clienteId: string): string | null {
    const cliente = this.buscarCliente(clienteId);
    const saldo = this.saldoDoCliente(clienteId);
    if (!cliente || saldo <= 0) return null;
    const primeiroNome = cliente.nome.split(' ')[0];
    const texto =
      `Olá, ${primeiroNome}! Tudo bem? Passando para lembrar que seu saldo ` +
      `na Mercearia Bom Preço é de ${formatarReais(saldo)}. Obrigado!`;
    return `https://wa.me/55${cliente.telefone}?text=${encodeURIComponent(texto)}`;
  }

  // ---------- Resumo mensal (RF07) ----------

  resumoDoMes(anoMes: string): ResumoMensal {
    const doMes = (data: string) => data.startsWith(anoMes);
    const vendido = this.repo
      .listarCompras()
      .filter((c) => doMes(c.data))
      .reduce((s, c) => s + c.valorCentavos, 0);
    const recebido = this.repo
      .listarPagamentos()
      .filter((p) => doMes(p.data))
      .reduce((s, p) => s + p.valorCentavos, 0);
    return { vendidoCentavos: vendido, recebidoCentavos: recebido, emAbertoCentavos: vendido - recebido };
  }

  hoje(): string {
    return hojeISO(this.agora());
  }

  // ---------- Auxiliares ----------

  private validarData(data: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) {
      return 'Escolha uma data válida.';
    }
    if (data > this.hoje()) {
      return 'A data não pode ser no futuro.';
    }
    return null;
  }

  private novoId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
