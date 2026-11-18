# Fiado Fácil

MVP de controle de vendas no fiado para pequenos comércios de bairro, desenvolvido na disciplina de Projeto de Software.

O projeto nasceu do diagnóstico com a **Mercearia Bom Preço**, que controlava o fiado em um caderno. As anotações ficavam ilegíveis, eram esquecidas ou contestadas pelos clientes, e o fechamento do mês tomava uma tarde inteira. O Fiado Fácil substitui o caderno por um aplicativo simples, feito para o celular e para quem tem pouca familiaridade com tecnologia.

**ODS relacionado:** ODS 8 – Trabalho Decente e Crescimento Econômico (metas 8.3 e 8.10).

## Funcionalidades

| Requisito | Descrição | Prioridade |
|---|---|---|
| RF01 | Cadastro de clientes (nome, telefone com DDD, observação) | Obrigatório |
| RF02 | Registro de compra no fiado, com validação de valor e data | Obrigatório |
| RF03 | Registro de pagamento total ou parcial | Obrigatório |
| RF04 | Saldo devedor calculado e histórico do cliente | Obrigatório |
| RF05 | Lista de quem deve, do maior para o menor, com total a receber | Desejável |
| RF06 | Botão "Cobrar no WhatsApp" com mensagem pronta | Desejável |
| RF07 | Resumo mensal (regra implementada no serviço; tela prevista) | Desejável |

## Tecnologias

- **Angular 22** (standalone components, signals, lazy loading)
- **TypeScript**
- **Vitest** (testes unitários e de integração)
- **GitHub Actions** (integração contínua)

## Arquitetura

Monolito em três camadas:

```
src/app/
├── pages/        → Apresentação: telas (início, nova compra, ficha, novo cliente)
├── services/     → Regras de negócio: validações, cálculo de saldo, devedores, cobrança
├── data/         → Acesso a dados (padrão Repository)
├── models/       → Tipos das entidades: Cliente, Compra, Pagamento
└── utils/        → Conversão de valores em centavos e formatação
```

As telas nunca acessam os dados diretamente. Todo acesso passa pelo `FiadoService`, que usa a interface `FiadoRepository`.

Nesta versão, os dados ficam no próprio aparelho (`localStorage`), o que já permite usar sem internet. A migração para o **Cloud Firestore**, com login pelo Firebase Authentication, está prevista: basta criar uma nova implementação de `FiadoRepository`, sem mudar as telas nem as regras.

Os valores em dinheiro são guardados em **centavos (inteiros)**, para evitar erros de arredondamento.

## Acessibilidade

- Botões e itens de lista com no mínimo 48 px de altura.
- Texto base de 16 px e valores em dinheiro de 24 px ou mais.
- Contraste acima de 4,5:1.
- Todos os campos com rótulo visível.
- Mensagens de erro que explicam como corrigir.
- Confirmações e alertas com texto e ícone, não só cor.
- Teclado numérico no campo de valor.

## Como rodar

Pré-requisito: Node.js 22 ou superior.

```bash
npm install
npm start          # abre em http://localhost:4200
npm run build      # build de produção
npx ng test --watch=false   # roda os testes
```

## Testes

- `src/app/utils/dinheiro.spec.ts`: testes unitários de conversão e formatação de valores.
- `src/app/services/fiado.service.spec.ts`: testes unitários das regras de negócio (RF01 a RF07).
- `src/app/integracao.spec.ts`: testes de integração (tela + serviço + armazenamento) cobrindo o fluxo central.

## Integração contínua

O workflow `.github/workflows/ci.yml` roda a cada push e Pull Request para a `main`. Ele instala as dependências, faz o build de produção e executa todos os testes.

## Padrão de commits

O projeto usa commits semânticos:

- `feat:` nova funcionalidade
- `fix:` correção
- `test:` testes
- `ci:` integração contínua
- `docs:` documentação
- `style:` ajustes visuais
- `refactor:` reorganização de código sem mudar o comportamento
