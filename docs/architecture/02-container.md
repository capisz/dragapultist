# Container Diagram (C4-style)

```mermaid
flowchart LR
  User["Player"]
  PTCGL["PTCGL Logs"]
  Mongo["MongoDB"]
  FS["Server Filesystem\n/public/sprites"]
  Analytics["Vercel Analytics"]

  subgraph Dragapultist["Dragapultist (System Boundary)"]
    Electron["Electron Shell (optional)\nelectron/main.js + preload.js"]
    Web["Web Client (Next.js/React)\n- AuthHeader/Login/Signup\n- PokemonTCGAnalyzer tabs\n- StatisticsPage"]
    Parser["Domain Utilities\nutils/game-analyzer.ts\nutils/archetype-mapping.ts\nstatistics/statistics-utils.ts"]
    API["API Route Handlers (/api/*)\n- games(+id)\n- player-search\n- player-deck-breakdown\n- account/profile\n- pokemon-sprites\n- imports, players, prize-maps"]
    Actions["Server Actions\napp/actions.ts\n(cookie auth flows)"]
    Auth["Auth Module\n/auth.ts (NextAuth Credentials)\nlib/request-user.ts fallback"]
    DBLib["Data Access Layer\nlib/mongodb.ts + request-user helpers"]
  end

  User --> Web
  PTCGL -->|"manual paste"| Web
  PTCGL -->|"clipboard/log watcher"| Electron
  Electron -->|"window.dragapultist.onLogDetected"| Web

  Web -->|"client-side parsing/inference"| Parser
  Web -->|"fetch JSON"| API
  Web -->|"login/signUp/getUser/logout"| Actions
  Web -. "optional /api/auth path" .-> Auth
  Web -->|"telemetry"| Analytics

  API -->|"uses parsing/stat helpers"| Parser
  API --> DBLib
  Actions --> DBLib
  Auth --> DBLib
  API -->|"sprite search list"| FS
  DBLib --> Mongo
```

## Legend

- **System Boundary**: Internal Dragapultist containers.
- **Container node**: A deployable/runtime module.
- **Solid arrow**: Primary runtime flow.
- **Dashed arrow**: Optional/fallback integration path.
