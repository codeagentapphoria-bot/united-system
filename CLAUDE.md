# United Systems — Project Guardrails

## Migration Policy

**Migrations are owned by the developer. NEVER run or create migrations without explicit permission.**

- If a schema change requires a migration → describe the change and ask
- If asked to run `prisma migrate`, `prisma db push`, `npx prisma migrate`, `psql`, or any DB write operation → **STOP** and ask first
- If a broken migration is encountered → do not attempt to fix or roll back → report it and let the developer decide

## Scope

These rules apply to the entire `united-systems/` monorepo and all sub-projects.
