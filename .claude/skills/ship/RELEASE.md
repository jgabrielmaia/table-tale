# Release

Reference for steps 6 and 8 of [SKILL.md](SKILL.md).

## Version bump

Versions look like `MAJOR.MINOR.PATCH-<stage>`. The stage today is `alpha` (`0.8.1-alpha`).

**The stage belongs to the user.** Every bump keeps the current suffix exactly. Move `alpha` → `beta` → stable (no suffix) only when the user says so explicitly in this conversation, for example "this one goes out as beta". A dropped suffix already needed its own fix PR once (#72).

Pick the bump from the highest-impact commit on the branch (`git log origin/main..HEAD`):

| Branch contains | Before 1.0 (now) | 1.0 and after |
| --- | --- | --- |
| `!` or `BREAKING CHANGE:` | minor | major |
| `feat` | minor | minor |
| `fix`, `perf` | patch | patch |
| only `refactor`, `test`, `docs`, `chore`, `ci`, `build` | no release | no release |

**No release** means no bump, no notes file, no release commit, no GitHub release. The change ships with the next release, and its notes can mention it under **For developers** if it matters there. Judge by what players get, not the commit label alone: a `chore` that upgrades a dependency and changes behaviour players can see is a `fix` and releases.

Examples:

- `0.8.1-alpha` + feat → `0.9.0-alpha`
- `0.8.1-alpha` + fix → `0.8.2-alpha`
- `0.9.3-alpha` + breaking → `0.10.0-alpha`
- `0.9.3-alpha`, user says "release it as beta" + fix → `0.9.4-beta`

Bump from main's version, not the branch's: `git fetch origin && git show origin/main:package.json | grep '"version"'`. If another PR merges first, rebase and re-bump before merging.

Apply it: `npm version <new-version> --no-git-tag-version` (updates `package.json` and `package-lock.json`, no tag yet).

## Release notes

Every release (every bump) gets `docs/release-notes/v<version>.md`. Open the newest file in that folder and match its shape:

```markdown
# Table Tale v0.9.0-alpha

> **Alpha.** Table Tale is still in alpha: features, data and URLs may change between versions.

Your shelf now opens with the games you played last.

## What's new

- **Recently played first.** The home shelf shows the last five games you played, then fills up with your communities' favourites.

## Fixes

- <only if there are any>

## For developers

- New hook `useRecentPlays` (`src/features/plays/`), deduped against community favourites.
- No database changes.
- Issue: #81.

**Full changelog:** `v0.8.1-alpha...v0.9.0-alpha`
```

- The banner matches the stage: keep the alpha banner while in alpha, adapt it for beta, drop it for stable.
- **What's new** and **Fixes** speak to players: what they see and can do now, a bold lead-in per bullet. "Signing in on localhost brings you back to localhost", not "fix callback URL". Omit empty sections.
- **For developers** carries the rest: root cause, migrations and whether they're applied in production, new config, known issues, the issue number.

## Release commit

One commit, `chore(release): v<version>`, containing only `package.json`, `package-lock.json` and the notes file.

## Publish (after approval only)

Run from the main checkout (`C:/repos/table-tale`). It may sit on another branch with the user's work, so stay off `checkout` and `pull` there.

```bash
gh pr checks <n>                                   # must be green
git worktree remove ../table-tale-<slug>           # refuses if anything is uncommitted: stop and look
gh pr merge <n> --merge --delete-branch            # merge commit, matching history
git fetch origin --prune
# no release on this branch? stop here
gh release create v<version> --target main \
  --title "Table Tale v<version>" \
  --notes-file <(git show origin/main:docs/release-notes/v<version>.md) \
  --prerelease                                     # only stable releases drop --prerelease
```

**Done when:** `gh release view v<version>` shows the release, marked pre-release unless stable.
