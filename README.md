# Super Vel Command Core V1

This is the rebuild using the stronger CapBlue Command Center style architecture.

## What changed

This build is not the old Python shell. It uses a Node/Express command-router style:

- Direct Answer Gate first
- CapBlue-style intent classifier
- simple Q&A that actually responds
- MXCL Runtime for real commands
- Master Law capture
- correction capture
- Draft Vault / Crowned Vault
- Crown command
- Multiply command
- optional OpenAI API brain
- local JSON memory

## Run

Windows:

```bat
run_super_vel.bat
```

Then open:

```text
http://127.0.0.1:10000
```

## Test

```text
what is 2 plus 2?
who are you?
what is MXCL?
what does Super Vel do?
Master Law: All Super Vel processing is based on MXCL.
Correction: Simple questions must answer directly before MXCL mode.
Super Vel, create the Reality-Tapping Bell Architecture Sheet using MXCL.
Crown this cycle
Multiply this cycle into the next cycle
```

## Optional AI Brain

Copy `.env.example` to `.env` and add:

```env
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4.1-mini
```

Do not paste API keys into chat.
