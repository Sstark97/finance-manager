# /review

Reviews the current repository changes without going through the full pipeline.

## Steps

1. Run `git diff` (unstaged) and `git diff --staged` (staged) to see all changes
2. Launch the `code-reviewer` agent with the full diff as context
3. Show the review result to the user with PASS or FAIL verdict
4. If FAIL: list the blocking findings and ask the user if they want to fix them now

Does not move files to the workspace. Does not create WIP.md. It is a quick, targeted review.
