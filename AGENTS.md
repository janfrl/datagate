# AGENTS.md

Read `README.md` before making changes.

## Repository Hygiene

Keep the repository tool-neutral and conventional.

Do not add AI-tool-specific files or folders unless explicitly requested. Avoid introducing files such as:

- `.claude`
- `.gemini`
- `.cursor/rules`
- `/ai`
- `/prompts`
- `/tasks`

Project context should live in normal project documentation such as `README.md`, `ARCHITECTURE.md`, or `CONTRIBUTING.md`.

Use the same documentation a human developer would use. Do not create extra files only to make the repository easier for AI agents to navigate.

## Scope Discipline

Implement one scoped change at a time.

Do not implement future roadmap items unless explicitly requested. Do not refactor unrelated code while implementing a feature.

If a requested change reveals a larger architectural issue, explain it briefly and keep the implementation narrow unless the user asks for a broader refactor.

Prefer small, reviewable changes over large rewrites.

## Implementation Standards

Follow the existing project structure and naming conventions.

Keep framework-specific code at the edges and business logic in dedicated services or domain modules.

Prefer explicit types over implicit or loosely typed code.

Avoid `any` unless there is a clear reason. If `any` is used, keep it local and explain why in code or in the response.

Validate external inputs at boundaries.

Do not silently swallow errors. Return or throw meaningful errors appropriate to the layer.

## Abstraction and Extensibility

Favor readable, intentional abstractions over clever or accidental complexity.

Avoid speculative generalization, but introduce clear contracts at boundaries where variation is expected.

Good candidates for explicit boundaries include:

- infrastructure access
- external providers
- storage mechanisms
- parsing/serialization
- domain workflows
- task execution
- rendering/exporting
- integrations with other systems

Choose the simplest pattern that fits the problem. A function, interface, adapter, driver, strategy, registry, factory, or plugin can all be valid depending on the situation.

Use an abstraction when at least one of these is true:

- multiple implementations already exist
- a second implementation is planned soon
- the boundary protects an important architectural decision
- the abstraction improves testability
- the abstraction isolates volatile infrastructure or third-party APIs
- the abstraction removes repeated conditional logic from the domain layer

Do not add abstractions only because they might become useful someday.

Keep abstractions small, explicit, and well-named. Prefer shallow composition over deep inheritance or excessive indirection.

## Code Quality

Favor clear, maintainable code.

Preserve existing behavior unless the task explicitly asks to change it.

Keep functions focused and reasonably small.

Do not introduce global state unless necessary.

Avoid hiding simple logic behind unnecessary framework, factory, or configuration layers.

## Testing

Add or update tests when changing logic.

Prioritize tests for:

- parsing
- validation
- scoring
- privacy/security-sensitive behavior
- bug fixes
- reusable services

Do not add brittle tests that only verify implementation details.

If tests cannot be added in the current task, mention why.

## Checks

Use judgment when deciding which checks to run.

It is not necessary to run the full test, lint, typecheck, or build suite after every small change. For small documentation changes, isolated refactors, or clearly local edits, a lighter review may be enough.

Run relevant checks when:

- the change is complex or touches multiple areas
- public contracts, types, schemas, or APIs change
- parsing, validation, scoring, privacy, or security-sensitive logic changes
- dependencies or build configuration change
- a bug fix needs verification
- behavior is difficult to verify by inspection

Before committing or presenting a final implementation as complete, run the most relevant available checks, such as:

- tests for changed logic
- typecheck for TypeScript changes
- lint if formatting or code quality may be affected
- build when configuration, routing, or framework integration changed

If checks are skipped, mention why.

## Documentation

Update documentation when behavior, setup, architecture, or public APIs change.

Do not create documentation files solely for agent consumption.

Keep documentation concise, accurate, and close to the actual implementation.

## Security and Privacy

Never hardcode secrets, tokens, credentials, or environment-specific endpoints.

Do not commit generated local data, uploaded files, logs, or secrets.

Use environment variables or runtime configuration for deployment-specific values.

Handle user-provided input defensively.

Do not send private or sensitive user data to external services unless the project explicitly allows it.

## Dependencies

Do not add new dependencies unless they are necessary for the current task.

Prefer well-maintained, widely used packages.

Before adding a dependency, consider whether the existing stack already solves the problem.

Avoid adding overlapping libraries that solve the same problem.

## Commits

Use Conventional Commits.

Examples:

- `feat: add upload endpoint`
- `fix: handle empty input`
- `test: add validation tests`
- `docs: update setup instructions`
- `refactor: extract storage service`
- `chore: configure workspace scripts`

Do not use vague commit messages such as:

- `update`
- `fix stuff`
- `changes`
- `wip`

Keep commits reasonably sized and logically grouped.

Do not force unrelated changes into a single commit. Split work into multiple commits when it makes the commit type and message clearer.

Each commit should represent one coherent change, so the Conventional Commit type accurately describes the content.

## Review Behavior

Before finishing, check that the change:

- matches the requested scope
- does not introduce unrelated changes
- follows repository conventions
- does not add unnecessary files or dependencies
- preserves existing behavior unless intentionally changed

When reporting back, summarize:

- what changed
- what was not changed
- which checks were run, if any
- why checks were skipped, if applicable
- any known follow-up work

## Data Gate Rules

- Uploaded datasets must stay local to the server.
- Raw datasets must not be sent to external APIs.
- LLMs may receive only structured summaries, profiles, findings, and redacted examples.
- LLM provider settings must come from runtime configuration.
- Do not hardcode external LLM endpoints.
- Keep route handlers thin.
- Put business logic in `server/services`.
- Use Nitro Tasks for deterministic data-quality checks.
- Use AI SDK tools only for high-level agent actions.
- Do not expose arbitrary Nitro Tasks directly to the model.
