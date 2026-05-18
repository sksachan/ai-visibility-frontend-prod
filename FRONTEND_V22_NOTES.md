# Frontend v22

Adds a Refresh Evidence field for reusing AI citation evidence from a previous Evidence Service run.

## Key changes

- Adds `Reuse citation evidence run ID` input to Refresh Evidence UI.
- Sends `source_run_id` to the Railway Evidence Service.
- Allows smoke tests that reuse existing SerpAPI/Google AI Mode citation rows while keeping SerpAPI off.

## Example

Use:

- Existing portfolio ID: `nissan_japan_1779101279_synthetic_v1`
- Reuse citation evidence run ID: `evidence_nissan_japan_1779101052_5d1acd`
- Fresh AI citations / SerpAPI: off
- Trigger Bodhi auditor: on
