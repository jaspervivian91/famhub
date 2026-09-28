/**
 * Database row → safe JSON value coercion.
 *
 * Postgres drivers hand back `Date` objects and, for int8/numeric columns,
 * occasionally `bigint` — neither survives a `JSON.stringify` round trip or a
 * server-function boundary intact. This helper normalises them to strings.
 *
 * It walks the value **recursively and shape-preservingly**:
 *
 *  - `Date`    → ISO string
 *  - `bigint`  → string
 *  - `Array`   → a new array of coerced items (length and element types kept)
 *  - object    → a new plain object with coerced values
 *  - anything else → returned untouched
 *
 * The array branch is the whole point of this module. An earlier version only
 * had the object branch, so a jsonb array (`content.momentsToMention`) came
 * back as `{"0": …, "1": …}` with no `.length` — every `x.length > 0` guard
 * downstream then read false and the UI silently rendered nothing. Any future
 * rewrite of this function must keep arrays as arrays, at every depth, so that
 * `content.momentsToMention[0].name` still works.
 *
 * Callers: src/lib/api.ts, api-profile.ts, api-digest.ts, auth.ts.
 */
export function coerceRow<T>(row: T): T {
  return coerceValue(row) as T;
}

function coerceValue(val: unknown): unknown {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "bigint") return String(val);
  if (Array.isArray(val)) return val.map((item) => coerceValue(item));
  if (val !== null && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(val as Record<string, unknown>)) {
      out[key] = coerceValue(item);
    }
    return out;
  }
  return val;
}
