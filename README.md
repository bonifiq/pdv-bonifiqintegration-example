# PDV Example - Integração BonifiQ para PDVs

Este repositório demonstra como um PDV genérico pode se conectar à BonifiQ durante o fluxo de venda.

A aplicação React incluída aqui é apenas uma demo visual. O ponto principal é mostrar **em quais momentos do PDV chamar a BonifiQ**, quais dados enviar e como usar as respostas para exibir pontos, cashback, recompensas e registrar a venda.

[Guia oficial de integração POS](https://developers.bonifiq.com.br/guias/pos-integration)

## Objetivo da Demo

Esta demo ajuda desenvolvedores de PDVs a entender:

- como consultar recompensas disponíveis para um cliente identificado por CPF;
- como exibir pontos, cashback e descontos retornados pela BonifiQ;
- como validar o cliente quando necessário;
- como resgatar uma recompensa selecionada;
- como enviar a venda concluída para a BonifiQ;
- como tratar vendas sem recompensa, mas que ainda devem ser registradas para pontuação;
- como cancelar pedido ou recompensa quando houver estorno/cancelamento.

## Fluxo Resumido

```text
1. Etapa de cliente e produtos
   -> Vendedor identifica o cliente por CPF
   -> Monta e confere o carrinho

2. Etapa de pagamento e benefícios
   -> Seleciona pagamento em dinheiro
   -> Pode informar um desconto manual em reais
   -> POST /rewards/available com produtos e desconto atuais
   -> PDV exibe pontos, cashback e recompensas disponíveis

3. Cliente seleciona uma recompensa e confirma no popup
   -> A confirmação inicia imediatamente challenge/challengevalidate quando necessário
   -> Não existe uma segunda ação separada para resgatar

4. PDV resgata a recompensa selecionada
   -> Recompensas comuns: POST /rewards/{id}/redeem
   -> Brinde/desconto em produto: POST /RewardConfigurations/{id}/product-discount/redeem
   -> Nesse segundo caso, adiciona ao carrinho uma linha com o preço final do resgate
   -> Guarda o ExternalCode retornado

5. Vendedor confere o produto resgatado no carrinho e conclui a venda
   -> Aplica desconto/cashback no total pago
   -> Se voltar para editar cliente ou produtos, DELETE /rewards/{id} é executado antes de liberar o carrinho
   -> Produtos adicionados pelo resgate são removidos somente após o estorno confirmado

6. PDV envia a venda para a BonifiQ
   -> POST /orders
   -> Envia o ExternalCode no campo coupon quando houve resgate

7. Se a venda for cancelada
   -> Total: POST /orders/{id}/cancel
   -> Parcial: POST /{orderId}/partialcancel com ValueToRefund e CancelKey
```

## Onde Plugar no Seu PDV

| Momento no PDV | O que chamar na BonifiQ | Observação |
|---|---|---|
| Cliente informa CPF | `POST /rewards/available` | Consulta saldo, cashback e recompensas disponíveis. |
| Carrinho muda | `POST /rewards/available` | Reconsulte usando o novo valor da compra, pois regras podem depender do total. |
| Cliente escolhe recompensa | `POST /customers/{id}/challenge` e `POST /customers/{id}/challengevalidate` | Use quando `shouldValidateCustomer` indicar validação. |
| Recompensa confirmada | `POST /rewards/{id}/redeem` | Resgata o benefício e retorna o `ExternalCode`. |
| Venda paga/concluída | `POST /orders` | Sempre envie a venda, mesmo sem recompensa, para registrar pontuação. |
| Venda cancelada totalmente | `POST /orders/{id}/cancel` | Use para remover pontos e cancelar o pedido completo na BonifiQ. |
| Venda cancelada parcialmente | `POST /{orderId}/partialcancel` | Envie o valor estornado e uma chave única de cancelamento. |

## Responsabilidades

O PDV continua responsável por:

- identificar cliente e montar carrinho;
- calcular subtotal, descontos aplicados e total líquido pago;
- conduzir pagamento e fechamento da venda;
- enviar pedido concluído para a BonifiQ;
- controlar cancelamentos e estornos no fluxo operacional.
- localizar no catálogo o `ExternalProductId` de um brinde/desconto em produto e adicioná-lo ao carrinho após o resgate;
- calcular o preço pago da linha usando o `ProductDiscountTotal` retornado e enviá-lo no pedido.

A BonifiQ retorna:

- pontos disponíveis;
- saldo de cashback;
- lista de recompensas;
- elegibilidade de cada recompensa;
- valor máximo de cashback para a compra atual;
- necessidade de validação do cliente;
- código externo do resgate para vincular recompensa ao pedido;
- resultado do registro/cancelamento do pedido.

> Em produção, o PDV não deve recalcular regras de elegibilidade da BonifiQ. Campos como `canUse`, `hasRewards`, `maxCashbackForCurrentPurchase` e `shouldValidateCustomer` já vêm calculados pela API.

## Valor Líquido do Pedido

Via de regra, o campo `OrderTotal` enviado para a BonifiQ deve representar o valor líquido da venda: produtos menos bônus, cupons, descontos, taxas, frete ou outros ajustes aplicáveis no PDV.

Nesta demo, o vendedor pode informar um desconto manual em reais na etapa de pagamento. O valor é limitado ao subtotal e aplicado antes de consultar/aplicar benefícios BonifiQ:

```text
Valor dos produtos
- Desconto manual informado pelo vendedor
= Base para BonifiQ
- Cashback ou recompensa BonifiQ
= OrderTotal enviado para a BonifiQ
```

Com isso, cashback e recompensas BonifiQ são calculados sobre a base líquida após o desconto manual, não sobre o valor bruto dos produtos. Por enquanto, a única forma de pagamento disponível na interface e no pedido é dinheiro.

## Como Executar

```bash
# Clonar este repositório
git clone <url-deste-repositorio>

# Entrar na pasta do projeto
cd pdv-example

# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## Clientes de Teste

Use os seguintes CPFs para testar diferentes cenários:

| CPF | Cliente | Pontos | Cashback | Cenário |
|---|---|---:|---:|---|
| `12345678900` | Maria Silva | 1500 | R$ 25,00 | Cliente com pontos e cashback. |
| `98765432100` | João Santos | 350 | R$ 0,00 | Cliente com pontos, sem cashback. |
| `11122233344` | Ana Costa | 50 | R$ 100,00 | Cliente com cashback alto e poucos pontos. |

## Endpoints Usados

Base URL de produção para o fluxo POS:

```text
https://api.bonifiq.com.br/v1/pvt/POS
```

| Método | Endpoint | Quando usar |
|---|---|---|
| `POST` | `/rewards/available` | Consultar recompensas, pontos e cashback. |
| `POST` | `/customers/{id}/challenge` | Enviar código OTP para validação do cliente. |
| `POST` | `/customers/{id}/challengevalidate` | Validar código OTP informado pelo cliente. |
| `POST` | `/rewards/{id}/redeem` | Resgatar recompensa selecionada. |
| `POST` | `/v1/pvt/RewardConfigurations/{id}/product-discount/redeem` | Resgatar `RewardType = 5` (brinde ou desconto em produto). Este endpoint parte da raiz `https://api.bonifiq.com.br`, não de `/POS`. |
| `DELETE` | `/rewards/{id}` | Cancelar/estornar recompensa resgatada. |
| `POST` | `/orders` | Registrar venda concluída. |
| `POST` | `/orders/{id}/cancel` | Cancelar pedido registrado. |
| `POST` | `/{orderId}/partialcancel` | Cancelar parcialmente um pedido registrado. |

Para cancelamento parcial, a demo calcula o valor líquido dos itens devolvidos e envia esse valor no endpoint `partialcancel`.

## Exemplos de Integração

### Consultar Recompensas

Use quando o cliente informar o CPF e sempre que o valor da compra mudar.

```javascript
const rewards = await BonifiQ.getAvailableRewards(
  customerId,
  purchaseValue,
  discountValue,
  cartItems.map(item => ({
    originalId: item.id,
    lineId: item.id,
    title: item.name,
    quantity: item.quantity,
    productPrice: item.price,
    productDiscountPrice: null,
    isActive: true
  }))
)
```

Campos importantes da resposta:

```javascript
{
  customer: {
    id: 6456,
    originalId: 'melissa.murta@bonifiq.com.br',
    name: 'Mek mek',
    email: 'melissa.murta@bonifiq.com.br',
    phone: '+5531982158778',
    document: '98765432100',
    isEnrolled: true,
    currentTier: {
      name: 'Nível base a',
      color: '#502727ff',
      iconUrl: 'https://.../icone-do-nivel.png'
    }
  },
  hasRewards: true,
  availablePoints: 1500,
  cashbackEnabled: true,
  availableCashback: 25.00,
  maxCashbackForCurrentPurchase: 20.00,
  shouldValidateCustomer: true,
  rewards: [
    {
      id: 4,
      title: 'Usar Cashback',
      rewardType: 3,
      isCashback: true,
      canUse: true,
      availableCashback: 25.00,
      maxCashbackForCurrentPurchase: 20.00
    },
    {
      id: 5,
      title: 'Caneca BonifiQ de brinde',
      rewardType: 5,
      canUse: true,
      points: 0,
      externalProductId: 'P009',
      productDisplayName: 'Caneca BonifiQ',
      productDiscountMode: 2,
      productDiscountValue: 0,
      productMaxUnitsPerRedeem: 1,
      productAvailableQuantity: 20
    },
    {
      id: 7,
      title: 'Squeeze BonifiQ de brinde',
      rewardType: 5,
      canUse: true,
      points: 0,
      externalProductId: 'P010',
      productDisplayName: 'Squeeze BonifiQ',
      productDiscountMode: 2,
      productDiscountValue: 0,
      productMaxUnitsPerRedeem: 1,
      productAvailableQuantity: 15
    }
  ]
}
```

O popup exibido após identificar o cliente usa `customer.currentTier` dessa mesma resposta para mostrar o nome, a cor e o ícone do nível atual. Quando `currentTier` não vier preenchido, o popup continua exibindo apenas pontos e cashback.

Se `hasRewards` for `false`, o PDV deve informar que não há recompensa disponível, mas ainda pode exibir saldos como pontos e cashback.

### Validar Cliente

Use quando a resposta indicar que o cliente deve ser validado antes do resgate.

```javascript
await BonifiQ.sendChallenge(customerId, transactionId)
await BonifiQ.validateChallenge(customerId, transactionId, code)
```

### Resgatar Recompensa

Use quando o cliente confirmar o uso de uma recompensa.

```javascript
const originalKey = `${rewardId}-${customerId}-${Date.now()}`

const redeem = await BonifiQ.redeemReward(
  rewardId,
  customerId,
  reward.isCashback ? cashbackValue : null,
  originalKey
)

const externalCode = redeem.data?.externalCode || redeem.result?.externalCode
```

O `ExternalCode` retornado deve ser enviado no campo `coupon` do pedido para vincular a recompensa à venda.

### Resgatar Brinde ou Desconto em Produto

Recompensas com `rewardType = 5` usam o endpoint dedicado adicionado no PR [bonifiq/loyalty#2310](https://github.com/bonifiq/loyalty/pull/2310). Use o `externalProductId` da listagem para localizar o produto no catálogo do PDV e enviar o preço local.

Na demo, `P009` (Caneca BonifiQ) e `P010` (Squeeze BonifiQ) existem no catálogo interno com `availableForSale: false`. Por isso não aparecem na grade de produtos e só entram no carrinho quando são retornados e resgatados pela BonifiQ.

```javascript
const product = catalog.find(item => item.id === reward.externalProductId)
const originalKey = `${reward.id}-${customerId}-${Date.now()}`

const redeem = await BonifiQ.redeemProductDiscountReward(
  reward.id,
  customerId,
  {
    externalProductId: reward.externalProductId,
    quantity: 1,
    productPrice: product.price,
    productDiscountPrice: null,
    hasPromotion: false
  },
  originalKey
)

const redeemData = redeem.data || redeem.result
```

Os modos retornados em `productDiscountMode` são:

| Valor | Modo |
|---:|---|
| `0` | Desconto percentual |
| `1` | Preço final fixo |
| `2` | Brinde gratuito |
| `3` | Desconto em valor fixo |

Depois do resgate:

- adicione uma nova linha do produto ao carrinho, mesmo que o mesmo SKU já exista em outra linha;
- para brinde (`mode = 2`), adicione a linha com preço final zero; nesse modo o Loyalty retorna `productDiscountTotal = 0`;
- para os demais modos, calcule o preço unitário final subtraindo do preço original o `productDiscountTotal` retornado (dividido pela quantidade resgatada);
- mantenha essa linha no carrinho para conferência antes de finalizar a venda;
- envie o preço final no `productPrice` do produto do pedido;
- envie o `externalCode` no campo escalar `coupon` do pedido, como nas demais recompensas.

### Registrar Pedido

Use depois que a venda foi paga/concluída no PDV.

`orderTotal` deve receber o valor líquido final pago pelo cliente.

```javascript
const productTotal = 200.00
const manualDiscount = 10.00
const bonifiqBaseTotal = productTotal - manualDiscount
const cashbackUsed = 20.00
const totalPaid = bonifiqBaseTotal - cashbackUsed

const orderData = {
  originalId: orderId,
  orderPlacementDate: now,
  orderCompletedDate: now,
  orderStatus: 'Concluído',
  isCancelledOrReturned: false,
  isCompleted: true,
  orderTotal: totalPaid,
  coupon: externalCode,
  customer: {
    originalId: customer.document,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    document: customer.document,
    isEnrolled: true
  },
  products: cartItems.map(item => ({
    originalId: item.originalId || item.id,
    title: item.name,
    quantity: item.quantity,
    price: item.price,
    productPrice: item.price,
    productDiscountPrice: item.originalPrice > item.price ? item.price : null,
    isActive: true
  }))
}

await BonifiQ.createOrder(orderData)
```

Mesmo quando nenhuma recompensa é usada, envie o pedido para a BonifiQ. Esse registro permite pontuar o cliente conforme a configuração do programa.

### Cancelar Pedido

Para cancelamento total, use o endpoint específico de cancelamento:

```javascript
await BonifiQ.cancelOrder(orderId, new Date().toISOString(), 'Cancelado')
```

Para cancelamento parcial, use o mesmo ID original do pedido e envie o valor estornado:

```javascript
const valueToRefund = 25.90
const cancelKey = `PARTIAL-${orderId}-${Date.now()}`

await BonifiQ.partialCancelOrder(orderId, valueToRefund, cancelKey)
```

O `CancelKey` deve ser único por cancelamento parcial para evitar duplicidade.

Na demo, os pedidos ficam em memória e podem ser cancelados pela tela “Pedidos feitos”.

## Cenários Cobertos na Demo

- Cliente com pontos suficientes para usar desconto.
- Cliente com cashback disponível.
- Cliente sem cashback.
- Cliente sem recompensa disponível para a compra atual.
- Desconto manual aplicado antes da base BonifiQ.
- Resgate de recompensa com validação de identidade.
- Registro da venda na BonifiQ após conclusão.
- Exibição de confirmação visual de que a venda foi enviada para a BonifiQ.
- Listagem de pedidos feitos em memória.
- Cancelamento total enviado para a BonifiQ.
- Cancelamento parcial por item usando `/{orderId}/partialcancel`.

## Adaptando para Produção

### Alternar Mock e Produção

O arquivo `src/services/bonifiq/index.js` centraliza a escolha entre API mockada e API real. Deixe apenas uma das opções importada:

```javascript
// Para MOCK (demonstração):
import * as api from './api.mock'

// Para PRODUÇÃO:
// import * as api from './api.production'
```

Neste repositório, confira esse arquivo para ver qual implementação está ativa antes de rodar a demo.

### Configurar Credenciais

No arquivo `src/services/bonifiq/api.production.js`, configure as credenciais obtidas no painel da BonifiQ:

```javascript
const API_USERNAME = 'SEU-USUARIO-API'
const API_PASSWORD = 'SUA-SENHA-API'
```

A autenticação usa Basic Auth com Base64 de `username:password`.

### Normalização de Campos

A API BonifiQ usa PascalCase em produção, por exemplo `HasRewards` e `CanUse`.

A demo converte automaticamente:

- resposta da API de PascalCase para camelCase;
- payload enviado de camelCase para PascalCase.

Essas funções estão em `src/services/bonifiq/api.production.js`.

## Estrutura do Projeto

A demo separa o que é PDV do que é integração BonifiQ:

```text
pdv-example/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── App.jsx                         # Orquestra PDV + BonifiQ
    ├── data/                           # Produtos e clientes simulados
    ├── components/
    │   ├── pdv/                        # Componentes puros do PDV
    │   └── bonifiq/                    # UI da integração BonifiQ
    │       ├── BonifiQSection.jsx      # Consulta e seleção de recompensas
    │       ├── RewardsSummaryModal.jsx # Resumo de pontos e cashback
    │       └── ValidationModal.jsx     # Validação OTP
    └── services/
        └── bonifiq/
            ├── api.mock.js             # Simulação local
            ├── api.production.js       # Chamadas HTTP reais
            ├── helpers.js              # Helpers de desconto/formatação
            ├── mockData.js             # Dados da demo
            └── index.js                # Exportação centralizada
```

Ponto principal para adaptação: em um PDV real, a pasta `services/bonifiq/` representa a camada de integração que pode ser portada para a stack usada pelo seu sistema.

## Links Úteis

- [Guia POS Integration](https://developers.bonifiq.com.br/guias/pos-integration)
- [Swagger API](https://api.bonifiq.com.br/apidocs/private/index.html?url=/swagger/Private%20APIs/swagger.json#/POS)
- [Central de Ajuda](https://suporte.bonifiq.com.br)

## Licença

Este exemplo é fornecido como demonstração e pode ser usado como base para integrações com a BonifiQ.
