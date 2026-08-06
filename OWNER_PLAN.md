# Voyara — Product Plan for Idea Owners

**Working name:** Voyara  
**Stage:** Web MVP (no native app required)  
**One-liner:** An AI travel fixer that plans with you in chat, maps the journey live, surfaces providers, and shows what travelers actually want.

---

## Why this exists

Travelers already use ChatGPT for ideas — then bounce between Booking, Maps, TikTok, and spreadsheets. Competitors prove demand:

| Product | What they nail | Gap we exploit |
|---------|----------------|----------------|
| **Stardrift** | Chat + map + flights/hotels research; start from a single prompt | Heavy research product; less marketplace / intent analytics for operators |
| **Mindtrip** | Personalization, collaboration, inspiration, maps | App-heavy; creator economy complexity |
| **GuideGeek** | Frictionless chat in WhatsApp / IG / Messenger | Thin product surface; weak deep itinerary + B2B |
| **Layla** | Visual inspiration + live partner pricing + human experts | Less operator/provider control; less demand-intelligence layer |
| **Wonderplan** | Fast day-by-day itineraries by interest & budget | Weaker “living product” feel (map + marketplace + analytics) |

**Voyara’s wedge:** chat → live map itinerary → provider marketplace → **admin intent signals** (family vs couple, foodie, luxury, destination demand).

That last piece is the business brain: not only “AI plans trips,” but “we know what travelers are asking for.”

---

## Product vision (what the owner should feel in a demo)

1. Open the landing — brand-first, cinematic, one clear ask.
2. Type a trip idea **without logging in** (Stardrift / Mindtrip-style low friction).
3. Watch chat stream while the **map lights up** with day pins and a route (Mindtrip / Stardrift).
4. See a clean day-by-day plan (Wonderplan) plus **DEMO** flight/hotel cards (Layla-style pricing UI, mock until partners).
5. Providers (hotels, tours, restaurants, transport, experiences) can list inventory.
6. Admin sees **who wants what** — traveler type mix, top destinations, interest tags, funnel.

---

## MVP scope (what we ship now)

### For travelers
- Guest planning (no login) + optional account to save/share
- AI chat planner (DeepSeek)
- Interactive map with English labels
- Day-by-day itinerary panel
- Weather strip (Open-Meteo)
- Mock live pricing (clearly labeled DEMO)
- Preference onboarding (solo / couple / family / friends, budget, interests)
- Shareable trip links

### For providers
- Multi-category listings: hotel, restaurant, tour, activity, transport, experience
- Business profile + listing CRUD
- Admin approval gate

### For admin / idea owner
- Intent & behavior dashboard
- Traveler type mix, interest signals, top destinations
- Funnel: land → prefer → chat → generate → listing views
- Provider approval queue

### Explicitly later (not blocking the wow demo)
- Real booking / checkout
- Native mobile apps
- Calendar sync, social-video import, Magic Camera
- WhatsApp / Messenger bot (GuideGeek path)
- Real Skyscanner / Booking / Amadeus adapters
- Vector long-term memory & group collaboration

---

## Competitive inspiration we took seriously

From browsing live sites:

- **Stardrift:** hero prompt bar, destination chips, chat↔map connection, photos as itinerary builds  
- **Mindtrip:** “Start chatting” first, personalization, collections / inspiration mindset  
- **Layla:** trip-style prompts (family / couples / foodie), pricing partners as trust signal  
- **Wonderplan:** detailed day-by-day itinerary as the core deliverable  
- **GuideGeek:** zero-friction start — chat before commitment  

Voyara MVP combines the strongest of these into one web studio, plus the **provider + intent** layer competitors underplay.

---

## Business model direction (MVP does not need to monetize yet)

1. **Affiliate / partner pricing** (flights, hotels) — UI already prepared with DEMO → swap adapters  
2. **Provider subscriptions / featured listings** — marketplace inventory  
3. **B2B demand intelligence** — anonymized intent reports for destinations & hotels  
4. Later: premium traveler plans, human expert handoff (Layla-style)

---

## Technical foundation (credibility, not buzzwords)

| Layer | Choice | Why |
|-------|--------|-----|
| App | Next.js + TypeScript | Fast web MVP, Coolify-friendly |
| Auth | Better Auth | Roles: traveler / provider / admin |
| AI | DeepSeek via AI SDK | Cost-efficient planning + structured itineraries |
| Map | MapLibre + English basemap | Impressive, no Mapbox bill for MVP |
| Geo / weather | Nominatim, Overpass, Open-Meteo | Free, good enough for demo quality |
| DB | PostgreSQL (Coolify) | Production-ready from day one |
| Deploy | Docker → Coolify + GitHub | Your existing VPS workflow |

Pricing is behind a swappable `PriceProvider` interface so mock DEMO data can become real partners without rewriting the UI.

---

## Demo script (use this with investors / idea owners)

1. **Landing** — type “Tokyo for a couple, food + culture” → Explore (no login).  
2. **Planner** — watch chat + map pins + itinerary + DEMO prices.  
3. **Sign up** — save trip, copy share link.  
4. **Provider** — add a hotel/tour in Tokyo.  
5. **Admin** — approve provider; show couple/foodie intent + Tokyo demand.  

If those five steps feel premium, the MVP has done its job.

---

## Success metrics for the next 30–60 days

- Guest → plan generated rate  
- Plan → account created rate  
- Trips saved / shared  
- Provider applications + approved listings  
- Top intent clusters (family / couple / foodie / luxury) by destination  

---

## Ask / next decisions for the idea owner

1. Confirm brand name (working: **Voyara**)  
2. Priority market / cities for seed providers  
3. Whether to pursue affiliate partners next, or deepen provider marketplace first  
4. Coolify domain + Postgres provisioning (app is ready to deploy)

---

*This document is the owner-facing product plan. Engineering detail lives in the repo (`voyara/`) and the internal implementation plan.*
