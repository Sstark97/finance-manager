# /plan

Generates an implementation plan without writing code.

## Steps

1. Launch the `planner` agent with the task description: `$ARGUMENTS`
2. Wait for it to create `PLAN-{slug}.md` in `.claude/workspace/planning/`
3. Show the full plan to the user
4. Ask: **"Do you want me to proceed with the implementation using `/do-task`?"**

Do not implement anything. The plan stays in `planning/` until the user decides to continue.
