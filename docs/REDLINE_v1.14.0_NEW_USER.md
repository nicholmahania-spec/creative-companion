# Redline v1.14.0 — New-user honesty critique

**Lens:** First open → unlock → onboard → first Work step → glance at Board/Pack/Settings  
**Verdict:** Clear path story on login; friction spikes after unlock (palette indigo, Helper auto-on, empty Work CTA hierarchy, default “My project”).

## Honest critique (summary)

### Login — strong
Promise is clear (“one next design step”). Dual card works. **Weak:** footer version can look stale in some builds; Sign in disabled-gray looks “broken” until filled (acceptable but cold).

### Onboarding — medium
Good fields. **Critical:** finishing always turns **Helper on** — chatty mascot on day one is ADHD-hostile. Skip path leaves “My project” and empty Work with **Break into micro-steps** as primary (wrong for “I just want to type one idea”).

### Work — the make-or-break fold
Hero step pattern is right. Empty state over-offers Pack destination + micro-steps before “type something.” Capture strip is secondary visually to the wrong primary CTA.

### Board / System / Pack — good spine, thin first pack
Honest readiness. Default palette **indigo** makes first System/Pack look like generic SaaS, not this product’s stone desk.

### Tools / Settings — power-user dense
Settings rows work; jump “Presence” vs “Presence & sound” mismatch. Spark still pins with indigo fallback.

## Implement this cycle

| # | Fix |
|---|-----|
| 1 | Default palette → stone (ink / growth / quiet / paper) — kill `#4F46E5` product defaults |
| 2 | Onboard complete: **do not** auto-enable Helper |
| 3 | Empty Work: primary **Dump an idea** (focus capture); micro-steps secondary |
| 4 | After onboard → focus `#desk-capture` or current step |
| 5 | Spark pin fallback → stone ink |
| 6 | Settings jump use presenceSound label |
| 7 | Onboard skip copy clearer; export HTML primary button stone |

## Park
- Full guided product tour  
- Passwordless local unlock option  
