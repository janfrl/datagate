# Data Gate

Data Gate is a local-first AI-powered data quality checker.

It helps users upload datasets, run deterministic quality checks, and generate actionable reports before using the data in AI projects.

## MVP Scope

The first version implements:

- CSV upload
- local dataset storage
- dataset profiling
- Default Quality Gate workflow
- Nitro Tasks for deterministic checks
- report artifact
- chat-based summary

Out of scope for the MVP:

- MCP integration
- Python adapters
- projects
- workflow editor
- team permissions
- Excel/JSON support
- external chat integrations

## Architecture

Data Gate is built as a pnpm monorepo.

```txt
apps/web          Nuxt app, Nitro backend, chat UI, local server logic
packages/shared  shared TypeScript contracts and schemas
packages/tools   framework-independent deterministic analysis tools
```

The Nuxt app owns UI, chat rendering, artifact previews, API routes, Nitro Tasks, and local storage for the MVP.

## Template Review Notes

The Nuxt UI Chat template foundation keeps its existing auth, chat persistence, LLM provider config, database assumptions, and deployment assumptions for now. Review these areas before implementing Data Gate dataset workflows.

## Privacy Rules

- Uploaded datasets stay on the server.
- Raw datasets must not be sent to external APIs.
- LLMs may receive only structured summaries, profiles, findings, and redacted examples.
- LLM provider settings must come from runtime config.
- Do not hardcode external LLM endpoints.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```
