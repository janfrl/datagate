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

## Local Data Flow

- Upload CSV datasets from the Datasets page.
- Uploaded CSV files are written under the local app data directory, not external object storage.
- Deterministic profiling and quality checks run on the server through the Default Quality Gate workflow.
- Chat can call high-level Data Gate tools to list dataset metadata, run the Default Quality Gate, and read generated report artifacts.
- Chat tools return compact summaries and report Markdown, not raw dataset rows or local file paths.

## Privacy Rules

- Uploaded datasets stay on the server.
- Raw datasets must not be sent to external APIs.
- LLMs may receive only structured summaries, profiles, findings, and redacted examples.
- LLM provider settings must come from runtime config.
- Do not hardcode external LLM endpoints.

## Setup

Prerequisites:

- Node.js 24 or newer
- pnpm 10

Install dependencies:

```bash
pnpm install
```

Create local environment configuration:

```bash
cp apps/web/.env.example apps/web/.env
```

Set `NUXT_SESSION_PASSWORD` to a random value of at least 32 characters. Configure the AI provider key used by your selected model. GitHub OAuth values are only required when using GitHub login locally.

Start the app:

```bash
pnpm dev
```

Open the local Nuxt URL, upload a CSV from the Datasets page, run the Default Quality Gate, then ask chat to summarize the latest dataset or report.

## Demo Data

A small synthetic CSV is available at `samples/customers.csv`. It intentionally includes missing values and synthetic contact fields so the Default Quality Gate has useful findings to report.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```
