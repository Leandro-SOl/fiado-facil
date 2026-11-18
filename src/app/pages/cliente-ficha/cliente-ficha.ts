import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormaPagamento } from '../../models/models';
import { FiadoService } from '../../services/fiado.service';
import { dataCurta, formatarReais } from '../../utils/dinheiro';

/** Tela 3 – Ficha do cliente: saldo, histórico, pagamento e cobrança (RF03, RF04, RF06). */
@Component({
  selector: 'app-cliente-ficha',
  imports: [RouterLink],
  template: `
    <header class="barra">
      <a class="voltar" routerLink="/">← Voltar</a>
      <h1>{{ cliente()?.nome ?? 'Cliente' }}</h1>
    </header>

    <main class="conteudo">
      @if (!cliente()) {
        <p class="vazio">Cliente não encontrado.</p>
      } @else {
        @if (mensagem()) {
          <p class="sucesso" role="status">✅ {{ mensagem() }}</p>
        }

        <section class="saldo" [class.em-dia]="saldo() <= 0" aria-live="polite">
          <span class="saldo-titulo">{{ saldo() > 0 ? 'Deve' : 'Em dia' }}</span>
          <span class="saldo-valor">{{ reais(saldo()) }}</span>
        </section>

        @if (abrirPagamento()) {
          <form class="pagamento" (submit)="pagar($event)" novalidate>
            <h2>Registrar pagamento</h2>
            <div class="campo">
              <label for="valor-pag">Valor pago (R$) *</label>
              <input id="valor-pag" class="valor-grande" inputmode="decimal" placeholder="0,00"
                     [value]="valorPagamento()" (input)="valorPagamento.set($any($event.target).value)" />
            </div>
            <div class="campo">
              <label for="forma">Forma de pagamento *</label>
              <select id="forma" [value]="forma()" (change)="forma.set($any($event.target).value)">
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>
            @if (erroPagamento()) {
              <p class="erro" role="alert">⛔ {{ erroPagamento() }}</p>
            }
            <div class="linha">
              <button type="submit" class="botao principal">✔ Salvar pagamento</button>
              <button type="button" class="botao secundario" (click)="abrirPagamento.set(false)">Cancelar</button>
            </div>
          </form>
        }

        <h2>Histórico</h2>
        @if (historico().length === 0) {
          <p class="vazio">Nenhuma compra ou pagamento ainda.</p>
        } @else {
          <ul class="historico">
            @for (h of historico(); track h.criadoEm) {
              <li>
                <span class="etiqueta" [class.compra]="h.tipo === 'COMPRA'" [class.pago]="h.tipo === 'PAGAMENTO'">{{ h.tipo }}</span>
                <strong>{{ reais(h.valorCentavos) }}</strong>
                <span class="sub">{{ curta(h.data) }} · {{ h.detalhe }} · {{ h.registradoPor }}</span>
              </li>
            }
          </ul>
        }
      }
    </main>

    @if (cliente()) {
      <footer class="rodape">
        <div class="linha">
          <a class="botao principal" routerLink="/compras/nova" [queryParams]="{ clienteId: id() }">＋ Compra</a>
          @if (saldo() > 0) {
            <button type="button" class="botao secundario" (click)="abrirPagamento.set(true)">💵 Pagamento</button>
          }
        </div>
        @if (linkCobranca(); as link) {
          <a class="botao whatsapp" [href]="link" target="_blank" rel="noopener">💬 Cobrar no WhatsApp</a>
        }
      </footer>
    }
  `,
})
export class ClienteFicha {
  private readonly fiado = inject(FiadoService);

  /** Vêm da URL: /clientes/:id?msg=compra&valor=1200 */
  readonly id = input<string>('');
  readonly msg = input<string>('');
  readonly valor = input<string>('');

  protected readonly reais = formatarReais;
  protected readonly curta = dataCurta;
  protected readonly abrirPagamento = signal(false);
  protected readonly valorPagamento = signal('');
  protected readonly forma = signal<FormaPagamento>('dinheiro');
  protected readonly erroPagamento = signal('');
  private readonly mensagemLocal = signal('');

  protected readonly cliente = computed(() => {
    this.fiado.versao();
    return this.fiado.buscarCliente(this.id());
  });
  protected readonly saldo = computed(() => {
    this.fiado.versao();
    return this.fiado.saldoDoCliente(this.id());
  });
  protected readonly historico = computed(() => {
    this.fiado.versao();
    return this.fiado.historico(this.id());
  });
  protected readonly linkCobranca = computed(() => {
    this.fiado.versao();
    return this.fiado.linkCobranca(this.id());
  });
  protected readonly mensagem = computed(() => {
    if (this.mensagemLocal()) return this.mensagemLocal();
    if (this.msg() === 'compra') return `Compra registrada: ${formatarReais(Number(this.valor()) || 0)}`;
    if (this.msg() === 'cliente') return 'Cliente cadastrado';
    return '';
  });

  protected pagar(evento: Event): void {
    evento.preventDefault();
    const resultado = this.fiado.registrarPagamento({
      clienteId: this.id(),
      valor: this.valorPagamento(),
      data: this.fiado.hoje(),
      formaPagamento: this.forma(),
    });
    if (!resultado.ok) {
      this.erroPagamento.set(resultado.erro);
      return;
    }
    this.erroPagamento.set('');
    this.valorPagamento.set('');
    this.abrirPagamento.set(false);
    this.mensagemLocal.set(`Pagamento registrado: ${formatarReais(resultado.valor.valorCentavos)}`);
  }
}
