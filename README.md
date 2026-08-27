# Family Bot 🌍💜

**Family Bot** is a premium Bale group-management, entertainment and family-network experience for the **Global Family** community.

It combines:

- 🛡️ group moderation and safety
- 👨‍👩‍👧‍👦 family profiles, relationships and family tree
- 🎮 games, challenges, XP, coins and leaderboards
- 🤖 text + voice AI assistant
- 🎂 birthdays, occasions, calendar and reminders
- 📸 memories and family timeline
- 🏡 shared Family House progression
- 🗳️ polls, tasks, events and shared planning
- 📱 a rich Bale Mini App with a bespoke visual identity

## Architecture

- Next.js + TypeScript Mini App
- Bale Bot webhook API
- PostgreSQL / Supabase-ready data layer
- Family Core domain services
- AI / voice adapter layer
- custom RTL-first design system and motion language

## Security

Never commit bot tokens, AI keys, database passwords, or webhook secrets. Use `.env.local` locally and deployment environment variables in production.

## Project status

### Phase 0 — Foundation ✅
- repository baseline
- security conventions
- product architecture

### Phase 1 — Mini App + Bale Bot core 🚧
- premium responsive RTL UI
- dashboard / family / games / AI / profile
- Bale webhook and bot client
- moderation primitives
- XP / coin domain primitives

### Phase 2 — Data & family graph
- Supabase/Postgres schema
- family members, relationships, birthdays
- tasks, events, memories, polls

### Phase 3 — AI & voice
- conversational assistant
- voice input/output
- action tools for family data

### Phase 4 — Games & progression
- challenges, achievements, Family House, store

### Phase 5 — production hardening
- auth validation, rate limiting, audit logs, tests, observability, deployment

---

Brand direction: **warm global family + premium cosmic violet + friendly house-shaped AI companion**.
