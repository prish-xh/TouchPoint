# First live microwave photo test — 2026-10-17

Two user-supplied photos were sent to Perceptron Mk1.5 using the documented
chat-completions endpoint with a custom combined button-localization/OCR JSON schema.
This was a diagnostic request, not an end-to-end call through the application routes.
No photo bytes or credentials were copied into the repository.

| Photo | HTTP | Latency | Input tokens | Output tokens | Display |
| --- | --- | --- | --- | --- | --- |
| IMG_6324.JPG (panel close-up) | 200 | 4.665 seconds | 16,283 | 319 | unreadable; null |
| IMG_6323.JPG (full appliance) | 200 | 4.702 seconds | 16,283 | 323 | unreadable; null |

Both responses completed with finish_reason=stop and returned the seven requested
labels: 3, 0, Cook Time, Add 30 Sec, Start Pause, Cancel Off, Timer On/Off.
Total usage: 33,208 tokens (32,566 input; 642 output). Billing was not independently
queried; these counts are provider-reported usage, not a balance estimate.

## Localization is preliminary, not approved

Close-up returned boxes (x,y,w,h, normalized to the full upright image):

| Label | x | y | w | h |
| --- | --- | --- | --- | --- |
| 3 | .48 | .50 | .06 | .07 |
| 0 | .39 | .61 | .06 | .06 |
| Cook Time | .57 | .35 | .09 | .07 |
| Add 30 Sec | .57 | .49 | .09 | .07 |
| Start Pause | .44 | .70 | .09 | .06 |
| Cancel Off | .31 | .70 | .09 | .06 |
| Timer On/Off | .57 | .43 | .09 | .07 |

Visual comparison against the supplied upright photo shows several boxes are too low,
including 3 and Add 30 Sec. Returning a correct label is not sufficient evidence of
correct localization. Validate coordinates on the exact camera-frame orientation and
resolution before using them for finger guidance. Full-appliance boxes appeared closer
on visual inspection, but have not been quantitatively evaluated or approved.

## Profile mismatch

The appliance visibly bears a GE logo, but its precise model number is unknown.
The panel includes Express Cook, Cook Time, Add 30 Sec, Start/Pause and Cancel/Off.
Our existing SIM-MW1 mock labels/sequence are not a checked profile for this appliance.
Do not assume digit 3 then digit 0 enters 30 seconds: Express Cook may change digit-key
behavior. Obtain the model label/manual and validate the intended routine separately.
Do not interpret the partial illuminated character in these photos as an error code,
time, or successful press. Both model responses correctly declined a definite reading.

The source files are approximately 3.4/4.0 MiB, larger than the app's 3-million-character
base64 request limit. This diagnostic sent originals directly; it does not prove the
app's current camera capture path works at those sizes. Test actual captured frames
next. Leave current panelReady/uncertain safeguards and teammate frontend unchanged.

Next evidence needed: exact model number, readable idle display, and observed display
states for the chosen routine. No actual appliance actions were performed in this test.

## Follow-up: native detector with normalized image orientation

Two additional live requests used `/v1/detect`, `output=box`, and `reasoning_effort=none`.
Sharp applied EXIF rotation, removed metadata, and resized the full frame to fit 1600px
without cropping. Both completed with HTTP 200 and finish_reason=complete.

| Photo | Sent dimensions | Latency | Returned categories |
| --- | --- | --- | --- |
| close-up | 1200 × 1600 | 44.014 seconds | 7 of 7 |
| full appliance | 1600 × 1200 | 9.203 seconds | 7 of 7 |

Close-up native boxes for two previously misplaced controls:
- 3: pixel corners (577,696)–(653,760), normalized top-left (.4808,.4350).
- Add 30 Sec: (680,696)–(798,762), normalized top-left (.5667,.4350).

These align substantially better with the visible buttons than the earlier y=.50/.49
boxes on visual inspection. This is a two-image qualitative comparison, not a measured
accuracy benchmark; changing both transport and preprocessing prevents attributing the
improvement to only one factor. Neither test establishes performance on unseen panels.
The dedicated endpoint did not report token usage in these responses; billing was not
queried. No additional OCR inference was run in this follow-up.

The backend now uses the native detector for scan and chat-completions for OCR.
Pixel boxes are normalized using actual processed dimensions, never assumed to use a
1000-grid. Duplicate/unknown/overlapping detections are excluded. Live profile validation
remains blocked; the tests do not establish the microwave's correct action sequence.
Initial scan can be slow; requests have a 60-second provider deadline and 65-second
browser deadline. Use for panel acquisition, not per-frame tracking. No automatic
fallback to fabricated boxes or fixture responses exists.

Reference: https://docs.perceptron.inc/capabilities/detect
