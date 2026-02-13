# Farmit.ai — FieldLog V2

Voice-to-structured agricultural compliance records with validation and exports.

## Run

1. Install dependencies

```bash
npm install
```

2. Start infra (requires Docker)

```bash
docker compose up -d
```

3. Run migrations + seed catalog

```bash
npm run migrate
npm run seed:catalog
```

4. Start app

```bash
npm run dev
```

## Key pages

- `/fieldlog` voice capture + parse + finalize
- `/settings/farm` farm, fields, users
- `/records` list and filter records
- `/records/:id` detail + export links

## Parsing eval

```bash
npm run evals:parse
```
