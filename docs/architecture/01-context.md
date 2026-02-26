# Context Diagram (C4-style)

```mermaid
flowchart TB
  Player["Player / Analyst"]
  PTCGL["Pokemon TCG Live\n(Log source)"]
  Mongo["MongoDB\n(users, games, imports)"]
  Vercel["Vercel Analytics"]
  Dragapultist["Dragapultist\n(Next.js web app + optional Electron shell)"]

  Player -->|"import logs, review stats, manage profile"| Dragapultist
  PTCGL -->|"exported game logs\n(copy/paste or watched files)"| Dragapultist
  Dragapultist -->|"read/write app data"| Mongo
  Dragapultist -->|"client analytics events"| Vercel
```

## Legend

- **System node**: A top-level actor or service in the environment.
- **Arrow**: Primary data or interaction flow.
- **Line label**: Purpose of the interaction.
