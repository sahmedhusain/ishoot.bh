# Retention policy and implementation status

## Implemented

- Sessions expire after their stored expiry time; maintenance removes expired rows. Password resets revoke sessions.
- Pending **private** uploads expire after 24 hours. Each maintenance pass locks at most 25 expired, unclaimed objects, removes their storage objects, then removes their database rows. Claimed files are preserved. Storage failures retain database records for retry.
- Shared abuse windows older than expiry plus one day are removed by maintenance.
- Communication delivery logs retain at most 100 recent verified event records per message.

## Policy targets requiring implementation and approval of destructive retention

- Purge orphaned claimed private files after 30 days: no reconciliation/soft-delete job currently implements this.
- Purge successful email queue bodies and attachment bytes after 30 days while keeping provider-acceptance evidence: currently not implemented; these rows continue occupying database space.
- Aggregate social analytics after 90 days and purge raw entries: currently not implemented.
- Expired unclaimed public brand objects are not removed by the private-upload sweep.

Audit logs, issued financial documents and accepted email evidence remain retained. No audit cleanup deleted customer files, financial records, email evidence, design assets or Git history. Enforcing the policy targets requires a separately reviewed retention job and a backup/restore procedure.
