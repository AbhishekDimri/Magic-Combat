
# Arcane Clash — Magic Combination Combat Engine

A two-player browser game built on a data-driven rule engine where
no combination is universally superior — power comes from coherence.

## The core idea
Spells aren't classes. They're sets of tags (`heat`, `electric`, `void`).
Rules fire when tag combinations score above a threshold on a compatibility
matrix. Selecting everything deals ~9 damage. A focused 4-tag combo deals 40.

## Architecture
- **TagRegistry** — single source of truth for all tags and compatibility scores
- **RuleEngine** — declarative rules hydrated at runtime, scored not binary-matched
- **CoherenceEngine** — pairwise compatibility average × tag count penalty → base damage
- **EffectComposer** — four-phase modifier system (PRE_MOD → TRANSFORM → POST_MOD → FINALIZE) with diminishing returns on stacked multipliers
- **ResolutionPipeline** — stateless, authoritative, ready to move server-side for multiplayer
- **EventBus** — every rule trigger, misfire, and phase completion is instrumented

## Why scored conditions instead of boolean matching
`electric + liquid` compatibility is 0.85. `heat + liquid` is 0.45.
The same rule structure fires differently based on affinity — the matrix
drives activation, not hardcoded conditionals.

## Run it
Open `arcane_clash.html` in any modern browser. No build step.

