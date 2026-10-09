# Architecture rules

- The monitoring store normalizes persisted settings through `fixedMonitoringState` so obsolete camera assignments and layouts cannot override the fixed service catalog; audio preferences persist by channel.