# Frontend v23.4

Clarifies owned URL inventory vs query mapping.

## Changes
- Renames Refresh Evidence field to `Max owned inventory URLs to GEO audit`.
- Explains that `Mapped owned URLs per query` controls query/CMS/opportunity mapping only.
- Sends `maxOwnedInventoryUrls` to Evidence Service.
- Adds Owned URL scope filter: all audited inventory URLs, mapped to current query portfolio, inventory only.
- Adds query-mapped/inventory-only labels on Owned URL rows.
- Previous Runs now distinguishes owned scored vs mapped owned counts when backend provides both.
