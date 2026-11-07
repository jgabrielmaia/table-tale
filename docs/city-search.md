# City search (API Ninjas)

The community form (create and Manage tab) offers a city search. Picking a result fills **city**, **country** (readable name in the app language) and **latitude/longitude**. **District** is not provided by the API and stays manual; every field stays editable.

## How it works

```
browser (signed-in user) --POST {query}--> Edge Function `city-search` --GET /v1/city?name=… + X-Api-Key--> API Ninjas
```

- The key (`API_NINJAS_KEY`) is a Supabase secret read by the function only. It is never in the bundle, the repository or the browser.
- The function requires a signed-in user, validates the query (2-60 characters, no control characters), caches answers per isolate (1 h), limits each user to 30 uncached lookups per minute, and returns `{ results: [{ name, country, latitude, longitude }] }` (`country` = ISO 3166 alpha-2). Upstream errors are mapped to `rate_limited` (429), `unavailable` (503) or `bad_response` (502) without leaking details.
- If the lookup fails, the form shows a short non-blocking note and keeps working with manual entry.

## API Ninjas facts (checked 2026-11-07, api-ninjas.com/api/city)

- `GET https://api.api-ninjas.com/v1/city`, header `X-Api-Key`, at least one of `name`/`country`/population/bounding box.
- Response: array of `{ name, latitude, longitude, country (ISO alpha-2), population, is_capital }`.
- **Free plan: `limit` and `offset` are premium only, so each request returns a single city** (the best match for `name`). The suggestion list therefore usually has one entry on the free plan. On a premium plan set `API_NINJAS_LIMIT` (2-30) to get several suggestions.
- Requests over the monthly quota are denied (nothing is billed beyond the plan).

## Setup (once per Supabase project)

```bash
npx supabase secrets set API_NINJAS_KEY=<your key>
# optional, premium plans only
npx supabase secrets set API_NINJAS_LIMIT=8
npx supabase functions deploy city-search --project-ref <ref>
```

Without the secret or the deployment the form still works by hand.
