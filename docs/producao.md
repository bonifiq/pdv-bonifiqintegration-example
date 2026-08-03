# Produção e operações

## Segurança

Esta demo oferece acesso HTTP direto no navegador porque foi escolhida como ferramenta local de aprendizado. Isso **não protege Basic Auth**: qualquer credencial enviada pelo frontend pode ser inspecionada.

Em produção:

- mantenha credenciais em backend, serviço local do PDV ou cofre seguro;
- não registre o header `Authorization`;
- defina uma política de mascaramento para logs de produção; o inspetor desta demo mantém os dados de teste visíveis;
- aplique timeout, correlação e política de retry no cliente HTTP;
- rotacione imediatamente qualquer credencial já versionada ou compartilhada.

O inspetor desta demo remove somente autenticação e gera cURL com placeholder de credencial. Os demais dados ficam visíveis porque o projeto usa dados de teste.

## Idempotência

- Gere `OriginalKey` ao confirmar a recompensa, antes da primeira chamada de redeem.
- Persista a chave junto à venda pendente.
- Em timeout ou erro retryable, repita o redeem com a mesma chave.
- Não gere uma chave nova até o operador abandonar o benefício.
- Para cancelamento parcial, aplique a mesma regra ao `CancelKey`.

O cenário “Falha e retry” falha uma vez e confirma no inspetor que a segunda tentativa mantém a mesma `OriginalKey`.

## Política de erro

| Falha | Comportamento do PDV |
|---|---|
| Consulta de benefícios | Permitir retry; não usar uma resposta antiga como se fosse atual |
| Challenge com `Code` | Mostrar o código da demo, mesmo se o canal externo falhou |
| Challenge sem `Code` e sem sucesso | Bloquear resgate e oferecer retry/cancelamento |
| Código inválido | Manter popup e permitir nova digitação |
| Redeem incerto/timeout | Repetir com a mesma `OriginalKey` |
| Produto inelegível em `/available` | Respeitar `CanUse=false` e exibir `CannotUseReason` |
| SKU offline inexistente no catálogo do PDV | Não resgatar; mostrar motivo local explícito |
| SKU retornado mudou depois do `/available` | Estornar imediatamente; bloquear pedido até confirmar a compensação |
| Estorno falhou | Não liberar edição e não remover produto resgatado |
| Pedido falhou | Manter venda e resgate para retry; não duplicar pagamento |

## Pedido e compensação

O fluxo possui duas operações independentes:

1. resgatar o benefício;
2. registrar o pedido pago.

Persistir `RewardId`, `ExternalCode`, `OriginalKey`, `ExternalProductId` quando houver e ID do pedido permite recuperar a operação depois de reinício ou falha de rede. Nesta demo, pedidos são mantidos apenas em memória; um PDV real deve persistir esses dados transacionalmente.

Ao editar a compra depois do resgate:

1. bloquear a edição;
2. chamar `DELETE /POS/rewards/{RewardId}`;
3. confirmar o estorno;
4. remover a linha de brinde/desconto;
5. liberar cliente e carrinho.

## Cancelamentos

Cancelamento total:

```text
POST /POS/orders/{orderId}/cancel
```

Cancelamento parcial:

```text
POST /POS/{orderId}/partialcancel
Body: ValueToRefund + CancelKey + Products
```

`ValueToRefund` representa o valor líquido devolvido, considerando a distribuição dos descontos da venda. A soma de `Products[].ValueToRefund` precisa ser idêntica a esse total depois do arredondamento em centavos. Se `RefundErrorDetails` vier preenchido, o PDV não deve atualizar o pedido local.

## Checklist antes de publicar

- [ ] Nenhuma credencial ou `.env.local` está no Git.
- [ ] Credenciais anteriormente expostas foram rotacionadas.
- [ ] O modo padrão continua `mock`.
- [ ] Fluxo com e sem OTP foi testado.
- [ ] Retry preserva chaves idempotentes.
- [ ] Produto resgatado aparece no carrinho e no pedido.
- [ ] Voltar para editar exige estorno confirmado.
- [ ] Pedido sem recompensa também é enviado.
- [ ] `typecheck`, testes, E2E e build estão verdes.
