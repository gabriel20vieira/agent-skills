# Doc format

Every doc starts with the same four lines, so the index and the stale check can read it:

```
# <Title>

> <One line: what this doc covers. This is the line shown in the CLAUDE.md index.>

Updated: <yyyy-mm-dd>
Sources: <code paths this doc describes, comma separated: files, folders or globs>
```

- **Title:** the topic, short (`Theming`, `Sessions and permissions`).
- **Summary:** one line, right after the title, as a quote. It is what the next session reads
  to decide whether to open the file. Say what is inside, not that it is documentation.
- **Updated:** the date you last checked the doc against the code.
- **Sources:** the paths whose changes make this doc stale. Folders end with `/`. A doc
  about a concept with no code (a guide, a decision) may leave `Sources:` out.

Then the body, in whatever shape fits the topic. Useful sections:

- **What** it is and why it exists.
- **Where** it lives (paths).
- **How** it works (the flow, the rules).
- **How to change it** (steps, pitfalls, what to test).
- **To confirm:** anything you could not verify in the code.

Decision files (`docs/decisions/`) use: Context, Decision, Consequences, Alternatives.

Keep it plain: short sentences, real paths, no copied code beyond a few lines when the exact
shape matters.
