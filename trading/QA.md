# V4 verification — 2026-11-16

## Passed

- 8 game-engine tests; combined release suite: 23/23 tests passing, including unchanged Midnight 13 and Lupin tests.
- 100 seeded mixed-strategy games with 8–11 players and 6/8/10 rounds: nonnegative integer cash, inventory 0–6, prices 60–160, deterministic undo.
- Full live test at https://angusma0711.github.io/ycmc-last-moon-c5/trading/ using two independent Chrome browser contexts and real Firebase: 11 players, eight complete rounds.
- HTTPS QR SVG generated; its public URL opened in the independent audience browser and received committed updates. This verifies independent browser sessions, not a physical-phone camera scan.
- During host entry, the audience retained the last committed prices/balances. Host draft survived reload.
- Final-round closing update executed; blue price moved 100→110, final leaderboard used closing net worth; no R9 controls.
- Stale revision rejected; unauthenticated audience and a different anonymous teacher denied private state and public mutations.
- Audience requested no engine, host or Firebase Authentication module during its normal read-only flow.
- Public refresh, disconnect/reconnect and host-confirmed undo recovered/synchronized correctly.
- 1920×1080 and 1366×768 boards fit all 11 students without scrolling; 390px phone controller shows all three order selectors in one compact row; 1024px tablet tested.
- Missing Firebase config produces explicitly labeled same-browser demo, with no cross-device QR.
- A4 paper template corrected from two pages to one; final PDF visually inspected, all eight rows and instructions present.
- Rules merger preserved every pre-existing Firebase namespace. GitHub changes are confined to new trading paths.

## Strategy finding

Gold's deterministic +15/−15 gives a guaranteed 5-coin profit per unit per two-round buy/sell cycle, net of fees. With 3 units and 8 rounds this yields 1,060. Baseline unchanged. README recommends ±10 as the smallest adjustment if the teacher later decides to remove this predictable profit.

## Practical limits

- Teacher authorization resumes in the original browser. Another device needs a JSON backup import, which creates a new classroom/public link.
- Public links do not expire automatically; use IDs/nicknames only.
- Physical phone camera scan and a real classroom session have not been tested.

No outstanding configuration blockers. Test-created cloud classrooms and anonymous accounts were cleaned up.
