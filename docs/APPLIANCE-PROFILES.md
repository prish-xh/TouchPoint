# Backend appliance routines

Microwave and stove remain simulated. All profiles preserve the teammate's existing catalog IDs.
They work with the real task engine using an explicitly supplied mock client. Live
Perceptron can evaluate the washer selections described below, but live guidance
remains gated until localization and end-to-end acceptance checks pass. No frontend changes are included.

| Appliance / routine | Ordered steps | Scope |
| --- | --- | --- |
| microwave / set_30_seconds | press_add_30 | GE JVM3160RF9SS single Add 30 Sec action; live countdown validation pending |
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
keeps microwave and stove verification uncertain. Washer rules are described below.

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

## Physical evidence update — October 17, 2026

The public appliance/routine IDs and controller contract remain unchanged. Microwave
now uses one Add 30 Sec action, rather than the inappropriate 3/0/Start simulation.
The button starts cooking immediately. Never repeat it just because verification is
waiting. The supplied video appears to count down in the 50s, and the user confirmed two presses. This explains the countdown but does not validate a single-press check. Microwave verification remains uncertain.

Washer reference: GE GFW550SSN5WW. Normal is selected with the rotary dial; Cold
is selected through the Temp button, not by pressing the printed Cold label. Existing
control IDs are retained, but cycle_normal now targets the dial and temp_cold targets
Temp. Coordinate localization for these revised targets still needs acceptance testing.

Structured washer verification separates the dial's cycle light from the Normal soil
light, and Cold temperature from the Cold Wash cycle and Tap Cold temperature.
The final temperature check also rechecks Normal cycle. Unlit/ambiguous indicators
remain uncertain; known incorrect selections mismatch. No wash-start claim is made.

Two real Perceptron verification calls on supplied photos passed on October 17:
- IMG_6333.JPG: Normal cycle + Cold temperature returned matched.
- IMG_6331.JPG: dark panel returned uncertain.

This is a two-image smoke test, not an accuracy benchmark. Wrong-cycle, wrong-temperature,
blurred, and changed-camera examples plus phone end-to-end testing remain outstanding.
Microwave and stove retain simulated=true. Washer live mode is opt-in as described below. The washer's
verify endpoint can evaluate selected states, but scan does not yet authorize live
hand guidance. Do not flip this flag solely because these two observations passed.
Photos, serial numbers, and credentials were not added to the repository.

References:
- GE microwave model/manual: https://www.geapplianceparts.com/store/parts/assembly/JVM3160RF9SS
- GE washer model/manual: https://www.geapplianceparts.com/store/parts/assembly/GFW550SSN5WW

## Washer live demo readiness

Native Perceptron detection on IMG_6333.JPG and IMG_6331.JPG returned both controls.
Local overlays were visually reviewed: cycle_normal encloses the actual rotary dial;
temp_cold encloses the Temp touch control, not the illuminated Cold label. These are
two viewpoints, not a general localization accuracy benchmark.

Set the server-only environment variable TOUCHPOINT_LIVE_WASHER_MODEL=GFW550SSN5WW
only for this physical demo washer. This is an operator configuration, not automatic
model identification. Restart the server after changing environment variables.
The scan checks visible powered-on cycle evidence before enabling guidance; missing
controls, an unconfigured model, or a dark/ambiguous panel cannot become ready.
The normal_cold routine only selects settings and never directs a wash start.

For the existing frontend, open /?live and enter the private demo access code in the
existing access form. Do not put API keys in the browser. Use an HTTPS deployment on
the phone so camera access works. Configure the Perceptron key, model, private demo
token, and washer-model variable on that deployment. Default URL remains mock mode.

Before recording: rehearse on the actual phone with the washer powered on. Check that
camera boxes align with the dial and Temp, then verify Normal and Cold. Move the camera
and confirm rescan; cover the panel and confirm no step advances. A physical wrong-cycle
and wrong-temperature trial still needs human review; unit tests cover their rule paths.
The phone camera/tracking/audio interaction is not certified by static-photo tests.

A real provider-backed engine smoke test also passed: scan -> start guidance -> Normal
check -> Cold check -> done, using IMG_6333.JPG with distinct capture IDs. This uses
the same already-selected photo; it proves backend wiring, not a physical state change.
