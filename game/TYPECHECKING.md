# How to check this project for errors

Short version: **`npm run typecheck`**. Never `npx tsc --noEmit`.

## Why there is a wrong answer at all

`tsconfig.json` in this folder looks like this, and it is correct:

```json
{ "files": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.node.json" }] }
```

`"files": []` means *this file lists no code of its own*. The actual code
lists live in the two referenced configs — `tsconfig.app.json` (the game and
site, ~108 files) and `tsconfig.node.json` (the build config). This is the
standard Vite layout, not a mistake.

The consequence is a command that lies:

| Command | What it does | Result |
|---|---|---|
| `npx tsc --noEmit` | reads only the top file, finds an empty list | **exit 0, 0 files checked — always passes** |
| `npx tsc -b` | follows `references` into both projects | exit 0/1, 108 files checked |

`--noEmit` is not broken. It is doing exactly what it was told: check the
files listed here, of which there are none. It will report success on a
project that does not compile, forever.

## What to run

```bash
npm run typecheck    # tsc -b — the real check
npm run build        # tsc -b && vite build — real check, then bundles
```

Both are safe. `npm run build` was already safe before this file existed,
because it has always run `tsc -b`.

## If you are an AI agent working in this repo

Do not run `tsc --noEmit` and report the project as clean. You will be
reading a green light wired to an empty room, and you will pass that false
confidence on to the user. Run `npm run typecheck`.

## How to prove a check is real

Break something on purpose once and confirm the check goes red:

```bash
echo 'export const x: number = "not a number"' >> src/config/constants.ts
npm run typecheck    # must FAIL. If it passes, the check is not connected.
git checkout src/config/constants.ts
```

This applies to any check, not just this one. A check you have never seen
fail is not a check.
