# Unified platform course provider

The existing course editor, content IDs, course database, native enrollments, groups and old links are retained. The main portal is https://zamonaviy-talim.up.railway.app. It uses the existing Tube Mentor core for verified identity and the only spendable coin wallet.

## Contract and ownership

- All /api/platform endpoints require the distinct provider-only PLATFORM_SERVICE_SECRET. It is different from the portal/core secret and is never returned to a browser.
- Catalog entries are real published courses plus their native plan variants. A legacy course without plan pricing uses the existing first/default plan without altering its UZS price.
- New offers import as drafts. The owner explicitly sets coin prices and access days in the central admin; no implicit UZS-to-coin conversion occurs. Every sale requires a configured demo.
- Native student aliases are mapped by the verified core user ID. No existing accounts are merged by names or unverified email. Existing native purchases remain intact; importing/linking those old accounts requires a separate verified account-link flow.
- External order IDs provision exactly once. Access duration starts when provisioning commits, not when a delayed request is first queued. Revocations received before delayed delivery leave a tombstone, so a late retry cannot reopen a cancelled purchase.
- Source grant extension/revocation operations use persistent operation IDs. Only the associated enrollment/subscription changes; independent legacy/manual grants are retained.

## Learning and assessment

The portal embeds supported course video players, not the entire external application. It uses an authenticated learner gateway for lesson sections, progress, assignments, essays and speaking submissions. Original content routes now enforce native active enrollment/subscription and scheduled/test gates too.

Course assessments freeze questions and answer keys on start, resume one active attempt, shuffle configured questions/options, and enforce global/per-question/section timers on the server. Matching choice IDs are opaque. Correct answers and future timed sections are absent from the learner payload. A legacy client-score submission path now uses server grading; platform callers must finish their frozen attempt instead.

Essay and short-answer assessment items require manual review. Central admin can also grade native assignments, essays and speaking recordings. Scores are written back to the original native result tables, so existing test gates and teacher views continue to work. Review actions are recorded with the central actor ID. No AI request is required for these workflows.

## Private uploads

Railway PRIVATE_UPLOAD_DIR points at /app/private-uploads on the course-private-submissions 1 GB persistent volume. A deployment does not erase new submissions. Metadata remains in PostgreSQL. Reads require owner/course-instructor/admin permission or an authenticated central admin request. Credential hashes are stripped from HTTP JSON responses, including joined legacy records.

Platform assignment/speaking uploads use request UUIDs. Repeated delivery returns the same work; duplicate new files are removed. A failed speaking write rolls back all answer rows and cleans up its new files. Existing Replit storage remains a fallback when PRIVATE_UPLOAD_DIR is absent; old file keys are not replaced.

## Configuration and checks

New Railway variables: PLATFORM_SERVICE_SECRET, PRIVATE_UPLOAD_DIR. Existing DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY and any old media credentials are preserved. Node 24 is declared in package.json.

Run npm run check, npm test, npm run build. Tests use actual shared column definitions and a PostgreSQL protocol test database. They cover expiry/direct-path denial, test gates, idempotent grants/operations, frozen answers, timers, concurrent starts, late answers, manual grading and private/upload retry behavior.

## Explicit release gates

Live cohort assignment and certificates are not exposed as ready-to-sell features. Plans promising either remain blocked from central publication until those workflows are integrated. PDF sales and legacy-account import are later phases. Source authoring remains in this repository.
