---
"@web5/identity-agent": minor
"@web5/proxy-agent": minor
"@web5/user-agent": minor
"@web5/agent": minor
"@web5/api": minor
---

- Upgrade `api` and `agent` packages to include the newest `dwn` changes.
 - Protocol `can` actions now take an array.
 - Protocol `can` verbs are now `['create', 'update', 'delete', 'query', 'subscribe', 'co-update', 'co-delete']`
 - `paginagion` is now handles by an object instead of a string.
- Upgrade packages to consume `1.0.0` of foundational `web5` packages.
