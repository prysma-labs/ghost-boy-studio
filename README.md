# Ghost Boy

Five shared studio conversations. The Next.js app on Vercel stores nothing about which sandbox it calls in the browser. Each agent is the same Node service on its own exe.dev sandbox. `AGENT_ID` picks the system prompt.

## Live services

Supabase project `two-sigma` is in Prysma Labs (`us-west-1`). Studio chats live in the `studio` schema. The `public` research tables are not used. The five sandboxes are public on port 8000:

- https://ghostboy-director.exe.xyz
- https://ghostboy-designer.exe.xyz
- https://ghostboy-writer.exe.xyz
- https://ghostboy-musician.exe.xyz
- https://ghostboy-animator.exe.xyz

The website is deployed at https://two-sigma-eight.vercel.app (Prysma Labs project `two-sigma`). Vercel Authentication is on, so opening it requires a Vercel account that can access the project. Do not commit `.env.local` or `.secrets/`.

Model for all five agents: `deepseek/deepseek-v4.1-flash-1017`.

## Secrets

| Name | Where |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Vercel server env and each sandbox env file |
| `AGENT_SHARED_SECRET` | Vercel server env and each sandbox env file |
| `AGENT_URL_*` | Vercel server env only |
| `OPENROUTER_API_KEY` | Each sandbox env file only |
| `AGENT_ID`, `OPENROUTER_MODEL` | Each sandbox env file |

Copy `.env.example` to `.env.local` for the Next.js app. Never commit `.env`, `.env.local`, `agent/.env`, or `.secrets/`. The secret key and the shared secret must not use a `NEXT_PUBLIC_` name.

`studio.messages` and `studio.runs` have row level security and no policies, so the public Data API cannot read or write them. The servers use the secret key.

## Local

```bash
pnpm install
pnpm test
pnpm dev
```

```bash
cd agent
pnpm install
pnpm test
```

## Sandboxes

Each agent is a standalone exe.dev sandbox. Listen on `127.0.0.1:8000`. exe.dev proxies that port at `https://<name>.exe.xyz`. Make the share public so Vercel can call it, and keep `AGENT_SHARED_SECRET` on the request:

```bash
ssh exe.dev new --sandbox --name=<name>
ssh exe.dev share port <name> 8000
ssh exe.dev share set-public <name>
```

Copy `agent/` to `/opt/research-agent`, write `/opt/research-agent/.env` as mode 600, then run `sh install.sh`. systemd unit: `agent/research-agent.service`. A restart marks that sandbox's running row failed.

Sandbox names: `ghostboy-director`, `ghostboy-designer`, `ghostboy-writer`, `ghostboy-musician`, `ghostboy-animator`.

## Vercel

Put the server variables in the project environment, then deploy this directory. The browser polls `/api/agents/<id>` every 1.5 seconds only while that agent's latest run is `running`.
