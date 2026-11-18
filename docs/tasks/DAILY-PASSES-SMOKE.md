# Daily passes acceptance on Android and PC

Use an isolated flag-on build and disposable test profiles for app operations.
Record the build SHA, device/browser, UTC timestamps and selected region. For
in-game observations, use an existing pass if available.

## App on both devices

1. In Checklist, find **Daily passes** beside **Today's dailies**. Focus a built-in
   game and confirm the selected region, status, inclusive count and expiry.
   Open **Manage daily passes**, inspect all three regions, and switch games.
   Check that an unconfigured region and an expired region are distinguishable.
   Tick a daily and confirm that the pass value stays the same.
2. Tap **+30 days** twice within one second. Verify one extension and one Undo.
   Undo while offline. Add again, reconnect, wait for the server acknowledgement,
   then Undo that extension. Switch profiles while offline and confirm the
   original pending changes are still visible when returning to their profile.
3. Correct a pass by last active game-day and by duration. Verify the date is
   inclusive and the expiry is at the next reset. Save a Genshin duration above
   180 days and confirm it warns and saves. Verify an extension absorbed by the
   correction has no Undo. With two test devices, synchronize an earlier offline
   extension after a correction on the other device. Exercise **Include
   extension** and **Dismiss extension** with separate conflicts.
4. Set up a first login with different guest and cloud values in two games. Select
   one **Keep the cloud value** and one **Use this device's value**. Repeat with a
   changed cloud value during the prompt and verify that choices clear. Cancel
   a separate attempt and verify the guest data is still available. Repeat with a
   foreign v2 backup, then import the same file again and check the values.
   Confirm the usual v1/CZN and personal import controls work.
   In a failure-injection build, fail account setup after the pass receipt is
   saved. Confirm the wizard shows the saved status and continues with that
   choice when the remaining setup succeeds.
5. On Android, check touch targets, scrolling and the date picker. On PC, use
   Tab, Shift+Tab, Space and Escape through management and the import dialog.
   Check focus returns on close and that Timeline and the daily checklist still
   work. Repeat startup with the release flag off and verify Daily passes is absent.

## Confirm the in-game day count

For each game, record the in-game remaining count just after a purchase or renewal
if one happens naturally. Otherwise compare an existing pass on both sides of a
reset. Enter the observed count in the app and verify today counts as one of the
remaining days. At a practical actual rollover, record the UTC time, before/after
counts and confirmation that the app dropped one day at the same boundary.
For a pass with one day left, verify it becomes **Expired** at that reset.
Mark missing observations as unverified and record any disagreement with the
app's clock. Do this for each available server region before claiming wider coverage.

| Game | Check in game |
| --- | --- |
| Genshin Impact | Welkin remaining days and next reset |
| Honkai: Star Rail | Express Supply Pass remaining days and next reset |
| Wuthering Waves | Paid daily pass remaining days and next reset |
| Zenless Zone Zero | Inter-Knot Membership remaining days and next reset |
| Arknights: Endfield | Paid daily pass remaining days and next reset, including the shared western clock where possible |
| Neverness to Everness | Paid daily pass remaining days and next reset in the selected server |
| Chaos Zero Nightmare | Paid daily pass remaining days across 18:00 UTC |
