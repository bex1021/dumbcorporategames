# autopilot-playtest — a shareable game-balance skill

A genre-agnostic framework that turns your AI coding agent into an automated game-balance tester. It builds a "robot" that plays your game thousands of times to prove whether it's **winnable, fair, and well-balanced** — and to find impossible levels or unreachable achievements that manual play almost never catches.

Everything the agent needs is in **`SKILL.md`**.

---

## Install it as a Claude skill (Claude Code or Claude.ai with Skills)

Drop the whole `autopilot-playtest/` folder into a skills directory:

- **Personal** (available in every project):
  `~/.claude/skills/autopilot-playtest/SKILL.md`
- **Project** (shared with your team via git):
  `<your-repo>/.claude/skills/autopilot-playtest/SKILL.md`

That's it — Claude auto-discovers skills in those folders. Then just ask naturally:

> "play-test my game" · "is this level fair?" · "can you beat it?" · "are all my achievements reachable?" · "tune the difficulty"

…and the skill triggers. (You can also invoke it explicitly: `/autopilot-playtest`.)

## Use it with any other LLM / agent

The skill body is self-contained instructions — it doesn't depend on Claude-specific features. If your agent has no skill system:

- **Paste the body** (everything *below* the `---` frontmatter block in `SKILL.md`) into the agent's system prompt or hand it over as a task brief, then point it at your game's repo.
- The frontmatter (`name` / `description`) is only used by Claude's auto-discovery — other agents can ignore it.

## What it does — and doesn't

- ✅ **Does:** prove fairness, winnability, content reachability, a healthy difficulty curve, and risk/reward balance — with hard numbers, via bots.
- ❌ **Doesn't:** judge whether the game is *fun*. That needs real humans. The skill says so and hands that part back to you.

## Requirements / assumptions

- Works best when your game's **rules can be separated from its rendering** (the skill walks the agent through extracting them if they aren't already). The core idea is engine-and-stack-agnostic.
- The concrete tooling tips assume a **JavaScript/TypeScript web game**, but the method applies to any stack — adapt the commands.

---

*Framework by Rebecca Leung. Free to use, share, and adapt.*
