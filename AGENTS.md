# AGENTS.md

**Scope:** These rules apply only when the agent is in **Build mode** (actively implementing or editing code) — not to planning, chat, or read-only/ask modes.

## Before Making Changes
- Before writing any new component, function, hook, or utility, search the codebase first for an existing implementation — check `components/`, `utils/`, `lib/`, `hooks/`, and any other relevant folders.
- Reuse or extend what already exists instead of duplicating logic.
- Only write new code when nothing suitable already exists.

## Package Manager
- Use **bun** for everything Node/TypeScript/JavaScript-related. Never use npm, yarn, pnpm, or node directly.
  - Install deps: `bun install`
  - Add a package: `bun add <pkg>` (or `bun add -d <pkg>` for dev dependencies)
  - Run a script: `bun run <script>`
  - Execute a package binary: `bunx <pkg>`

## UI Components
- For basic UI primitives (Button, Card, Input, Dialog, Select, etc.), use shadcn components.
- Check first whether the component already exists in the project (commonly under `components/ui/`) and reuse it if so.
- If it doesn't exist yet, add it with `bunx shadcn@latest add <component>` — don't hand-roll something shadcn already provides.

## Testing / Build
- Typechecks are fine to run anytime without asking first — they're a correctness check, not a build.
  - TypeScript/JavaScript: `bunx tsc --noEmit` (or `bun run typecheck` if the project defines that script)
  - Go: `go vet ./...` and `go build ./...`
- Do not run full builds, dev servers, `go run`, or produce compiled binaries/artifacts unless explicitly asked to.
- Verification beyond typechecking (builds, running the app, tests) stays a separate step for when the user requests it.

## Version Control
- Do not run `git commit`, `git push`, or any other commit action unless explicitly asked to in the current request.
- Leave changes as-is in the working tree; committing is a separate step the user will request.
