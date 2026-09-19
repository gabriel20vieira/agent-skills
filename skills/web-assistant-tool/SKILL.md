---
name: web-assistant-tool
description: Use when the assistant module of a web-foundation Nuxt project needs a new capability - a read tool that looks up data or a propose_* tool that suggests a create/update/delete for the user to accept.
---

# Add an assistant tool

Tools live in `server/assistant/tools/<resource>.ts` and are listed in
`server/assistant/registry.ts`. `server/assistant/tools/notes.ts` is the model for both
kinds. The resource's REST API must exist first (`web-crud-resource`): tools never touch
the database.

## Read tool

```ts
export const listProducts = defineAssistantTool({
    kind: "read",
    name: "list_products",
    description: "List products (id, name, price). Use it for questions about products or prices.",
    parameters: z.object({ search: z.string().max(100).optional().describe("Name contains") }),
    permission: ["products", "read"],
    async run(ctx, args) {
        const rows = await ctx.api<Product[]>("/api/products", { query: { search: args.search } })
        return pickFields(rows.slice(0, 50), ["id", "name", "price"] as const)
    },
})
```

- `ctx.api` calls the app's REST API as the signed-in user; permission and org scoping
  (tenancy) apply automatically.
- Return only the fields the answer needs (`pickFields`), and cap list sizes: every
  token goes to the model.
- `description` says *when* to use it. `.describe()` each parameter.

## Propose tool (writes)

```ts
export const proposeProductPrice = defineAssistantTool({
    kind: "propose",
    name: "propose_product_price",
    description: "Propose changing a product's price. The user sees a card and decides.",
    parameters: z.object({ id: z.number().int().positive(), price: z.number().positive() }),
    permission: ["products", "update"],
    async propose(ctx, args) {
        const product = await ctx.api<Product>(`/api/products/${args.id}`)
        return {
            summary: `Change the price of "${product.name}" from ${product.price} to ${args.price}`,
            request: { method: "PATCH", url: `/api/products/${args.id}`, body: { price: args.price } },
        }
    },
    async verify(ctx, args) {
        const product = await ctx.api<Product>(`/api/products/${args.id}`).catch(() => null)
        return product?.price === args.price
    },
})
```

- Name starts with `propose_` (enforced).
- `propose` reads what it needs to write a clear, specific `summary` (the user decides on
  it) and returns the exact REST call the browser will make.
- `request.url` is one of the app's own `/api/...` routes, never an external URL.
- `verify` re-reads the database through the API and returns `true` only if the change
  is really there. For creates, use the `resultId` argument (the id the REST call
  returned); for deletes, check the record is gone (404).
- `permission` is the permission the REST call itself needs.

## Register and test

1. Add the tool to `ASSISTANT_TOOLS` in `server/assistant/registry.ts`.
2. In `test/api/assistant.test.ts`, extend the fake provider trigger (in
   `server/assistant/providers/fake.ts`, e.g. `"propose price: <id> <price>"`) and assert:
   the tool is offered only to roles with the permission, a propose creates a pending card
   and writes nothing, claim + REST + settle ends in `done`, and a settle the database
   does not confirm ends in `failed`.
3. `npm run check && npm run test:api`.
