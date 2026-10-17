# Touchpoint track plan

Based on the event brief supplied by the team on October 17, 2026. Maximum three
sponsored tracks. Implementation does not establish eligibility; organizers decide.

## Sponsored entries (three)

| Track | Touchpoint fit | Implemented locally | Still required |
| --- | --- | --- | --- |
| Perceptron Perception | Locate appliance buttons and read displays | Server adapter, scan/verify routes, guarded OCR | Event credentials/model entitlement, real appliance photos, physically checked profile rules, successful recorded live demonstration |
| VEYZL | Review an AI system that can influence appliance use | Documented boundaries, adverse-response tests, audit evidence worksheet | Install GitHub App, connect repo, actual check visible on PR, remediate actual findings, retain before/after evidence |
| SideShift | Accessible appliance guidance startup | Pitch and discovery hypotheses | Validate problem/distribution with users; submit working demo; no SideShift API required by supplied brief |

## Non-sponsored entries

| Track | Decision and deliverable | Remaining requirement |
| --- | --- | --- |
| Gemini | Backend endpoint maps natural language to existing routine IDs; confirmation required | Key/model, live test, teammate adds selection UI |
| Backboard | Opt-in retrieval/update/deletion of a dedicated demo user's voice/detail preferences | Account, assistant and memory record, live round trip, teammate adds consent/settings UI |
| Vultr | Node 22 Docker deployment package | Account/credits, real server deployment, HTTPS, phone verification; Docker not installed locally |
| DubHacks NEXT | Startup brief and validation plan | Actual learning, interviews, revenue evidence and submission |
| Commit Fellowship | Same prototype and business evidence | Opt in and complete the organizer's supplemental form; link not supplied |
| DEV Writing | Unpublished technical story outline | Fill in actual results and publish to DEV |
| Freshman Beginner | Ineligible | Team confirmed no members are freshmen; do not submit |
| GoDaddy Registry | Conditional hosting/domain entry | Choose/register an eligible domain; no domain purchased |
| Tiger Data | Deferred | No high-frequency analytics requirement yet; adding a second persistence service solely for a prize would not improve this prototype |
| MongoDB Atlas | Deferred | Current persistence need is narrow preferences, covered by Backboard; revisit if a user-owned appliance catalog needs a database |
| Solana | Excluded | No transaction, payment, or decentralized identity requirement |

Other sponsored tracks: T-Mobile addresses phone shopping, not appliance guidance;
Photon requires a messaging-channel agent, which changes the interaction model;
SpaceXAI requires Cursor and Grok usage and has a space-data focus in the supplied
brief; robotics requires an arm and workshop participation. Cloudforce cannot be
assessed from its filename alone: the full brief is still needed. Do not claim these.

## Documentation used for implementation

- Perceptron HTTP/model/auth: https://docs.perceptron.inc/perceptron-mk1.5/index
- Perceptron structured responses and finish checks: https://docs.perceptron.inc/perceptron-mk1.5/capabilities/structured-outputs
- Gemini REST generateContent: https://ai.google.dev/api/generate-content
- Backboard memory get/update/delete:
  https://docs.backboard.io/api-reference/memories/get
  https://docs.backboard.io/api-reference/memories/update
  https://docs.backboard.io/api-reference/memories/delete
- VEYZL setup overview: https://veyzl.ai/how-it-works

Public docs are not confirmation of event entitlement. All live integrations remain
unverified until exercised with the team's event accounts. No sponsor calls were made
with real images or user preferences during implementation.
