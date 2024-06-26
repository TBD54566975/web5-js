---
"@web5/api": patch
---

If the user passes a connectedDid to Web5.connect() and the identity list returns more than one identity, attempt to find the identity which matches the connectedDid, if it exists use that identity, otherwise the first identity is chosen.
