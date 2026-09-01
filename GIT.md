# Git cheat sheet — how to commit & push

## The mental model: 3 steps = packing a suitcase

```
1. git add FILE     ->  put the file in your suitcase
2. git commit       ->  zip the suitcase shut + write a label
3. git push         ->  ship the suitcase to GitHub
```

- **Your files on disk** — what you're editing
- **Staging area** (`git add`) — the suitcase; only what you put in here gets committed
- **Commit** — a permanent snapshot with a label. Stored locally until you push.
- **Push** — uploads your local commits to GitHub
- **Pull** — downloads commits from GitHub

## The routine (follow top to bottom)

```bash
# 1. What's changed?
git status

# 2. Look at the actual changes (make sure it's what you expect)
git diff

# 3. Put everything in the suitcase
git add -A

# 4. See what's staged + check nothing weird snuck in
git status

# 5. Snapshot it with a label
git commit -m "Short description of what I did"

# 6. Make sure it worked
git log --oneline -3

# 7. Ship to GitHub
git push origin main

# 8. Confirm it uploaded
git status
```

## How to know it worked

- **After step 5:** `git log --oneline -3` shows your new commit at the top.
- **After step 8:** `git status` says `nothing to commit, working tree clean` and shows **no** `[ahead 1]` message (that would mean it's not pushed yet).

## Two common "what now?" spots

- **`git status` shows red files but I already committed?** -> You edited more after committing, or forgot to `git add`. Just run steps 3-5 again.
- **"Your branch is ahead of 'origin/main' by 1 commit"** -> You committed but didn't push. Run step 7 (plus step 8 to confirm).

## Command quick reference

| Goal | Command |
|---|---|
| "Where am I?" | `git status` |
| "See what changed" | `git diff` |
| "Put everything in the suitcase" | `git add -A` |
| "Snapshot + label it" | `git commit -m "message"` |
| "Ship to GitHub" | `git push origin main` |
| "Grab latest from GitHub" | `git pull` |
| "Show recent history" | `git log --oneline` |

## Three rules that prevent most mistakes

1. **`git status` before any commit.** It always tells you the truth - changed files (red), staged (green), nothing to commit.
2. **`git commit` keeps a local copy.** Nothing is lost until you push.
3. **`add` selects, `commit` snapshots.** If a commit included a file you didn't want, it can be undone - not permanent damage.