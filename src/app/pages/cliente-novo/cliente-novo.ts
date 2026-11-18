import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FiadoService } from '../../services/fiado.service';

/** Cadastro de cliente (RF01). */
@Component({
  selector: 'app-cliente-novo',
  imports: [RouterLink],
  template: `
    <header class="barra">
      <a class="voltar" routerLink="/">← Voltar</a>
      <h1>Novo cliente</h1>
    </header>

    <form class="conteudo" (submit)="salvar($event)" novalidate>
      <div class="campo">
        <label for="nome">Nome *</label>
        <input id="nome" autocomplete="off" [value]="nome()" (input)="nome.set($any($event.target).value)" />
      </div>
      <div class="campo">
        <label for="telefone">Telefone com DDD *</label>
        <input id="telefone" type="tel" inputmode="tel" placeholder="Ex.: 11987654321"
               [value]="telefone()" (input)="telefone.set($any($event.target).value)" />
      </div>
      <div class="campo">
        <label for="obs">Observação (opcional)</label>
        <input id="obs" placeholder="Ex.: filha da Dona Maria" [value]="observacao()"
               (input)="observacao.set($any($event.target).value)" />
        <p class="dica">Até 100 letras</p>
      </div>

      @if (erro()) {
        <p class="erro" role="alert">⛔ {{ erro() }}</p>
      }

      <div class="rodape fixo">
        <button type="submit" class="botao principal">✔ Salvar cliente</button>
      </div>
    </form>
  `,
})
export class ClienteNovo {
  private readonly fiado = inject(FiadoService);
  private readonly router = inject(Router);

  protected readonly nome = signal('');
  protected readonly telefone = signal('');
  protected readonly observacao = signal('');
  protected readonly erro = signal('');

  protected salvar(evento: Event): void {
    evento.preventDefault();
    const resultado = this.fiado.cadastrarCliente({
      nome: this.nome(),
      telefone: this.telefone(),
      observacao: this.observacao(),
    });
    if (!resultado.ok) {
      this.erro.set(resultado.erro);
      return;
    }
    this.router.navigate(['/clientes', resultado.valor.id], { queryParams: { msg: 'cliente' } });
  }
}
