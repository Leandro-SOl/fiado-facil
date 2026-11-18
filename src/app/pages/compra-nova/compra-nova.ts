import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FiadoService } from '../../services/fiado.service';
import { formatarReais } from '../../utils/dinheiro';

/** Tela 2 – Registrar compra no fiado (RF02), o fluxo central do MVP. */
@Component({
  selector: 'app-compra-nova',
  imports: [RouterLink],
  template: `
    <header class="barra">
      <a class="voltar" [routerLink]="clienteId() ? ['/clientes', clienteId()] : '/'">← Voltar</a>
      <h1>Nova compra</h1>
    </header>

    <form class="conteudo" (submit)="salvar($event)" novalidate>
      @if (cliente(); as c) {
        <div class="cartao-cliente">
          <span class="sub">Cliente</span>
          <strong class="nome-grande">{{ c.nome }}</strong>
          <span class="sub">Deve hoje: <b class="divida">{{ reais(saldo()) }}</b></span>
        </div>
      } @else {
        <div class="campo">
          <label for="cliente">Cliente *</label>
          <select id="cliente" [value]="clienteEscolhido()" (change)="clienteEscolhido.set($any($event.target).value)">
            <option value="">Escolha o cliente</option>
            @for (c of clientes(); track c.id) {
              <option [value]="c.id">{{ c.nome }}</option>
            }
          </select>
        </div>
      }

      <div class="campo" [class.com-erro]="erroValor()">
        <label for="valor">Valor da compra (R$) *</label>
        <input id="valor" class="valor-grande" inputmode="decimal" autocomplete="off" placeholder="0,00"
               [attr.aria-invalid]="erroValor()" [attr.aria-describedby]="erro() ? 'msg-erro' : null"
               [value]="valor()" (input)="valor.set($any($event.target).value)" />
      </div>

      @if (erro()) {
        <p class="erro" id="msg-erro" role="alert">⛔ {{ erro() }}</p>
      }

      <div class="campo">
        <label for="data">Data *</label>
        <input id="data" type="date" [max]="hoje" [value]="data()" (input)="data.set($any($event.target).value)" />
      </div>

      <div class="campo">
        <label for="desc">O que levou? (opcional)</label>
        <input id="desc" placeholder="Ex.: arroz e óleo" maxlength="100" [value]="descricao()"
               (input)="descricao.set($any($event.target).value)" />
        <p class="dica">Até 100 letras</p>
      </div>

      <div class="rodape fixo">
        <button type="submit" class="botao principal">✔ Salvar compra</button>
      </div>
    </form>
  `,
})
export class CompraNova {
  private readonly fiado = inject(FiadoService);
  private readonly router = inject(Router);

  /** Vem da URL: /compras/nova?clienteId=... */
  readonly clienteId = input<string>('');

  protected readonly hoje = this.fiado.hoje();
  protected readonly reais = formatarReais;
  protected readonly clienteEscolhido = signal('');
  protected readonly valor = signal('');
  protected readonly data = signal(this.hoje);
  protected readonly descricao = signal('');
  protected readonly erro = signal('');
  protected readonly erroValor = computed(() => this.erro().includes('valor'));

  protected readonly clientes = computed(() => {
    this.fiado.versao();
    return this.fiado.listarClientes();
  });
  protected readonly cliente = computed(() => (this.clienteId() ? this.fiado.buscarCliente(this.clienteId()) : undefined));
  protected readonly saldo = computed(() => {
    this.fiado.versao();
    return this.cliente() ? this.fiado.saldoDoCliente(this.cliente()!.id) : 0;
  });

  protected salvar(evento: Event): void {
    evento.preventDefault();
    const id = this.clienteId() || this.clienteEscolhido();
    const resultado = this.fiado.registrarCompra({
      clienteId: id,
      valor: this.valor(),
      data: this.data(),
      descricao: this.descricao(),
    });
    if (!resultado.ok) {
      this.erro.set(resultado.erro);
      return;
    }
    this.router.navigate(['/clientes', id], {
      queryParams: { msg: 'compra', valor: resultado.valor.valorCentavos },
    });
  }
}
