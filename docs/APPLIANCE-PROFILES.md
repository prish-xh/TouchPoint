# Backend appliance routines

All three profiles remain simulated and preserve the teammate's existing catalog IDs.
They work with the real task engine using an explicitly supplied mock client. Live
Perceptron can return observations, but cannot authorize guidance or confirm actions
until actual-device rules have been checked. No frontend changes are included.

| Appliance / routine | Ordered steps | Scope |
| --- | --- | --- |
| microwave / set_30_seconds | press_3, press_0, press_start | Existing SIM-MW1 demo; not suitable for the photographed Express Cook panel without revision |
| laundry / normal_cold | select_normal, select_cold | Select cycle and temperature only; does not start washing |
| stove / set_and_cancel_timer | open_timer, add_minute, start_timer, cancel_timer | Kitchen timer only; no oven/burner controls |

`profiles/` supplies public controls and routine instructions. `fixtures/appliances.ts`
provides isolated synthetic scan boxes and per-step success/previous/wrong observations.
The mock client selects fixtures by appliance ID, so laundry never returns microwave
readings. All routines support success, wrong setting, missed press, unreadable, and
API failure scenarios. The generic engine advances only matched results; mismatches
pause for review; uncertainty/check failures retain the current step. Camera movement
invalidates coordinates and requires rescan.

These mock readings are not live verification rules. For each physical appliance obtain:
- Exact model, panel photo, and official operating instructions.
- Visible initial state and evidence after every step, including indicator lights.
- Checked retry instructions and conditions requiring pause/restart.
- Confirmation that timer controls are distinct from cooking/heat controls.

Do not infer a selected cycle from the printed word Normal, or infer a running timer
from a single time reading. The current OCR prompt asks for visible selections but
keeps verification uncertain until reviewed matching rules exist.

## Detection changes

Backend-only Sharp dependency handles EXIF orientation, metadata stripping, decoded
pixel limits, and bounded resolution in memory. The native Perceptron detector returns
pixel coordinates; conversion preserves the frontend's unmirrored full-frame normalized
box contract. There is no crop offset or frontend coordinate-system change. Server
input limits remain unchanged; oversized raw phone-photo uploads require appropriately
sized input, while existing camera captures are already reduced by the frontend.

Backend tests cover all three routine flows, scenarios, fixture coverage, coordinate
conversion, EXIF normalization, and rejected ambiguous detections. See
`docs/tracks/MICROWAVE-PHOTO-TEST.md` for the limited live evidence and latency.
