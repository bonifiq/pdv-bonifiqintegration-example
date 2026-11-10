# Cookbook de API

Os exemplos usam a raiz `<BONIFIQ_BASE_URL>`, normalmente terminada em `/v1/pvt`. Use credenciais apenas em um ambiente seguro.

## Consultar recompensas

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/available' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId": "12345678900",
    "PurchaseValue": 129.90,
    "DiscountValue": 0,
    "Products": [{
      "OriginalId": "P002",
      "LineId": "P002",
      "Title": "Calça Jeans",
      "Quantity": 1,
      "ProductPrice": 129.90,
      "IsActive": true
    }]
  }'
```

Resposta relevante:

```json
{
  "Customer": {
    "OriginalId": "12345678900",
    "Name": "Maria Silva",
    "CurrentTier": { "Name": "Nível Ouro", "Color": "#d97706" }
  },
  "ShouldValidateCustomer": true,
  "AvailablePoints": 1500,
  "Rewards": [{
    "Id": 461,
    "Title": "Caneca",
    "RewardType": 5,
    "CanUse": true,
    "CannotUseReason": 0,
    "ExternalProductId": "P009",
    "ProductDisplayName": "Caneca",
    "ProductDiscountMode": 1,
    "ProductDiscountValue": 0.01,
    "ProductMaxUnitsPerRedeem": 1
  }]
}
```

`PurchaseValue` é o total bruto e `DiscountValue` leva descontos próprios do PDV separadamente. `Products` participa das regras de cashback e itens restritos, mas não determina a disponibilidade offline de `RewardType=5`. No exemplo, a venda possui somente `P002`, porém a recompensa `P009` continua utilizável porque será adicionada como uma nova linha. O redeem POS desta versão sempre confirma exatamente uma unidade.

## Contexto da venda

O PDV envia a mesma loja (`Branch`), política comercial (`TradePolicy`), vendedor (`SalesPerson`) e forma de pagamento (`PaymentMethods`) na consulta, no resgate e no pedido:

```json
{
  "Branch": { "OriginalId": "LOJA-002", "Name": "Loja Outlet" },
  "TradePolicy": { "OriginalId": "OUTLET", "Name": "Outlet" },
  "SalesPerson": { "OriginalId": "VENDEDOR-001", "Name": "João Silva" },
  "PaymentMethods": [{ "OriginalId": "DINHEIRO", "Name": "Dinheiro" }]
}
```

No pedido, esses campos alimentam as regras de pontos extras por loja, política comercial e forma de pagamento. Na consulta e no resgate eles ainda não alteram o resultado: ficam reservados para regras de resgate por loja ou política comercial. `PaidAmount` só é enviado no pedido, quando o valor pago é conhecido.

O seletor no cabeçalho do PDV troca entre `Loja Centro · Full price` e `Loja Outlet · Outlet` e consulta os benefícios novamente.

## Cliente TypeScript

Toda operação usa a mesma interface:

```ts
const result = await bonifiqClient.getAvailableRewards(request)

if (!result.ok) {
  showError(result.error.friendlyMessage)
  return
}

const { rewards, customer, shouldValidateCustomer } = result.data
```

O cliente HTTP converte PascalCase na fronteira. O restante do PDV usa contratos camelCase tipados.

## Challenge e validação

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/customers/12345678900/challenge' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{"TransactionId":"PDV-OTP-123"}'
```

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/customers/12345678900/challengevalidate' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{"TransactionId":"PDV-OTP-123","Code":"1234"}'
```

Pule essas chamadas somente quando `ShouldValidateCustomer=false` **e** `ShouldValidateCustomerSignup=false`. Quando a validação for de cadastro, envie também `Document`, `Name` e, se disponíveis, `Email` e `Phone` no challenge.

## Resgatar qualquer recompensa

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/1/redeem' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId":"12345678900",
    "OriginalKey":"PDV-REWARD-1-123",
    "RedeemOrigin":5
  }'
```

Para cashback, `Value` recebe o valor escolhido, limitado por `MaxCashbackForCurrentPurchase`. Para os demais tipos, inclusive `RewardType=5`, omita `Value`.

## Brinde ou desconto em produto

`RewardType=5` usa exatamente o mesmo endpoint POS. Não envie produto, quantidade, preço, promoção ou `ForceGenerateCoupon` no redeem:

```bash
curl --request POST \
  --url '<BONIFIQ_BASE_URL>/POS/rewards/461/redeem' \
  --header 'Authorization: Basic <CREDENCIAL_BASE64>' \
  --header 'Content-Type: application/json' \
  --data '{
    "CustomerId":"12345678900",
    "OriginalKey":"PDV-REWARD-461-123",
    "RedeemOrigin":5
  }'
```

