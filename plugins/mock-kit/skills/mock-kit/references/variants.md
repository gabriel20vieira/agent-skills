# Variants

Use variants when there is a real choice for the user to make: two layouts, two flows, two
ways to group data. Not for small details: those are decisions in the summary.

- **At most three** (A, B, C). More than that means the question is not clear yet.
- **One difference per variant set.** A and B differ in the thing being decided; everything
  else is the same, so the user compares one thing.
- **Same data and state** across variants, so switching shows the difference, not new data.
- **Name what each one is** in the summary:

```
Variante A: lista simples com filtro por estado.
  + mais rápida de ler; - perde a noção de dia.
Variante B: agrupada por dia (Hoje, Ontem).
  + mostra o volume diário; - mais scroll no telemóvel.
Recomendo A, porque ...
```

- **Recommend one**, and say why in one line.
- Create them with `--variants A,B` and put each in its `<mock-variant name="...">`. The bar
  switches between them; `?variant=B` opens one directly, and `shots` captures each.
- After the choice, keep only the chosen variant in the mock (or note the choice in
  `mocks.json` decisions) before marking it `aprovada`.
