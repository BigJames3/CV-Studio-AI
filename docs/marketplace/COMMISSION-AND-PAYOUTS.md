# Commission & payouts — 30% take rate

## Split formula

```
G  = gross charge to buyer (minor units)
F  = Stripe processing fee allocated to this charge
N  = G - F
P  = round(N * 0.30)   // platform
S  = N - P              // seller (ensures P+S=N)
```

Communicate: **sellers keep 70% of net after payment fees**.

## Ledger entry types

| type                  | sign | party                  |
| --------------------- | ---- | ---------------------- |
| `charge_gross`        | +    | platform clearing      |
| `stripe_fee`          | −    | stripe                 |
| `platform_commission` | +    | platform revenue       |
| `seller_earning`      | +    | seller balance pending |
| `reserve_hold`        | −    | seller available       |
| `reserve_release`     | +    | seller available       |
| `payout`              | −    | seller available       |
| `refund_clawback`     | −    | seller                 |

## Payout job (weekly)

1. Select sellers with `available >= 2500` cents
2. Create Stripe Transfer / payout
3. Write `SellerPayout` + ledger `payout`
4. Email receipt

## Refund

Reverse `seller_earning` + `platform_commission` proportionally; if paid out, negative balance recovered on next cycle.
