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

**Priority queue (current):**
[List all 13 items from the Priority Queue table, mark ✅ for any with "Done" status]

**Key rules:**
- No hardcoded Supabase keys
- Max ~200 lines per file
- No mock data
- Preserve web UI (JSX/CSS structure unchanged)
- Ask before structural changes; all enhancements welcome

---

Then ask: "What are we working on today?"
