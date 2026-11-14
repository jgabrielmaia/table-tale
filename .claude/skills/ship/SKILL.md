---
name: ship
description: Ship workflow for Table Tale, from idea or GitHub issue to merged PR and release. Use when the user asks to work on, pick up, implement or fix an issue (#81) or a new feature or bug, or says "ship".
argument-hint: "<#issue | issue URL | one sentence describing the change>"
---

# Ship

Carry one change end to end. Every step ends on a **Done when** line. Start the next step only once it holds.

## 1. Understand

Input is `$ARGUMENTS`: an issue number (`#81`), an issue URL, or a sentence.

- Issue given: `gh issue view <n> --comments`.
- Read the code the change touches before asking anything the code can answer.
- Bug: run `/diagnosing-bugs` until the loop goes **red** on the bug (a failing reproduction).
- Any of these still unknown → run `/grilling` until it is:
  - the outcome the user sees,
  - what is out of scope,
  - the acceptance checks (how we'll both know it works),
  - edge cases on desktop (pointer, keyboard) and mobile (touch, narrow screen),
  - data changes (new column, migration, RLS).

Good grilling questions are concrete and offer a default:

> "Recent games on the shelf: last 5 played by *you*, or by anyone in your communities? I'd go with *you*, since the shelf is personal."
>
> "If someone has played nothing yet, show an empty state or fall straight back to community favourites? I'd fall back."

Then post the **plan**, 3 to 8 bullets:

```
Outcome:   Home shelf shows your last 5 played games, then community favourites.
Approach:  New `useRecentPlays` hook over `plays`; merge in ShelfHighlights.
Touches:   src/features/home/*, src/features/plays/api.ts
Tests:     unit for the merge/dedupe; e2e for logged-in shelf (desktop + mobile).
Migration: none.
Release:   feat → 0.9.0-alpha (or "none" for internal-only changes).
```

**Done when:** the user approves the plan. This is the one alignment point. Everything after it runs on its own.

## 2. Issue

- Look for a match first: `gh issue list --state all --search "<keywords>"`.
- Match found: use it. If the plan changed its scope, update the body.
- No match: `gh issue create` with a plain-language title and this body:

```markdown
## Problem
<what's wrong or missing, from the player's side>

## Outcome
<what's true once this ships>

## Acceptance criteria
- [ ] <one checkable line per acceptance check from the plan>

## Out of scope
- <what we agreed not to do>
```

**Done when:** you have the issue number.

## 3. Worktree

Branch from fresh `origin/main` (never from another feature branch) into a sibling folder:

```bash
git fetch origin
git worktree add ../table-tale-<slug> -b <type>/<slug> origin/main
cp .env ../table-tale-<slug>/.env      # .env is untracked, worktrees don't get it
cd ../table-tale-<slug> && npm ci
```

`<type>` is the conventional-commit type of the main change. `<slug>` is 2 to 4 kebab-case words naming the outcome: `feat/shelf-highlights-recent`, `fix/localhost-google-login`, `refactor/community-api`.

**Done when:** `npm run typecheck` passes inside the new worktree.

## 4. Build (YOLO)

Inside the approved plan, work autonomously. Decide naming, structure, test design and fixes yourself, run whatever commands you need, and keep going through failures. Use `/tdd` red-green-refactor for logic. Commit as you go with conventional commits (`feat(home): …`, `fix(auth): …`, `test(e2e): …`).

Stop and ask only when:

- the plan turns out wrong and the outcome or scope must change, or
- an action reaches outside the repo: applying a migration in production, Supabase or Vercel dashboard changes, deleting real data, a new paid service.

Every UI change works on desktop and mobile.

**Done when:** every acceptance criterion in the issue is met in code.

## 5. Verify

- **Unit** (Vitest): every new or changed piece of logic (hooks, helpers, mappers, validation).
- **E2E** (Playwright, `tests/e2e`): every user-visible flow the change adds or alters. UI changes also pass the `mobile-chrome` project.
- Migrations: rollback file plus a `supabase/ci/assert-*.sql` assertion, as in earlier migrations.
- Run, all green: `npm run typecheck`, `npm run typecheck:e2e`, `npm test`, `npm run test:e2e`, `npm run build`.
- Self-review: `/code-review` against `origin/main`, then fix what it finds and re-run the suite.

**Done when:** every acceptance criterion maps to at least one test you can name, and all five commands pass.

## 6. Release prep

Decide with [RELEASE.md](RELEASE.md) whether the branch **releases**. Internal-only changes (`refactor`, `test`, `docs`, `chore`, `ci`, `build`) don't release, so skip to step 7. Otherwise follow it: version bump, release notes, release commit.

**Done when:** either the branch doesn't release, or `package.json`, `package-lock.json` and `docs/release-notes/v<version>.md` all carry the new version, committed as `chore(release): v<version>`.

## 7. PR

```bash
git push -u origin <type>/<slug>
gh pr create --base main --title "<type>(<scope>): <summary> — v<version>" --body-file <file>
```

Drop ` — v<version>` from the title when the branch doesn't release. Write the body with `/pr`. It includes `Closes #<n>`, what changed, how it was tested (unit + e2e, desktop + mobile), any migration and whether production needs it, and the release line (or "No release: internal only"). Check CI with `gh pr checks <n>` and fix anything red.

**Done when:** the PR is open, CI is green, and the user has the PR link. Then end your turn and wait.

## 8. Review loop and merge

Classify each reply:

- **Approval**: the reply approves and asks for nothing else. "go ahead", "merge", "ok", "approved", "lgtm", "ship it". Merge (publish steps in [RELEASE.md](RELEASE.md)).
- **Feedback**: anything else, including "ok, but rename X" or a question. Address it, plus any PR review comments (`gh pr view <n> --comments`), re-run step 5, update the release notes if what players see changed, push, and wait again.

**Done when:** the PR is merged, the worktree is removed, and, if the branch releases, the GitHub release is published and you've given the user its link.
