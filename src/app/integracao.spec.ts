import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { FIADO_REPOSITORY, LocalStorageFiadoRepository } from './data/fiado-repository';
import { FiadoService } from './services/fiado.service';

/**
 * Testes de integração: tela + serviço + repositório gravando no localStorage,
 * percorrendo o fluxo central (cadastrar cliente -> registrar compra -> ver saldo).
 */
describe('Integração – fluxo central do Fiado Fácil', () => {
  let service: FiadoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        { provide: FIADO_REPOSITORY, useFactory: () => new LocalStorageFiadoRepository() },
      ],
    });
    service = TestBed.inject(FiadoService);
  });

  function digitar(el: HTMLElement, seletor: string, valor: string) {
    const input = el.querySelector(seletor) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  }

  it('os dados continuam salvos depois de recarregar (persistência local)', () => {
    const r = service.cadastrarCliente({ nome: 'Maria Souza', telefone: '11987654321' });
    if (!r.ok) throw new Error(r.erro);
    service.registrarCompra({ clienteId: r.valor.id, valor: '12', data: service.hoje() });

    const outroRepo = new LocalStorageFiadoRepository();
    expect(outroRepo.listarClientes()[0].nome).toBe('Maria Souza');
    expect(outroRepo.listarCompras(r.valor.id)[0].valorCentavos).toBe(1200);
  });

  it('registra uma compra pela tela e mostra o novo saldo na ficha', async () => {
    const r = service.cadastrarCliente({ nome: 'Maria Souza', telefone: '11987654321' });
    if (!r.ok) throw new Error(r.erro);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/compras/nova?clienteId=${r.valor.id}`);
    const tela = harness.routeNativeElement!;

    // 1) Valor zero: a tela mostra o erro e nada é gravado
    digitar(tela, '#valor', '0');
    (tela.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(tela.querySelector('[role="alert"]')?.textContent).toContain('Digite um valor maior que zero');
    expect(service.saldoDoCliente(r.valor.id)).toBe(0);

    // 2) Valor correto: grava e vai para a ficha com a confirmação
    digitar(tela, '#valor', '12,00');
    (tela.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toContain(`/clientes/${r.valor.id}`);
    const ficha = harness.routeNativeElement!;
    expect(ficha.querySelector('[role="status"]')?.textContent).toContain('Compra registrada: R$ 12,00');
    expect(ficha.querySelector('.saldo-valor')?.textContent).toContain('R$ 12,00');
  });

  it('a tela inicial lista quem deve, do maior para o menor', async () => {
    const maria = service.cadastrarCliente({ nome: 'Maria Souza', telefone: '11987654321' });
    const jose = service.cadastrarCliente({ nome: 'José Carlos', telefone: '11911112222' });
    if (!maria.ok || !jose.ok) throw new Error('falha no cadastro');
    service.registrarCompra({ clienteId: maria.valor.id, valor: '15,50', data: service.hoje() });
    service.registrarCompra({ clienteId: jose.valor.id, valor: '80', data: service.hoje() });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    const tela = harness.routeNativeElement!;
    const nomes = Array.from(tela.querySelectorAll('.nome')).map((n) => n.textContent?.trim());
    expect(nomes).toEqual(['José Carlos', 'Maria Souza']);
    expect(tela.querySelector('.total')?.textContent).toContain('R$ 95,50');
  });
});
