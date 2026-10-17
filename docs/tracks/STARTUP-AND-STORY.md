# Startup and submission working material

## SideShift / DubHacks NEXT / Commit Fellowship

Touchpoint aims to help blind and low-vision people complete selected appliance routines
with camera-based panel localization and step-by-step guidance. The demo focuses on a
small supported catalog rather than claiming arbitrary appliance compatibility.

Pitch draft: Familiar appliances can become difficult to operate when their controls
are visual or change between models. Touchpoint is exploring a phone-based guide that
locates a supported control and checks visible results before continuing. Our prototype
separates model observations from routine progression so an uncertain reading can leave
the task paused instead of pretending it succeeded.

Hypotheses, not validated claims:
- Initial distribution: partner with independent-living/accessibility organizations and
  blind/low-vision creators for consented co-design sessions and demos.
- Potential buyers: accessibility programs or appliance partners funding supported
  device onboarding; test consumer willingness to pay before selecting pricing.
- Differentiator to validate: a small catalog with checked routines and accessible
  verification may be more useful than a generic image-description assistant.

Discovery questions: Which appliance task is hardest? What workaround works today?
When is a camera/phone mount impractical? What would make an incorrect instruction
unacceptable? Who pays for a solution? What must remain on device? Do not record
participants' identities or disability information in the repo.

Weekend evidence log (fill with real observations):
| Test/interview | What we learned | Change made | Evidence |
| --- | --- | --- | --- |
| Pending | Pending | Pending | Pending |

Demo script: explain target user/problem; show labeled mock routine; show real provider
observations only after live testing; demonstrate uncertainty stopping progression;
show actual audit finding and fix once available. Distinguish shipped UI from backend
endpoints awaiting integration. Show deployment only after it exists.

Submission tasks: SideShift startup entry; NEXT problem/iteration/revenue evidence;
Commit Fellowship opt-in plus supplemental form (obtain link from organizers). None
has been submitted. The team confirmed no members are freshmen, so the freshman track is ineligible.

## DEV story outline — unpublished

Working title: “Building appliance guidance that knows when it cannot confirm a step”

1. Problem and co-design findings (add real user research, no invented quotes).
2. Architecture: frontend camera/tracking, server perception, deterministic controller.
3. Why reaching a control is different from confirming a press.
4. Actual validation bug: malformed data URLs initially caused an internal error; input
   refinement now handles missing base64 delimiters and returns a sanitized 400.
5. What tests cover and what mocked HTTP cannot prove.
6. Real sponsor integration results and VEYZL findings (pending; add only after running).
7. Remaining limitations and next steps.

Publish only after filling live results; include repository/demo links and accurately
credit both teammates. No DEV post or other external message has been sent.
