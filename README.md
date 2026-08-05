# PDV Demo — integração BonifiQ

Referência executável para desenvolvedores entenderem **quando chamar a BonifiQ**, quais dados enviar e o que o PDV deve persistir durante venda, resgate e estorno.

A interface é uma demonstração React. Os contratos JSON, a sequência de operações e as responsabilidades são independentes de framework ou linguagem.

## Comece em cinco minutos

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173` usando o **mock local**. Nenhuma credencial é necessária.

Na barra “Explore um cenário de integração”:

1. selecione um cenário;
2. conclua o fluxo no PDV;
3. abra **Ver integração**;
4. inspecione endpoint, payload, resposta e dados que devem ser persistidos.

## Fluxo principal

```text
Cliente + carrinho
  → POST /POS/rewards/available
  → confirmação do benefício
  → challenge/validate, quando ShouldValidateCustomer ou ShouldValidateCustomerSignup=true
  → redeem
  → benefício ou produto entra na venda
  → POST /POS/orders com ExternalCode em Coupon
```

Ao voltar para editar uma venda que já possui resgate, o PDV executa o estorno antes de liberar o carrinho.

## O que é autoritativo

**BonifiQ calcula:** elegibilidade, `CanUse`, `CannotUseReason`, pontos, cashback, limites, necessidade de OTP e disponibilidade da configuração offline de `RewardType=5`.

**PDV controla:** cliente, catálogo, carrinho, pagamento, descontos próprios e o preço da nova linha criada por `RewardType=5`, além do total líquido, persistência de identificadores e compensações.

O PDV não deve reproduzir as regras de elegibilidade da BonifiQ.

## Guias

- [Fluxo e responsabilidades](docs/fluxo.md): sequência completa, estados e matriz de integração.
- [Cookbook de API](docs/cookbook.md): JSON, cURL, TypeScript, recompensas comuns e `RewardType=5`.
- [Produção e operações](docs/producao.md): segurança, idempotência, retries, pedidos e cancelamentos.

## Cenários disponíveis

- desconto com OTP;
- cashback;
- venda sem recompensa;
- resgate sem OTP;
- brinde oculto no catálogo;
- desconto em produto;
- SKU ausente no PDV;
- falha de resgate seguida de retry idempotente.

Os produtos `P009` e `P010` possuem `availableForSale: false`: não aparecem na grade, mas podem entrar no carrinho após um resgate BonifiQ.

## Testar a API real localmente

Copie `.env.example` para `.env.local` e configure:

```dotenv
VITE_BONIFIQ_MODE=api
VITE_BONIFIQ_API_BASE_URL=https://api.bonifiq.com.br/v1/pvt
VITE_BONIFIQ_API_USERNAME=...
VITE_BONIFIQ_API_PASSWORD=...
```

> **Somente demonstração local:** valores `VITE_*` são incluídos no bundle e ficam visíveis no navegador. Um PDV real deve manter credenciais em backend, serviço local seguro ou cofre de segredos.

Todo resgate POS, inclusive `RewardType=5`, usa `POST /POS/rewards/{id}/redeem`. O redeem confirma uma unidade e retorna o `ExternalProductId` offline; o PDV localiza esse SKU no próprio catálogo, adiciona uma nova linha e aplica nela o modo de desconto retornado por `/available`.

Nunca versione `.env.local`. Credenciais que já tenham sido publicadas devem ser rotacionadas.

## Organização do código

```text
src/
├── bonifiq/       # contratos, clientes mock/HTTP, reducer, regras e trace
├── pdv/           # domínio monetário, tipos e orquestração da venda
├── components/    # apresentação; não chama fetch diretamente
└── data/          # catálogo e clientes locais da demonstração
```

`BonifiqClient` é a fronteira copiável da integração. Mock e HTTP implementam a mesma interface e retornam `ApiResult<T>` normalizado.

## Verificações

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Documentação oficial: [Guia POS Integration](https://developers.bonifiq.com.br/guias/pos-integration) e [Swagger Private API](https://api.bonifiq.com.br/apidocs/private/index.html?url=/swagger/Private%20APIs/swagger.json#/POS).
