---
name: web-realtime-event
description: Use when a change on the server must show up in other open tabs or for other users without a reload (live lists, notifications, status changes, "someone else edited this") in a project built from the web-foundation Nuxt template with its /_ws realtime hub.
---

# Add a realtime event

The hub (`server/utils/realtime.ts`, one in-memory instance) pushes JSON events over the
same-port WebSocket `/_ws`. The session cookie authenticates the socket; revoking the
session closes it. Events carry **ids only**: clients refetch through REST, so a socket
can never leak data the REST API would not return.

## Pick the topic

| Who should hear it | Topic | Authorised by |
|---|---|---|
| One user (their data changed, a personal notification) | `userTopic(userId)` | automatic: every socket follows its own |
| Everyone signed in (maintenance, global banner) | `SYSTEM_TOPIC` | automatic |
| Anyone who may read a resource | `resourceTopic("products")` | `can(roles, "products", "read")` |
| Viewers of one record | `resourceTopic("products", id)` | same `read` permission |

Resource names must match `[a-z_]+` and be in `RESOURCES`. For a rule the permission
matrix cannot express (e.g. "only members of this project"), extend `authorizeTopic` in
`shared/utils/realtimeProtocol.ts` and add a case to `test/unit/realtimeProtocol.test.ts`.

## Server

Publish in the service, **after** the write succeeded (and after the transaction, if
there is one), never in the handler:

```ts
await useDb().update(products).set(input).where(eq(products.id, id))
await audit(ctx.event, { action: "products.update", resource: "products", resourceId: id })
realtime.publish(resourceTopic("products"), "products.updated", { id })
realtime.publish(resourceTopic("products", id), "products.updated", { id })
// one user: realtime.publishToUser(userId, "orders.shipped", { id })
```

Event names are `<resource>.<past-tense verb>`. Payload: ids and, at most, non-sensitive
flags the client needs to decide whether to refetch.

## Client

- A list or detail view that should stay fresh:
  `useLiveResource("products", refresh)` or `useLiveResource("products", refresh, { id })`.
  It subscribes, debounces refreshes and refetches after a reconnect.
- Anything else (a toast, a badge counter):

  ```ts
  useRealtimeEvent("orders.shipped", (data) => { notify.info(t("orders.shipped")) })
  ```

  Only events on topics the socket follows arrive; to follow a resource topic without
  `useLiveResource`, call `useRealtime().subscribe(resourceTopic("orders"))` in the page
  and call the returned function on unmount.
- Both are no-ops during SSR and clean up with the component.

## Test

In the resource's API test (`test/api/<resource>.test.ts`), as `notes.test.ts` does:

```ts
const socket = await openSocket(reader)
await socket.next(message => message.type === "ready")
socket.send({ type: "subscribe", topic: "res:products" })
await socket.next(message => message.type === "subscribed")
await editor.patch(`/api/products/${id}`, { name: "x" })
expect((await socket.next(isEvent("products.updated"))).data).toEqual({ id })
```

Also assert that a user without `read` gets `{ type: "error", code: "auth.forbidden" }`
when subscribing, if the resource is restricted.

## Verify

`npm run check && npm run test:api`, then two browser tabs (two users if the topic is
per-user) and watch the second update without reloading.

## Limits

Single instance only: the hub lives in memory. Running several app instances needs a
shared pub/sub (Redis) behind `realtime.publish`; that is not part of the foundation.
Behind a proxy the WebSocket upgrade must be forwarded (see `web-deploy`).
