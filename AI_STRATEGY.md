# AI Expansion & Sneak Peak Plan

## 1. Automated DCF Analysis (Current State vs. Future)
Currently, the DCF tool at `/analyse/dcf` uses **OpenAI directly** with raw FMP financials.
- **Is it okay?** Yes, for pure math.
- **Improvement:** Connect it to the **RAG System**.
- **Benefit:** The AI won't just say "The stock is cheap," but also "The stock is cheap, and recent earnings transcripts show management is planning a massive buyback (Source: FMP Transcripts)."

## 2. Superinvestor Sneak Peak (Growth Hack)
Convert the current "Lock" screen on investor pages into a trial experience.
- **Feature:** Show a single, pre-filled AI query: "What did [Investor] buy in the last 2 quarters?"
- **Trial:** allow 1 custom question for logged-in free users.
- **Upsell:** After 1 message, show a sleek "Unlock Unlimited Portfolio Deep-Dives" CTA.

## 3. New AI Integration Points
- **Insider Trading Dashboard:** Add an "AI Verdict" column that summarizes cluster buys.
- **Stock Detail Sidebar:** "Finclue AI Breakdown" - A 3-bullet summary of the bull/bear case.
- **Newsletter Automation:** Use AI to draft the "Weekly Superinvestor Recap" based on the RAG index.
