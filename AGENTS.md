# Architecture rules

- The monitoring store normalizes persisted settings through `fixedMonitoringState` so obsolete camera assignments and layouts cannot override the fixed service catalog; audio preferences persist by channel.
- Automatic update checks run on entry and foreground, but reload at most once per current/target version pair per session and preserve the URL, preventing loops when a newer bundle is not yet available.
- CDMX advisories are fetched through an authenticated edge function with bounded parallel RSS requests; publication times and consultation times remain separate and news reports never imply verified live conditions.

- Mass earthquake alerts run server-side from a per-minute scheduled poll of the USGS feed, deduplicated per event in a server-only table, so alerts reach devices in the background without any client being open.
