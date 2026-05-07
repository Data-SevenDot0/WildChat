Postgres seed loader
=====================

This script applies the `postgres_seed.sql` schema and loads CSV seed files into a Postgres database using `psql` and `\copy` (client-side import).

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
