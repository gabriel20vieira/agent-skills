# The status report (step 2)

One line per request, numbered, in the user's language, before anything is merged. Example
(pt-PT):

```
1. ✔ Filtro por data na lista de reservas — fork «filtros», 3 commits, testes escritos.
2. ◐ Exportar CSV — fork «export»: falta o botão no telemóvel (não verificado no browser).
3. ✘ Corrigir o email de confirmação — ainda não foi pedido a ninguém.
4. ? Ordem das colunas — o fork deixou duas opções; qual preferes?
5. ✔ Ajuste do cabeçalho — feito nesta conversa, por commitar.

Por commitar e não é desta sessão: app/Http/Foo.php (outra sessão?). Entra ou fica de fora?
```

Then the questions only the user can answer:

- decisions the forks left open;
- what to do with a partial delivery (merge as is, send back to the fork, or leave out);
- whether uncommitted changes that are not this session's go in;
- whether to go on while a fork is still working.

Wait for the answer before merging, unless every line is ✔ and nothing is undecided.
