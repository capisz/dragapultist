# Dragapultist – Pokémon TCG Analyzer & Training Tool

Dragapultist is a web app for Pokémon TCG players who want to **study their games like chess players study notation**.

Instead of relying on scattered notes, memories, or screenshots, Dragapultist aims to turn your games into **clean, structured data** you can review, share, and learn from.

> Think of it as bringing *chess notation energy* to Pokémon TCG – taking something that’s tedious on paper and making it fast, searchable, and useful with a computer.

---

## ✨ What this app is

Dragapultist is a **personal training and analysis tool** for Pokémon TCG.  
The core ideas:

- Help players **log their games and decisions** in a consistent format  
- Make it easier to **review lines, matchups, and patterns** over time  
- Build toward a **unified, community-driven database** of decisions and games

Right now it’s focused on **manual input & analysis**. The long-term goal is to make it feel as natural as copying a game from Pokémon TCG Live and pasting it into the app.

---

## 🔧 Tech Stack

This project is built with:

- **React / Next.js** – front-end framework
- **TypeScript** – for safer, typed components and utilities
- **Modern CSS / Tailwind** – for layout and styling
- (Optional / if applicable) **Pokémon TCG APIs (e.g. TCGdex, etc.)** – for card metadata and visuals

You can treat this app as a standard TypeScript + Next.js project: clone, install, run dev, deploy.

---

## 🎯 What Dragapultist is designed to help with

### 1. Turn your games into structured data

Most Pokémon TCG “analysis” lives in:

- half-remembered matchups  
- screenshots  
- random notes in a phone  
- vague feelings like “this matchup feels bad”

Dragapultist is trying to change that by giving you:

- A **consistent place to log games**
- Fields that encourage **notation-like thinking**: matchup, opening hands, key decisions, turning points, prize mapping, etc.
- A way to **look back** at your data instead of starting from zero each testing session

### 2. Help players actually improve (not just play more games)

The app is built to support questions like:

- *“What lines did I take that lost me tempo?”*  
- *“How does this deck actually perform into X over a large sample?”*  
- *“What do other players do in this matchup?”*  

The long-term vision is for Dragapultist to be a tool that:

- Encourages **reflection**, not just logging
- Shows patterns in your **decisions**, not just your win rate
- Makes it easy to **compare your choices** to what other players did in similar positions

### 3. Make the data **universal and shareable**

Long-term, Dragapultist aims to support:

- A **unified “notation” format** for Pokémon TCG games (similar to PGN in chess)
- A **shared database** of decisions and games (with privacy controls)
- A way for players to **learn from each other’s lines**, not just lists

Instead of everyone reinventing their own spreadsheet or notes system, Dragapultist wants to become a **common language** for game review.

---

## 🧠 Philosophy

Pokémon TCG players are already doing the hard part:

- Testing for hours  
- Thinking about lines  
- Trying to understand matchups

The problem is that **the data is trapped**:

- in your head  
- in Discord messages  
- scribbled somewhere in a notebook  
- in raw game exports that no one wants to parse by hand

Dragapultist’s goal is to:

> Take a difficult, paper-based thing and make it **simple and repeatable with a computer**.

If chess can have PGN and databases, Pokémon TCG deserves its own version.

---

## 🚧 Roadmap & Future Plans

Some ideas for where Dragapultist is heading:

### Short term

- Smoother **game logging flow** (fewer clicks, faster input)
- Better **matchup views** and filters
- Clearer visibility into **deck vs deck** performance and lines

### Medium term

- **Shared views** so players can optionally upload and browse community data
- Templates for common **practice drills** (e.g. specific matchup scenarios)
- More metadata pulled from card APIs to contextualize games

### Long term

- **Automated exporting from Pokémon TCG Live**  
  - The ideal future is: finish a game → copy/export → Dragapultist parses it for you.  
  - No more remembering to write down everything; the app fills in as much as possible and you focus on the **decision notes**.
- A **universal data format** for Pokémon TCG game logs, usable by:
  - players
  - teams
  - content creators
  - tools / other apps


---


## 🚀 Getting Started (Local Development)

If you want to run Dragapultist locally:

```bash
# Clone the repository
git clone https://github.com/capisz/dragapultist.git

cd dragapultist

# Install dependencies
npm install
# or
yarn

# Run the dev server
npm run dev
# or
yarn dev

Then open:
http://localhost:3000

---

## 🤝 Contributing / Feedback
Right now Dragapultist is an evolving personal tool with a bigger vision.


If you:

have ideas for features

want to use it with your testing group

or are interested in the “Pokémon TCG notation” problem

feel free to open an issue or reach out via GitHub.

---

## 📄 License
This project is open source.

