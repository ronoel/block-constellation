# Block Constellation 🎲✨

**Block Constellation** is a blockchain-based game built on Bitcoin via the Stacks network. It combines the unpredictability of Bitcoin block hashes with the mystique of constellations in a fair, decentralized daily draw. Players allocate sats (fractions of Bitcoin) to constellations, and once every 144 Bitcoin blocks, one is selected as the winner.

## 🔍 How It Works

- There are **25 constellations**, each representing a symbol in the game.
- Each game round lasts **144 Bitcoin blocks** (~1 day).
- The **hash of the last block** in the round determines the winning constellation.
- Players can **allocate sats** to any constellation during the round.
- After the final block is mined, the game checks which constellation matches the hash.
- The prize pool is **shared proportionally** among all players who chose the winning constellation.
- If no one selects the winning constellation, the prize is **rolled over** to the next round.
- Players have **5 days to claim their rewards**. Unclaimed rewards go to the game treasury.

## 🧠 Gameplay Example

1. You allocate 1,000 sats to Constellation #8.
2. Other players allocate sats across various constellations.
3. After 144 blocks, block hash determines a constellations.
4. All sats allocated to Constellation formed share the prize pool.
5. You claim your reward directly on-chain within 5 days.

## 💡 Features

- Fully decentralized logic using Stacks smart contracts.
- Daily participation cycle.
- Accumulating prize mechanism for unclaimed rounds.
- Transparent randomness derived from Bitcoin block hashes.
- Simple, intuitive interface for non-technical users.

## 📦 Tech Stack

- **Blockchain**: Stacks + Bitcoin
- **Smart Contracts**: Clarity
- **Frontend**: Angular
- **Currency**: sBTC (Bitcoin on Stacks)

