# VEYZL audit evidence — pending actual audit

No VEYZL audit has run. Tests and this document are not a substitute for its GitHub check.

1. Repository owner installs the VEYZL GitHub App and grants this repository access.
2. Create a VEYZL project for the repository and a pull request for the integration.
3. Wait for the actual VEYZL check; save the check/PR links and commit SHA.
4. Record each real finding below. Fix it in a follow-up commit with a regression test.
5. Rerun the audit, link the new result, and demonstrate the changed behavior.

| Actual finding | Before commit/check | Fix commit/test | After check | User impact |
| --- | --- | --- | --- | --- |
| Pending audit | Pending | Pending | Pending | Pending |

System facts for the auditor:
- Perceptron receives a user-supplied image for localization/OCR through server routes.
- The only profile is simulated. Real observations cannot confirm success or start guidance.
- Gemini only proposes an existing routine; confirmation is always required.
- Backboard persists only explicitly consented voice/detail preferences for one demo persona.
- Keys are server environment variables; route access requires a private demo token.
- Malformed/truncated output and service failures fail closed; no image logging is added.
- The running frontend still uses its existing mock controller.

Known work before public release: physically checked profiles, real controller race/
pause tests, user authentication and quotas, provider-retention disclosure and consent,
phone and screen-reader testing, and actual account-backed sponsor integration testing.
These are engineering observations, not findings attributed to VEYZL. No compliance
certification or conformance to EU AI Act/NIST/ISO is claimed.
