# /do-task

Executes a complete development task from planning to reviewed implementation.

## Pipeline

### 1. PLANNING

Launch the `planner` agent with the task description.

Wait for it to create `PLAN-{slug}.md` in `.claude/workspace/planning/`. Create `.claude/workspace/WIP.md`:

```markdown
# WIP: $ARGUMENTS
## Task
$ARGUMENTS
## Phase
Planning
## Log
- [date time] Phase started: Planning
- [date time] Agent: planner — Plan created in planning/PLAN-{slug}.md
```

### 2. CHECKPOINT

Show the plan to the user. Ask: **"Shall I proceed with the implementation? (yes/no)"**

- If `no`: stop and delete WIP.md
- If `yes`: move `planning/PLAN-{slug}.md` → `progress/PLAN-{slug}.md`. Update WIP.md with `Phase: Implementation`

### 3. IMPLEMENTATION

`finance-manager` is a single full-stack app — launch the `fullstack-developer` agent regardless of
which layers (`domain`/`application`/`infrastructure`/`UI`) the plan touches. There is no
backend/frontend split to route between.

Update WIP.md with the agent change.

### 4. REVIEW

Launch the `code-reviewer` agent with the diff of the implemented changes.

Move the plan to `.claude/workspace/review/PLAN-{slug}.md`.

Wait for it to generate `REVIEW-{slug}.md` in `.claude/workspace/review/`.

### 5. RESULT

**If verdict = PASS**:
- Move plan and review to `.claude/workspace/completed/`
- Delete WIP.md
- Inform the user: "✓ Task completed. Plan and review saved in completed/"

**If verdict = FAIL**:
- Show the blocking findings to the user
- Ask: "Shall I fix the review issues? (yes/no)"
- If `yes`: return to step 3 with the findings as additional context
- If `no`: keep WIP.md active with the findings documented
