# Frontend v9 QA Fix Notes

Implemented requested frontend changes:

1. Load latest now calls `/api/bodhi/latest` on dashboard load. The server-side `server.js` reads Bodhi environment variables and keeps the PAT token off the browser bundle. JSON upload remains a manual fallback.
2. Executive screen now shows only four summary KPIs: AI visibility score, queries audited, avg owned GEO, owned pages audited. Summary text is read from the Bodhi bundle.
3. Query diagnostics and Query workbench are merged into one Query workbench tab. Cards show AI visibility score, competitors, winning source types, leading citation domain and mapped owned URLs. Owned target/domain/top citation count fields were removed from the card summary.
4. Upload/load parse message has moved to the footer.
5. Source landscape now uses one full-width scatter plot: x-axis = source type, y-axis = citation count, dot = citation domain.
6. Owned URL table now supports sortable column headers and includes a CTA to jump to the matching CMS card.
7. CMS and PR are split into separate tabs.
8. CMS cards now show top copy-ready modules per URL with suggested HTML/component placement and a collapsible value-score explanation.
9. PR cards now use grouped source/query opportunities and include a collapsible value-score explanation. Generic fallback text is suppressed when richer LLM synthesis is available.
10. PDF export now temporarily renders the offscreen full report into the viewport before capture, fixing blank/failed export in many browsers.
11. Dashboard title changed to AI Brand Visibility / AEO/GEO Intelligence Dashboard.
12. Refresh Control renamed to Refresh Evidence.

Validation run:

- `npm run build`: passed
- `npm run lint`: passed
- Express server smoke test: passed
- `/api/bodhi/latest` missing-config behaviour: returns non-blocking JSON error; frontend falls back to configured evidence service or manual upload.
