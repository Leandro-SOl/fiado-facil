import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FiadoService } from '../../services/fiado.service';
import { dataCurta, formatarReais } from '../../utils/dinheiro';

/** Tela 1 – Início: lista de clientes, quem deve e acesso à nova compra (RF01, RF05). */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <header class="barra">
      <h1>Fiado Fácil</h1>
      <label class="usuario">
        <span class="sr-only">Quem está usando</span>
        <select [value]="fiado.usuarioAtual()" (change)="trocarUsuario($event)" aria-label="Quem está usando">
          <option value="João">João</option>
          <option value="Lucas">Lucas</option>
        </select>
      </label>
    </header>

    <main class="conteudo">
      <label for="busca">Buscar cliente</label>
      <input
        id="busca"
        type="search"
        placeholder="Digite o nome do cliente"
        [value]="busca()"
        (input)="busca.set($any($event.target).value)"
      />

      <div class="filtros" role="group" aria-label="Filtro da lista">
        <button type="button" class="filtro" [class.ativo]="!soDevedores()" [attr.aria-pressed]="!soDevedores()" (click)="soDevedores.set(false)">Todos</button>
        <button type="button" class="filtro" [class.ativo]="soDevedores()" [attr.aria-pressed]="soDevedores()" (click)="soDevedores.set(true)">
          Quem deve ({{ qtdDevedores() }})
        </button>
      </div>

      <p class="total">Total a receber: <strong class="divida">{{ reais(total()) }}</strong></p>

      @if (itens().length === 0) {
        <p class="vazio">
          @if (busca()) { Nenhum cliente encontrado com esse nome. }
          @else if (soDevedores()) { Ninguém está devendo no momento. }
          @else { Nenhum cliente cadastrado ainda. Toque em "Novo cliente". }
        </p>
      } @else {
        <ul class="lista">
          @for (item of itens(); track item.id) {
            <li>
              <a class="item" [routerLink]="['/clientes', item.id]">
                <span>
                  <span class="nome">{{ item.nome }}</span>
                  <span class="sub">{{ item.ultima ? 'Última compra: ' + item.ultima : 'Sem compras' }}</span>
                </span>
                <span class="valor" [class.divida]="item.saldo > 0">
                  {{ item.saldo > 0 ? reais(item.saldo) : 'Em dia' }}
                </span>
              </a>
            </li>
          }
        </ul>
      }
    </main>

    <footer class="rodape">
      <a class="botao principal" routerLink="/compras/nova">＋ Nova compra</a>
      <a class="botao secundario" routerLink="/clientes/novo">Novo cliente</a>
    </footer>
  `,
})
export class Inicio {
  protected readonly fiado = inject(FiadoService);
  protected readonly busca = signal('');
  protected readonly soDevedores = signal(true);
  protected readonly reais = formatarReais;

  private readonly todos = computed(() => {
    this.fiado.versao();
    return this.fiado.listarClientes().map((c) => {
      const historico = this.fiado.historico(c.id).filter((h) => h.tipo === 'COMPRA');
      return {
        id: c.id,
        nome: c.nome,
        saldo: this.fiado.saldoDoCliente(c.id),
        ultima: historico[0] ? dataCurta(historico[0].data) : '',
      };
    });
  });

  protected readonly qtdDevedores = computed(() => this.todos().filter((i) => i.saldo > 0).length);
  protected readonly total = computed(() => this.todos().reduce((s, i) => s + Math.max(i.saldo, 0), 0));

  protected readonly itens = computed(() => {
    const termo = this.busca().trim().toLocaleLowerCase('pt-BR');
    let lista = this.todos();
    if (this.soDevedores()) lista = lista.filter((i) => i.saldo > 0).sort((a, b) => b.saldo - a.saldo);
    if (termo) lista = lista.filter((i) => i.nome.toLocaleLowerCase('pt-BR').includes(termo));
    return lista;
  });

  protected trocarUsuario(evento: Event): void {
    this.fiado.usuarioAtual.set((evento.target as HTMLSelectElement).value);
  }
}