Resposta POS relevante:

```json
{
  "Result": {
    "RewardId": 9876,
    "ExternalCode": "BNF-EXTERNAL-CODE",
    "OriginalKey": "PDV-REWARD-461-123",
    "ExternalProductId": "P009"
  }
}
```

| `ProductDiscountMode` | Significado | Preço final da linha |
|---:|---|---|
| `0` | Percentual | `preço do catálogo - arredondar(preço do catálogo × valor / 100)` |
| `1` | Preço final fixo | `ProductDiscountValue` |
| `2` | Brinde | Zero |
| `3` | Valor fixo | `máximo(0, preço do catálogo - ProductDiscountValue)` |

O POS não recebe `ProductDiscountTotal`: esse campo pertence somente ao fluxo de checkout online. O PDV calcula o valor financeiro em centavos usando o preço atual de seu catálogo e os dados de `/available`, valida o `ExternalProductId` devolvido e adiciona uma linha separada de quantidade `1`. Essa regra vale para os quatro modos, inclusive quando o SKU já existe no carrinho. Produtos de recompensa podem estar ocultos da venda direta, mas precisam existir no catálogo local.

## Registrar pedido

```json
{
  "OriginalId": "PDV-ORDER-123",
  "OrderTotal": 119.90,
  "Coupon": "EXTERNAL-CODE-DO-REDEEM",
  "IsCompleted": true,
  "Customer": {
    "OriginalId": "12345678900",
    "Name": "Maria Silva",
    "Document": "12345678900",
    "IsEnrolled": true
  },
  "Products": [{
    "OriginalId": "P002",
    "Title": "Calça Jeans",
    "ProductPrice": 119.90,
    "IsActive": true
  }],
  "PaymentMethods": [{
    "OriginalId": "DINHEIRO",
    "Name": "Dinheiro",
    "PaidAmount": 119.90
  }],
  "Branch": { "OriginalId": "LOJA-002", "Name": "Loja Outlet" },
  "TradePolicy": { "OriginalId": "OUTLET", "Name": "Outlet" },
  "SalesPerson": { "OriginalId": "VENDEDOR-001", "Name": "João Silva" }
}
```

`OrderTotal` é o valor líquido e `Coupon` recebe o `ExternalCode` escalar do resgate. O `Customer` do pedido é um DTO de criação: campos retornados pela consulta, como `Id` e `CurrentTier`, não devem ser reenviados. Em `Products`, use somente os campos aceitos por `CreateProductRequest`; quantidade e preço promocional pertencem aos contratos de consulta/resgate, não ao pedido. Como esse contrato não possui `Quantity`, o exemplo usa `ProductPrice` como o total líquido da linha e distribui descontos em centavos para a soma dos produtos fechar exatamente com `OrderTotal`.

A resposta do pedido traz `EstimatedBonus`, que o PDV mostra na tela de venda concluída:

```json
"EstimatedBonus": {
  "GenerateBonus": true,
  "EstimatedPoints": 45,
  "EstimatedCashback": 4,
  "EstimatedCashbackFormatted": "R$ 4,00"
}
```

- É uma estimativa calculada quando o pedido é salvo; o bônus creditado de fato pode mudar (regras alteradas, cancelamento, liberação pendente). Por isso a tela diz "estimados".
- `GenerateBonus: false` significa que não há bônus previsto **ou** que a estimativa falhou; nos dois casos o pedido foi salvo (200). O PDV só exibe as linhas de bônus quando `GenerateBonus` é `true`.
- `EstimatedCashback` são os pontos convertidos pelo cashback ativo da loja e, por padrão, arredondados para baixo em reais inteiros, igual ao saldo (45 pts × R$ 0,10 = R$ 4,50 → R$ 4,00). A linha de cashback só aparece quando o valor é maior que zero.
- Use `EstimatedCashbackFormatted` apenas para exibir; para cálculos, use `EstimatedCashback`.

## Cancelamento parcial

```json
{
  "ValueToRefund": 25.90,
  "CancelKey": "PDV-PARTIAL-123",
  "Products": [{
    "OriginalId": "P002",
    "ValueToRefund": 25.90
  }]
}
```

A soma de `Products[].ValueToRefund` deve ser exatamente igual a `ValueToRefund` após o arredondamento monetário. `ShouldRefundRedeem` só deve ser enviado quando o PDV quiser sobrescrever explicitamente a configuração do tenant.
