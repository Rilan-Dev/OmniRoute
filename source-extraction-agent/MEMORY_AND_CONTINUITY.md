# Memory and continuity protocol

Authority: actual Git objects/raw evidence > existing project-control, plans, sessions, manifests and worklogs > this folder's state docs > chat/model memory.

At session start inspect branch, HEAD, working tree, upstream pin, latest worklog, next action, previous handoff and raw verifier output. Separate completed/pending/blocked/awaiting-evidence; do not redo completed work because a chat changed.

At session end append a dated worklog entry; update next action and verification to actual state; preserve historical plans and mark them completed/superseded instead of deleting; record exact commands, exit codes, artifact paths, commit SHAs, limitations and assumptions; write a concise resume note. Never store credentials.

If a narrative says PASS but evidence is absent, stale or for another source pin, mark current status unverified and explain the discrepancy. Correct current summaries only; preserve history.
