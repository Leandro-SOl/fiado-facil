import { TestBed } from '@angular/core/testing';
import { FIADO_REPOSITORY, MemoriaFiadoRepository } from '../data/fiado-repository';
import { FiadoService } from './fiado.service';

describe('FiadoService (testes unitários das regras de negócio)', () => {
  let service: FiadoService;
  let repo: MemoriaFiadoRepository;

  beforeEach(() => {
    repo = new MemoriaFiadoRepository();
    TestBed.configureTestingModule({
      providers: [{ provide: FIADO_REPOSITORY, useValue: repo }],
    });
    service = TestBed.inject(FiadoService);
    service.definirRelogio(() => new Date(2026, 10, 17, 10, 0, 0));
  });

  function criarMaria() {
    const r = service.cadastrarCliente({ nome: 'Maria Souza', telefone: '(11) 98765-4321' });
    if (!r.ok) throw new Error(r.erro);
    return r.valor;
  }

  describe('RF01 – cadastro de cliente', () => {
    it('cadastra um cliente com telefone só com números', () => {
      const maria = criarMaria();
      expect(maria.telefone).toBe('11987654321');
      expect(service.listarClientes().length).toBe(1);
    });

    it('bloqueia telefone duplicado', () => {
      criarMaria();
      const r = service.cadastrarCliente({ nome: 'Outra Pessoa', telefone: '11987654321' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toBe('Já existe um cliente com este telefone.');
    });

    it('bloqueia nome curto, telefone sem DDD e sinais de marcação', () => {
      expect(service.cadastrarCliente({ nome: 'A', telefone: '11987654321' }).ok).toBe(false);
      expect(service.cadastrarCliente({ nome: 'Ana', telefone: '98765' }).ok).toBe(false);
      expect(service.cadastrarCliente({ nome: '<script>', telefone: '11987654321' }).ok).toBe(false);
    });
  });

  describe('RF02 – registro de compra', () => {
    it('registra a compra em centavos e com quem registrou', () => {
      const maria = criarMaria();
      service.usuarioAtual.set('Lucas');
      const r = service.registrarCompra({ clienteId: maria.id, valor: '35,50', data: '2026-11-14' });
      expect(r.ok).toBe(true);
      expect(repo.compras[0].valorCentavos).toBe(3550);
      expect(repo.compras[0].registradoPor).toBe('Lucas');
    });

    it('bloqueia valor zero ou inválido com mensagem clara', () => {
      const maria = criarMaria();
      const r = service.registrarCompra({ clienteId: maria.id, valor: '0,00', data: '2026-11-17' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toBe('Digite um valor maior que zero.');
      expect(service.registrarCompra({ clienteId: maria.id, valor: 'abc', data: '2026-11-17' }).ok).toBe(false);
      expect(repo.compras.length).toBe(0);
    });

    it('bloqueia data no futuro e cliente inexistente', () => {
      const maria = criarMaria();
      expect(service.registrarCompra({ clienteId: maria.id, valor: '10', data: '2026-11-18' }).ok).toBe(false);
      expect(service.registrarCompra({ clienteId: 'nao-existe', valor: '10', data: '2026-11-17' }).ok).toBe(false);
    });
  });

  describe('RF03 e RF04 – pagamento e saldo', () => {
    it('calcula o saldo como compras menos pagamentos', () => {
      const maria = criarMaria();
      service.registrarCompra({ clienteId: maria.id, valor: '35,50', data: '2026-11-14' });
      service.registrarPagamento({ clienteId: maria.id, valor: '20', data: '2026-11-16', formaPagamento: 'dinheiro' });
      service.registrarCompra({ clienteId: maria.id, valor: '12,00', data: '2026-11-17' });
      expect(service.saldoDoCliente(maria.id)).toBe(2750);
    });

    it('não aceita pagamento maior que o saldo', () => {
      const maria = criarMaria();
      service.registrarCompra({ clienteId: maria.id, valor: '35,50', data: '2026-11-14' });
      const r = service.registrarPagamento({ clienteId: maria.id, valor: '50', data: '2026-11-17', formaPagamento: 'pix' });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toBe('O valor é maior que o saldo devedor.');
    });

    it('mostra o histórico do mais recente para o mais antigo', () => {
      const maria = criarMaria();
      service.registrarCompra({ clienteId: maria.id, valor: '35,50', data: '2026-11-14' });
      service.registrarPagamento({ clienteId: maria.id, valor: '20', data: '2026-11-16', formaPagamento: 'dinheiro' });
      const h = service.historico(maria.id);
      expect(h.map((i) => i.tipo)).toEqual(['PAGAMENTO', 'COMPRA']);
    });
  });

  describe('RF05, RF06 e RF07', () => {
    it('lista devedores do maior para o menor e soma o total', () => {
      const maria = criarMaria();
      const jose = service.cadastrarCliente({ nome: 'José Carlos', telefone: '11911112222' });
      const ana = service.cadastrarCliente({ nome: 'Ana Lima', telefone: '11933334444' });
      if (!jose.ok || !ana.ok) throw new Error('falha no cadastro');
      service.registrarCompra({ clienteId: maria.id, valor: '27,50', data: '2026-11-14' });
      service.registrarCompra({ clienteId: jose.valor.id, valor: '80', data: '2026-11-15' });
      const devedores = service.listarDevedores();
      expect(devedores.map((d) => d.cliente.nome)).toEqual(['José Carlos', 'Maria Souza']);
      expect(service.totalAReceber()).toBe(10750);
    });

    it('gera o link do WhatsApp só quando há dívida', () => {
      const maria = criarMaria();
      expect(service.linkCobranca(maria.id)).toBeNull();
      service.registrarCompra({ clienteId: maria.id, valor: '27,50', data: '2026-11-14' });
      const link = service.linkCobranca(maria.id)!;
      expect(link.startsWith('https://wa.me/5511987654321?text=')).toBe(true);
      expect(decodeURIComponent(link)).toContain('R$ 27,50');
    });

    it('calcula o resumo do mês', () => {
      const maria = criarMaria();
      service.registrarCompra({ clienteId: maria.id, valor: '100', data: '2026-11-05' });
      service.registrarCompra({ clienteId: maria.id, valor: '50', data: '2026-10-30' });
      service.registrarPagamento({ clienteId: maria.id, valor: '60', data: '2026-11-10', formaPagamento: 'pix' });
      expect(service.resumoDoMes('2026-11')).toEqual({
        vendidoCentavos: 10000,
        recebidoCentavos: 6000,
        emAbertoCentavos: 4000,
      });
    });
  });
});
