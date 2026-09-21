# Fixtures

This repository does not inherit event-page fixtures from its upstream codebase.

Regression fixtures are added only after `maxvfk/game-calendar` captures a source
independently, records its provenance, and verifies that the source permits the
request. Until then, the build uses current snapshots when available and marks
missing source lanes as unavailable instead of inventing calendar data.
