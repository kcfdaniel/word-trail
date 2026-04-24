# Codex Notes

- Read this file before making changes.
- Keep refining this file as you learn project preferences and working patterns.
- Capture general patterns, not just one-off cases.
- Examples are welcome when they clarify the pattern.
- Ask clarifying questions until you are at least 95% confident about the intended change.
- Challenge the user respectfully when a proposed change would break the desired behavior or add avoidable complexity.

## Defaults First

- Do not pass options that are already the library default.
- If unsure, check the docs before adding config.

## VueUse `useStorage`

- Treat `useStorage(...)` as the reactive source of truth.
- Prefer a single storage-backed ref/computed over mirroring it into another `ref`.
- Example: `listenToStorageChanges` does not need to be passed when using the default behavior.
- Reference: [VueUse `useStorage` docs](https://vueuse.org/core/useStorage/)

## State Shape

- Prefer one obvious source of truth for shared state.
- Avoid parallel state that can drift unless there is a clear payoff.
- Keep side effects close to the state transitions that require them.
- In framework code, prefer the framework's native shared-state pattern over a generic abstraction when it gives a better fit for lifecycle and SSR.
- Example: in Nuxt, prefer `useState` for serializable shared state instead of reaching for a generic shared-state helper by default.
- For non-serializable shared client state, prefer a per-app runtime store over module-level refs in composables.
- Example: DOM nodes, `Text` nodes, and browser instances should not be pushed through SSR state just to make them shared.
- Use `useCookie` for small SSR-friendly preferences that should round-trip through server and client.
- Do not force large client-side document data into cookies; cookie size and request overhead make that a poor fit.

## Composition Boundaries

- Do not leak setup-scoped dependencies into module globals just to make the code work.
- If module-level state needs setup-scoped services, prefer a cleaner ownership model.
- Example: shared composables can often be expressed more cleanly with a global/shared state helper than with captured callbacks stored in module scope.
- When a user points out a better architectural fit, verify it and adopt it if it improves correctness and clarity.
- When splitting a composable and a store, extract shared pure/runtime helpers into a third module instead of creating circular imports.
- Do not wrap a store in a thin composable unless the wrapper adds real value; otherwise use the store directly.
