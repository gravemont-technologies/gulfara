# DECISION_LOG

Purpose: record Track A commitment decisions, abort criteria, owners, timestamps, and notes for the PIVOT → Firebase cutover.

Format (append-only):

- Date: 2025-12-11
  - Decision: Commit to Track A (Cloud Run + Cloud SQL migration)
  - Owner: <name / role>
  - Rationale: <short justification>
  - Abort Criteria: <e.g. Oracle validator divergence >0 rows, replay mismatch >0.5%>
  - Rollback Plan: <short text — e.g. restore backup_prepivot.dump, swap connection string>
  - Notes: <free-form>


## Past Decisions

(Empty — add entries above)
