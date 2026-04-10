Read the following files in order and do not skip any:

1. Read `CLAUDE.md`
2. Read `plans/OVERVIEW.md`
3. Read `plans/PLAN.md`

After reading all three, output this brief:

---
**MyCycle+ Session Brief**

**What:** [1-sentence project summary]

**Apps:** admin-web | sponsor-web | donor-mobile | collector-mobile

**Hard constraints:**
- Map: OpenStreetMap + Leaflet.js + OSRM (no paid API)
- AI: EfficientNet-B0 TFLite on-device (no external ML API)
- Collector accounts: admin-created + OTP email only
- Docker: all installs run inside the `mycycle` container — `docker compose run --rm <service> <cmd>`
- Supabase MCP: use MCP for DB operations when available
- Commits: always remind user to write their own commit message before any push
- Pre-commit: always review and update `.gitignore` before staging any commit

**Priority queue (current):**
[List all items from the Priority Queue in PLAN.md, mark ✅ for any with "Done" status]

**Key rules:**
- No hardcoded Supabase keys
- Max ~200 lines per file
- No mock data
- Preserve web UI (JSX/CSS structure unchanged)
- Ask before structural changes; all enhancements welcome

---

Then ask: "What are we working on today?"
