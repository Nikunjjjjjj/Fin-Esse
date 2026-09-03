# Design canvas working files

`build.py` generates the five artboards and `canvas.json`; the seeded canvas
file is a build artifact and is not committed.

```bash
cd design && python3 build.py
```

Every figure in these artboards is real output from the app's engine
(`src/lib/*`) for the INR sample profile — not placeholder data. If the engine
or the sample profile changes, re-derive the numbers rather than editing them
by hand, or the mockups will quietly drift from what the app actually shows.
