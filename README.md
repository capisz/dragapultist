# Dragapultist

Dragapultist is a web app for analyzing **Pokémon TCG Live** game exports.

Players paste in their game logs, and Dragapultist turns those raw lines into something closer to **chess notation for Pokémon TCG** – a structured record of decisions that can be searched, compared, and learned from.

Ultimately, the goal is to make in-depth review of games as easy as clicking a link, instead of scribbling notes on paper or trying to remember every turn from memory.

---

## ✨ What Dragapultist Does

- 📥 **Paste Pokémon TCG Live exports** into a clean interface  
- 🔍 **Parse and structure game data** so you can see meaningful patterns  
- 📊 **Highlight decisions and turning points** (e.g. key plays, prize progression, tempo swings)  
- 🧠 **Make game review repeatable** – like replaying a chess game from notation  
- 🌐 **Lay groundwork for a shared database** of games and decisions that players can learn from

Dragapultist is still early and evolving, but it’s built around one core idea:

> Take something that’s tedious with pen and paper and make it simple, searchable, and sharable with a computer.

---

## 🧠 How It Helps Players Improve

The app is designed to help players:

- **Review games objectively** instead of relying on memory
- **Compare lines of play** (e.g. what actually happened vs. what you *could* have done)
- **Learn from others’ games** by looking at real, annotated logs
- **Build a personal library of matchups** and decisions over time

Long term, the vision is a **universal, shareable format** for Pokémon TCG games:

- Similar to how **chess notation** lets players replay and study games from decades ago
- A **database of real tournament games** that can be filtered by deck, matchup, or specific decisions
- A place where players can **learn from each other’s choices**, not just from decklists

---

## 🧰 Tech Stack

Dragapultist is built with a modern React / TypeScript stack:

- **Next.js** – React framework for the app shell and routing  
- **React + TypeScript** – strongly typed UI and logic  
- **Tailwind CSS / custom SCSS** – responsive layout and styling  
- **Client-side parsing** of Pokémon TCG Live export text

(Exact libraries and versions are in `package.json`.)

---

## 🚀 Getting Started

> These steps assume you’ve already cloned the repo.

### 1. Install dependencies

```bash
npm install
# or
yarn

npm run dev
# or
yarn dev

http://localhost:3000

You should see the Dragapultist interface and be able to paste in a Pokémon TCG Live export.

📎 Using the App

Open Pokémon TCG Live and finish a game

Copy the game log / export text (the same text you’d normally paste into a document)

Paste it into Dragapultist in the input area

Let the app parse and structure the game

Use the UI to step through turns, decisions, and key moments

As the project grows, the goal is to:

Save these games in a common, shareable format

Allow search / filter by deck, matchup, or turn pattern

Make it easy to review your own games or other players’ games just by loading an export

🗺️ Roadmap / Future Ideas

Some of the future directions for Dragapultist:

⚙️ Automatic export ingestion

Pull game logs directly from Pokémon TCG Live so players don’t have to remember to copy & paste after each game.

🧩 Richer parsing & annotation

Better recognition of sequences like setup turns, prize mapping, resource trade patterns, and tempo swings.

📚 Shared game database

Opt-in upload of anonymized or tagged game logs, so players can browse by archetype, matchup, or specific board states.

🔍 Search & filters

“Show me all games where Gardevoir ex beat Gholdengo”,
or “Show me games where players whiffed turn-2 evolution with X deck.”

📈 Player tools

Matchup stats, common decision points, and tools to compare “my line” vs “theoretical best line” for a given board state.

If any of these sound exciting, ideas and feedback are very welcome.

🤝 Contributing / Feedback

Right now Dragapultist is an evolving personal tool with a bigger vision.

If you:

have ideas for features

want to use it with your testing group

or are interested in the “Pokémon TCG notation” problem

feel free to open an issue or reach out via GitHub.

📄 License & Disclaimer

This project is open source. See the LICENSE file in this repository for details.

Not affiliated with or endorsed by The Pokémon Company, Creatures Inc., GAME FREAK inc., or Nintendo.
All Pokémon trademarks and images are the property of their respective owners; this project is a fan-made tool for players.
