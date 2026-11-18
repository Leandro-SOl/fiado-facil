import { Injectable, InjectionToken } from '@angular/core';
import { Cliente, Compra, Pagamento } from '../models/models';

/**
 * Camada de acesso a dados (padrão Repository).
 * As telas e os serviços dependem só desta interface. Nesta versão do MVP os dados
 * ficam no próprio aparelho (localStorage), o que já garante o funcionamento offline.
 * A troca para o Cloud Firestore exige apenas uma nova implementação desta interface.
 */
export interface FiadoRepository {
  listarClientes(): Cliente[];
  salvarCliente(cliente: Cliente): void;
  listarCompras(clienteId?: string): Compra[];
  salvarCompra(compra: Compra): void;
  listarPagamentos(clienteId?: string): Pagamento[];
  salvarPagamento(pagamento: Pagamento): void;
}

export const FIADO_REPOSITORY = new InjectionToken<FiadoRepository>('FIADO_REPOSITORY');

const CHAVES = {
  clientes: 'fiado-facil:clientes',
  compras: 'fiado-facil:compras',
  pagamentos: 'fiado-facil:pagamentos',
} as const;

/** Implementação que grava no armazenamento local do navegador. */
@Injectable()
export class LocalStorageFiadoRepository implements FiadoRepository {
  constructor(private readonly storage: Storage = globalThis.localStorage) {}

  listarClientes(): Cliente[] {
    return this.ler<Cliente>(CHAVES.clientes);
  }

  salvarCliente(cliente: Cliente): void {
    const lista = this.listarClientes().filter((c) => c.id !== cliente.id);
    this.gravar(CHAVES.clientes, [...lista, cliente]);
  }

  listarCompras(clienteId?: string): Compra[] {
    const todas = this.ler<Compra>(CHAVES.compras);
    return clienteId ? todas.filter((c) => c.clienteId === clienteId) : todas;
  }

  salvarCompra(compra: Compra): void {
    this.gravar(CHAVES.compras, [...this.listarCompras(), compra]);
  }

  listarPagamentos(clienteId?: string): Pagamento[] {
    const todos = this.ler<Pagamento>(CHAVES.pagamentos);
    return clienteId ? todos.filter((p) => p.clienteId === clienteId) : todos;
  }

  salvarPagamento(pagamento: Pagamento): void {
    this.gravar(CHAVES.pagamentos, [...this.listarPagamentos(), pagamento]);
  }

  private ler<T>(chave: string): T[] {
    try {
      const bruto = this.storage.getItem(chave);
      return bruto ? (JSON.parse(bruto) as T[]) : [];
    } catch {
      return [];
    }
  }

  private gravar<T>(chave: string, valor: T[]): void {
    this.storage.setItem(chave, JSON.stringify(valor));
  }
}

/** Implementação em memória, usada nos testes unitários. */
export class MemoriaFiadoRepository implements FiadoRepository {
  clientes: Cliente[] = [];
  compras: Compra[] = [];
  pagamentos: Pagamento[] = [];

  listarClientes(): Cliente[] {
    return [...this.clientes];
  }
  salvarCliente(cliente: Cliente): void {
    this.clientes = [...this.clientes.filter((c) => c.id !== cliente.id), cliente];
  }
  listarCompras(clienteId?: string): Compra[] {
    return this.compras.filter((c) => !clienteId || c.clienteId === clienteId);
  }
  salvarCompra(compra: Compra): void {
    this.compras = [...this.compras, compra];
  }
  listarPagamentos(clienteId?: string): Pagamento[] {
    return this.pagamentos.filter((p) => !clienteId || p.clienteId === clienteId);
  }
  salvarPagamento(pagamento: Pagamento): void {
    this.pagamentos = [...this.pagamentos, pagamento];
  }
}
