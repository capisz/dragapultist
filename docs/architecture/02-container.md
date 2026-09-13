# Container Diagram (C4-style)

```mermaid
flowchart LR
  User["Player"]
  PTCGL["PTCGL Logs"]
  Mongo["MongoDB"]
  Firebase["Firebase Authentication\nSpark plan"]
  FS["Server Filesystem\n/public/sprites"]
  Analytics["Vercel Analytics"]

  subgraph Dragapultist["Dragapultist (System Boundary)"]
    Electron["Electron Shell (optional)\nelectron/main.js + preload.js"]
    Web["Web Client (Next.js/React)\n- AuthHeader/Login/Signup\n- PokemonTCGAnalyzer tabs\n- StatisticsPage"]
    Parser["Domain Utilities\nutils/game-analyzer.ts\nutils/archetype-mapping.ts\nstatistics/statistics-utils.ts"]
    API["API Route Handlers (/api/*)\n- games(+id)\n- player-search\n- player-deck-breakdown\n- account/profile\n- pokemon-sprites\n- imports, players, prize-maps"]
    Actions["Server Actions\napp/actions.ts\nguest choice + verified user read"]
    Auth["Auth Boundary\nFirebase ID token exchange\nHttpOnly session + CSRF/origin"]
    DBLib["Data Access Layer\nlib/mongodb.ts + request-user helpers"]
  end

  User --> Web
  PTCGL -->|"manual paste"| Web
  PTCGL -->|"clipboard/log watcher"| Electron
  Electron -->|"window.dragapultist.onLogDetected"| Web

  Web -->|"client-side parsing/inference"| Parser
  Web -->|"fetch JSON"| API
  Web -->|"guest/getUser"| Actions
  Web -->|"signup/login/logout"| Firebase
  Web -->|"ID token/session exchange"| Auth
  Auth -->|"verify/revoke"| Firebase
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
