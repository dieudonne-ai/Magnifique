# Weekly School Tasks

One folder per week for assignments, notes and submissions.

## Structure

```
weeks/
  2026-W41/
    README.md      # tasks, deadlines, status
    notes/         # class notes
    submissions/   # files you hand in
template/          # copied for every new week
scripts/new-week.sh
```

## Start a new week

```bash
./scripts/new-week.sh          # current ISO week, e.g. 2026-W41
./scripts/new-week.sh 2026-W42 # a specific week
```

## Workflow

1. Create the week folder and list your tasks in its `README.md`.
2. Tick tasks off (`- [x]`) as you finish them.
3. Commit with a message like `Week 41: finish maths exercises`.
