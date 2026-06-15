# G-Coin AtlasVault Account Migration 20405

This migration fixes the AtlasVault stack-heap crash caused by loading the full `BBS_ACCOUNTS` table during transactions.

## Old Storage

```text
BBS_ACCOUNTS = uuid|checking|savings|uuid|checking|savings
```

Part 2 loaded that entire string into a list for every send/transfer.

## New Storage

```text
BBS_ACCT:<uuid> = checking|savings
BBS_ACCT_INDEX = uuid|uuid|uuid
```

Part 2 now only loads the sender account and receiver account.

## Scripts

- `GC_AtlasVault_Account_Migrator_20405.lsl`
- `GC_AtlasVault_Core_20405_part1.lsl`
- `GC_AtlasVault_Core_20405_part2.lsl`

## In-World Order

1. Put the G-Coin server into maintenance if possible.
2. Keep the old server object and old `BBS_ACCOUNTS` linkset data intact.
3. Drop `GC_AtlasVault_Account_Migrator_20405.lsl` into the AtlasVault server object.
4. Touch the server/migrator as owner/admin.
5. Wait for: `DONE. Migrated X accounts.`
6. Remove/disable old `GC_AtlasVault_Core_20403_part1`.
7. Remove/disable old `GC_AtlasVault_Core_20403_part2`.
8. Add `GC_AtlasVault_Core_20405_part1.lsl`.
9. Add `GC_AtlasVault_Core_20405_part2.lsl`.
10. Test balance, checking-to-savings, savings-to-checking, send, admin add.
11. Remove the migrator after testing.

Do not delete `BBS_ACCOUNTS` yet. Keep it as a rollback copy until the new server has been tested live.
