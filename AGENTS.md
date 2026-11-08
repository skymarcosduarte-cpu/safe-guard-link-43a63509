# Architecture rules

- The monitoring store normalizes persisted settings through `fixedMonitoringState` so obsolete camera assignments and layouts cannot override the fixed service catalog; audio preferences persist by channel.
- Automatic update checks run on entry and foreground, but reload at most once per current/target version pair per session and preserve the URL, preventing loops when a newer bundle is not yet available.