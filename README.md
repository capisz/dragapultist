# Dragapultist

Dragapultist is a web app for analyzing **Pokémon TCG Live** game exports.

Players paste in their game logs, and Dragapultist turns those raw lines into something closer to **chess notation for Pokémon TCG** – a structured record of decisions that can be searched, compared, and learned from.

The goal is to make in-depth game review:

- **Consistent** – games follow a common structure  
- **Searchable** – you can look up patterns and matchups  
- **Shareable** – other players can learn from your decisions  

Instead of scribbling notes on paper or trying to remember every turn from memory, Dragapultist aims to make serious analysis feel as natural as using a modern app.

---

## ✨ What Dragapultist Does

Dragapultist is designed to bridge the gap between “I played a ton of games” and “I understand why my decisions matter.”

Key ideas:

- 📥 **Paste Pokémon TCG Live exports**  
  - Take the raw export text from Pokémon TCG Live and drop it into a structured interface.  

- 🔍 **Parse and structure game data**  
  - Transform unstructured text into something closer to notation: turns, decisions, key moments, and outcomes.  

- 📊 **Highlight decisions and turning points**  
  - Focus not just on win/loss, but *why* – tempo swings, missed lines, resource trades, prize races, etc.  

- 🧠 **Make game review repeatable**  
  - Help you review games systematically instead of relying on occasional “I remember that one game where…”  

- 🌐 **Lay groundwork for a shared database**  
  - Over time, the vision is to build a library of games and decisions that players can explore, similar to how chess players study grandmaster games.

Dragapultist is still early and evolving, but it’s built around one central idea:

> Take a complex, pen-and-paper process and make it **simple, consistent, and powerful** with a computer.

---

## 🧠 How It Helps Players Improve

The app is meant to be a **training tool**, not just a log.

### 1. Turn games into structured data

Most Pokémon TCG improvement lives in vague impressions:

- “This matchup feels bad.”
- “I think I misplayed around turn 4.”
- “Maybe I should have benched another basic.”

Dragapultist encourages you to:

- Record **who played what** (decks, matchups, roles).
- Capture **what happened and when** (key decisions, turning points).
- Build a **history** of your games that you can revisit and filter.

### 2. Learn from patterns, not just results

Because the app focuses on decisions and key moments, you can start to ask better questions, such as:

- *In what kinds of positions do I lose tempo?*  
- *What lines do I consistently choose in certain matchups?*  
- *Are my losses mostly due to sequencing, resource management, or matchup selection?*

Over time, a structured record helps you:

- Spot recurring mistakes.
- Validate whether a matchup is really bad or just played poorly.
- Compare your choices to other players facing similar positions.

### 3. Move toward a universal “notation” for Pokémon TCG

In chess, **notation** lets players:

- Record games in a compact and consistent way.
- Replay games decades later.
- Build massive databases of high-level play.

Dragapultist is inspired by that idea for Pokémon TCG:

- A **unified format** for logging games.
- A way for teams, creators, and players to **share game data** easily.
- A foundation for **community-based learning**, not just isolated testing groups.

---

## 🧰 Tech Stack

Dragapultist is built with a modern web stack focused on developer productivity and strong typing.

Core tools and technologies:

- **React** – Component-based UI for a modular, interactive experience.  
- **Next.js** – Framework on top of React that handles routing, builds, and potential server-side logic.  
- **TypeScript** – Strong typing for safer and more maintainable front-end logic.  
- **CSS / SCSS / utility classes** – For layout, typography, and theme consistency across the app.  
- **Client-side parsing logic** – To interpret Pokémon TCG Live exports and present them in a structured way.

(Exact versions and additional libraries are listed in `package.json` within the repo.)

The stack is chosen so the app can:

- Evolve rapidly as the idea grows.
- Be deployed easily on platforms like Vercel.
- Stay maintainable as more analysis features are added.

---

## 🚀 Getting Started (Local Development)

These steps assume you’ve already cloned the repository from GitHub.

### 1. Install dependencies

Use `npm` or `yarn`:

```bash
npm install
# or
yarn

---

📎 Using the App

Here is a simple, repeatable workflow for using Dragapultist with your games:

Play a game on Pokémon TCG Live.

Finish the match as normal (ladder, casual, testing account, etc.).

Copy the game log / export text.

Use the in-game export feature or log view to copy the text representing the game.

This is usually the same text you might paste into a note or document if you were keeping your own records.

Open Dragapultist.

Go to your deployed instance (or http://localhost:3000 if running locally).

Paste the export into the input area.

The app will provide a text area where you can paste the entire game export.

Let the app parse and structure the game.

The parsing logic will attempt to break down the raw text into turns, actions, and key elements.

The goal is to turn the messy text into something that feels closer to an annotated replay.

Review the game using the UI.

Step through turns or phases in order.

Look for key decisions, missed lines, or critical swings.

Annotate or tag games as needed (depending on current feature set).

As the application evolves, the intended experience is:

Less time manually formatting or organizing the log.

More time actually thinking about your decisions and learning from your games.

Long-term vision for usage

As Dragapultist matures, a common workflow might look like:

Finish a block of testing games.

Paste or automatically sync exports into Dragapultist.

Flag particularly interesting or confusing games.

Review those games before tournaments or league challenges.

Compare your decisions with teammates or other players using the same dataset.
