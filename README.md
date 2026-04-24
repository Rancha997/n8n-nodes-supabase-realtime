# n8n-nodes-supabase-realtime

[![npm](https://img.shields.io/npm/v/n8n-nodes-supabase-realtime)](https://www.npmjs.com/package/n8n-nodes-supabase-realtime)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What this node does

`n8n-nodes-supabase-realtime` is a community trigger node for [n8n](https://n8n.io) that listens to Supabase Realtime events on a specified Postgres table and fires an n8n workflow the moment a row is inserted, updated, or deleted. Unlike the built-in Supabase node (which only supports CRUD polling), this node opens a persistent WebSocket connection to Supabase Realtime so your workflow reacts to database changes in real time — no polling interval, no missed events during normal operation.

## Prerequisites

- An n8n instance (self-hosted or n8n Cloud).
- A Supabase project with **Realtime enabled** for the target table.  
  To enable: Supabase Dashboard → Table Editor → select your table → toggle **Realtime** on.  
  Alternatively, run the following SQL:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE your_table;
  ```
- A Supabase **anon** key (for tables with permissive RLS) or **service_role** key (to bypass RLS).

## Installation

In your n8n instance go to **Settings → Community Nodes → Install** and enter:

```
n8n-nodes-supabase-realtime
```

Or via the n8n CLI:

```bash
npm install n8n-nodes-supabase-realtime
```

## Credentials

Create a **Supabase Realtime API** credential with:

| Field       | Description                                                                |
|-------------|----------------------------------------------------------------------------|
| Project URL | Your Supabase project URL, e.g. `https://abc123.supabase.co`              |
| API Key     | `anon` key for public tables; `service_role` key to bypass Row Level Security |

## Node parameters

| Parameter                          | Type         | Default   | Description                                                                                                  |
|------------------------------------|--------------|-----------|--------------------------------------------------------------------------------------------------------------|
| Schema                             | String       | `public`  | The Postgres schema to listen on.                                                                            |
| Table                              | String       | —         | The table to listen on. Use `*` to listen on all tables in the schema.                                       |
| Events                             | Multi-select | `INSERT`  | One or more of `INSERT`, `UPDATE`, `DELETE`.                                                                 |
| Filter                             | String       | —         | Optional Supabase Realtime row filter, e.g. `status=eq.active`. Leave empty to receive all matching events. |
| Include Old Record on Update/Delete | Boolean      | `false`   | When enabled, the output includes the `old` record values. Requires `REPLICA IDENTITY FULL` (see below).    |

## Example output

An INSERT event on a `orders` table produces:

```json
{
  "eventType": "INSERT",
  "schema": "public",
  "table": "orders",
  "new": {
    "id": 42,
    "customer_id": 7,
    "status": "pending",
    "total": 149.99,
    "created_at": "2024-06-01T10:23:45.000Z"
  }
}
```

An UPDATE event with **Include Old Record** enabled:

```json
{
  "eventType": "UPDATE",
  "schema": "public",
  "table": "orders",
  "new": {
    "id": 42,
    "status": "shipped"
  },
  "old": {
    "id": 42,
    "status": "pending"
  }
}
```

## REPLICA IDENTITY FULL

By default, Postgres only includes the primary key in `old` values on UPDATE and DELETE. To receive the full previous row, run this in the Supabase SQL editor:

```sql
ALTER TABLE your_table REPLICA IDENTITY FULL;
```

Without this, `old` will only contain the row's primary key columns.

## Known limitations

- **Free tier:** Supabase limits free projects to 200 concurrent Realtime connections.
- **No event replay:** Events that occur while n8n is offline are not replayed when it reconnects. For guaranteed delivery, combine this trigger with a scheduled fallback poll (e.g. using the built-in Supabase node on a cron schedule) that checks for rows modified since the last execution.
- **Filter syntax:** Row filters use Supabase's Realtime filter syntax (`column=op.value`). Only equality-style filters are supported server-side; complex expressions must be handled in downstream n8n nodes.
- **DELETE payloads only include the primary key:** Even with `REPLICA IDENTITY FULL` set, Supabase's hosted Realtime server only sends the primary key in `old` for DELETE events — the full row is not available. This is a platform-level constraint, not a node limitation. If you need the full row on delete, use a **soft delete pattern**: add a `deleted_at timestamp` column to your table and UPDATE it instead of deleting the row. The UPDATE event will carry the full row in `new`, and nothing is permanently lost until you clean up manually.

  ```sql
  -- Add soft delete column
  ALTER TABLE your_table ADD COLUMN deleted_at timestamptz;

  -- Soft delete instead of DELETE
  UPDATE your_table SET deleted_at = now() WHERE id = 123;
  ```

## Testing locally

```bash
# In your n8n data directory
cd ~/.n8n
mkdir -p custom
cd custom
npm install /path/to/n8n-nodes-supabase-realtime

# Restart n8n
# The node should appear in the trigger node panel as "Supabase Realtime Trigger"
```

## License

MIT — see [LICENSE](LICENSE).
