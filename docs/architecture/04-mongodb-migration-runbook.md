# MongoDB identity migration and rollback runbook

## Safety posture

Treat the existing MongoDB database as occupied until a read-only inventory proves otherwise. Never merge accounts by email, username, or PTCGL display name. Never print password hashes, raw logs, tokens, connection strings, or profile images.

## Clean-start decision

The approved application database is the new `dragapultist_v2` database. The old `dragapultist` database contains one legacy user and 31 sample games, including duplicates. None of those records will be migrated. Leave that database unchanged; it is not a source for account linking, application reads, index creation, or cleanup.

Run `corepack pnpm indexes:mongo:plan` to print the idempotent index definitions. The plan covers unique partial indexes for Firebase UID, owner/game ID, owner/content hash, and owner/import hash, plus an owner/history pagination index. The owner confirms the approved indexes were already applied to the clean `dragapultist_v2` database before this integration. This pass did not change or reapply them.

## Inventory

1. Connect with a read-only MongoDB user.
2. Record collection counts, indexes, ownership field types, duplicate normalized emails/usernames, maximum raw-log byte size, and maximum profile-image byte size.
3. Export a recoverable encrypted backup before changing identities.
4. Identify every user document with password hashes and every distinct game/import ownership value.

## Dry run

1. Export only required identity fields into an isolated migration workspace.
2. Validate Firebase bcrypt import against synthetic accounts first.
3. Assign Firebase UIDs and produce a one-to-one legacy-ID mapping report.
4. Stop on duplicate emails, duplicate usernames, missing ownership, or per-user import errors.
5. Compare user, game, import, note, deck, and image counts before proceeding.

## Cutover

1. Announce a bounded account-maintenance window; guest/local review remains available.
2. Freeze legacy account creation and password changes.
3. Import identities idempotently, then write server-controlled UID mappings.
4. Verify representative accounts and two-user isolation.
5. Enable Firebase session login only after validation. Keep MongoDB as the only persistence writer.

## Rollback

1. Disable Firebase session login through the release configuration.
2. Restore the prior authenticated application version without deleting Firebase users or Mongo mappings.
3. Re-enable the legacy path only if its verified-session boundary has been repaired; never restore raw `userId` cookie trust.
4. Reconcile account changes made after cutover before retrying.
5. Retain encrypted exports and mapping reports until the owner approves a retention date.
