# Domain Docs

How the engineering skills should use this repo's domain documentation during exploration.

## Before exploring, read these

- **`CONTEXT.md`** at repo root, or
- **`CONTEXT-MAP.md`** at repo root if present (multi-context); read relevant linked `CONTEXT.md` files.
- **`.adr/`** for cross-cutting ADRs.
- In multi-context repos, check context-scoped ADR folders like `src/<context>/.adr/`.

If any docs are missing, continue and proceed silently. Do not block or ask to create them up front.

## File structure

Single-context repo (default):

```text
/
├── CONTEXT.md
├── .adr/
└── src/
```

Multi-context repo (with `CONTEXT-MAP.md`):

```text
/
├── CONTEXT-MAP.md
├── .adr/
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── .adr/
    └── billing/
        ├── CONTEXT.md
        └── .adr/
```

## Vocabulary

Use terms as defined in the active `CONTEXT.md`. Avoid drifting to synonyms for named domain concepts.

## ADR conflicts

If proposed output conflicts with an existing ADR, call it out explicitly before proceeding.
