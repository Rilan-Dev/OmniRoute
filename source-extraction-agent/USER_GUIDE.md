# User Guide — prompts, agents, memory and handoffs

Start each session with: “Read this folder's README, AGENTS, rules, spec, USER_GUIDE, TARGET_PROJECT_STATE, NEXT_ACTION, VERIFICATION_STATE and WORKLOG. Inspect existing project-control, plans, sessions, manifests, source pins and raw evidence. Recover the latest real checkpoint; do not repeat completed work or delete history.”

## Required inputs
Record upstream URL, requested ref/commit, capabilities, target package root, intended host use, license constraints, source checkout/tool access, existing branch and previous evidence paths. Never guess a source pin.

## Stage prompts
1. Recover current branch/HEAD and classify completed, pending, blocked, awaiting-evidence.
2. Pin upstream commit/tree and inspect license/repository guidance.
3. Map architecture and inventory all capabilities including business logic, UI, data, tests, scripts and runtime.
4. Run dependency closure and an independent second pass; reconcile every candidate.
5. Present evidence for discovery/closure gate; do not copy yet.
6. Only after explicit controller authorization and PASS, copy complete first-party trees byte-for-byte.
7. Run the real verifier and save exact command, exit code, raw output and evidence paths.
8. Append worklog, update next action/verification/continuity, then hand off.

## Roles
Investigator discovers and documents. Exact-copy implementer copies only after authorization. Independent verifier checks source identity, closure and missing/extra files. Controller alone declares PASS. If one agent must perform all roles, separate them into explicit passes and never self-certify from the same pass.

## Memory
Git objects and raw evidence outrank chat memory. Keep repository facts in TARGET_PROJECT_STATE, chronological progress in append-only WORKLOG, immediate task in NEXT_ACTION, actual checks in VERIFICATION_STATE and resume instructions in CHAT_CONTINUITY. Preserve old plans and completed docs; mark completed/superseded with dated notes instead of deleting. Never store secrets in memory files.

Do not bypass extraction gates even if the user asks to keep development moving while CI runs. Continue independent safe work, but never fabricate evidence, alter pinned source or merge/deploy without authorization.
