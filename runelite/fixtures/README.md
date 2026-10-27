# Journal / TypeScript compatibility fixture

`account-evidence-v1.json` is synthetic, deterministic JSON produced by the real
`Journal.exportJson`, suitable for choosing in the native evidence file picker.
It contains five selected-account observations: baseline, contiguous update,
contiguous update after an excluded other-account sequence, reconnect GAP, and
counter-regression DISCONTINUITY. GP strings exceed signed-int bounds; the preview
must retain them exactly and mark legacy monetary use unsupported. This fixture
is evidence only, never a collection, execution-time, tax, net, or cash claim.

From the repository root, with JDK 11+ and Node 24:

```sh
NODE="$HOME/.nvm/versions/node/v24.18.0/bin/node" runelite/fixtures/check-compatibility.sh
```

Or set `NODE` to another Node 24 executable. The command uses the existing bounded,
pinned `runelite/build.sh`, executes Java tests, generates an export in memory via
Java, compares its bytes against the shared JSON, and runs the read-only TS decoder,
preview and merge checks plus the importer suite. No mobile source is modified.

To regenerate intentionally after a reviewed contract change:

```sh
./runelite/build.sh
java -cp 'runelite/target/test-classes:runelite/target/classes:runelite/.deps/*' \
  com.gemetrics.recorder.ExportFixture > runelite/fixtures/account-evidence-v1.json
```

The executable fixture seeds a synthetic private log with fixed persisted UUIDs,
then replays it through Journal twice and exports it. It does not replace the
production random ID generator or hand-author exported event objects. Random-ID
append/persistence behavior remains covered by JournalTest.

`retainedSequenceRanges` names the selected persisted sequences, including source
UUIDs. `sequenceGaps` names the complementary sequences excluded by account
filtering across the current persisted source range (including leading/trailing
exclusions). These observations exist in the private journal but are absent from
this scoped export. They do not mean torn storage, dropped callbacks, missing
executions, or known offline intervals. No offline sequences are fabricated.
Event `continuity` independently describes lifecycle uncertainty. Reconnect GAP
starts a fresh inferred offer ID; the current TS preview conservatively displays
that incompatible predecessor as DISCONTINUITY and exposes no derived delta.

Limitations: no native picker or live game was launched; this verifies JSON and
pure importer compatibility, not platform file access or runtime callback order.
Node may emit the existing mobile package module-type warning; tests still pass.
