# Agent instructions

## Git workflow

After completing requested changes, **commit and push** unless the change or intent is slightly ambiguous — in that case, ask for clarification before committing.

When committing:

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, etc.).
- Describe intent, not diffs: say what you did and why (`fix mobile TOC overlap because sticky top leaked to small screens`), not what changed (`update 3 lines in PostToc.astro`).
- Keep the subject line concise; add a body only when extra context helps.
- Do not commit secrets (`.env`, credentials, etc.).
- Do not force-push to `master`/`main`.

When pushing:

- Push to the current branch after a successful commit.
- Do not push if the user explicitly asked to hold off on pushing.
