Postgres seed loader
=====================

This script applies the `postgres_seed.sql` schema and loads the seed CSV files into a Postgres database using `psql` and `\copy` (client-side import).

## Tables Loaded

- `wildchat.country_daily_metrics` — aggregated metrics by country/language
- `wildchat.conversation_annotation` — conversation annotations and labels
- `wildchat.topic_cluster` — topic clustering results
- `wildchat.part_1` — new data form part 1 (8,134 rows)
- `wildchat.part_2` — new data form part 2 (8,134 rows)

The loader intentionally skips `wildchat.cleaned_wildchat` so the team seed stays focused on the new forms.

Usage
-----

1. Ensure `psql` is installed and reachable on your PATH.
2. Set connection environment variables as needed: `PGHOST`, `PGPORT`, `PGUSER`, and `PGPASSWORD` (or use `~/.pgpass`).
3. Run the loader from the repo root:

```bash
./scripts/load_postgres_seed.sh my_database_name
```

If no database name is given the script defaults to `wildchat`.

Notes
-----
- CSV files are expected under `seed_data_pg_test/postgres`.
- The loader uses `\copy`, which reads files from the client machine running the script.
- At the end, a summary of row counts per table is displayed for verification.
