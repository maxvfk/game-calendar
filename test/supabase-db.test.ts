import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL SQL/RLS execution in a WASM database. The local auth stub
// reproduces Supabase's auth.uid() JWT claim; no hosted project is involved.
const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const id = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const when = (n: number) => `2026-09-${String(n).padStart(2, "0")}T12:00:00.000Z`;
let aProfile: string, bProfile: string;

async function as(uid: string | null, fn: () => Promise<void>) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.exec(`set role ${uid === null ? "anon" : "authenticated"}`);
  try { await fn(); } finally { await db.exec("reset role"); }
}

async function apply(profile: string, rows: object[]) {
  const result = await db.query<{ reply: Array<{ mutationId: string; outcome: string }> }>(
    "select public.apply_profile_mutations($1::uuid, $2::jsonb) as reply",
    [profile, JSON.stringify(rows)],
  );
  return result.rows[0]!.reply;
}

const progress = (n: number, day: number, deleted = false, key = "opaque:event#2026-09-20") => ({
  kind: "progress", key, changedAt: when(day), mutationId: id(n), deleted,
  payload: deleted ? null : { status: "done", effort: null, daily: null, note: null },
});
const daily = (n: number, day: number, completed: boolean) => ({
  kind: "daily", key: { subjectId: "dailies:zzz", dayKey: "2026-09-20" },
  completed, changedAt: when(day), mutationId: id(n),
});
const ignored = (n: number, day: number, value: boolean) => ({
  kind: "ignored", key: "event:hidden", ignored: value,
  changedAt: when(day), mutationId: id(n),
});
const pref = (n: number, day: number, key: string, value: unknown, unset = false) => ({
  kind: "preference", key, value, unset, changedAt: when(day), mutationId: id(n),
});
const custom = (n: number, day: number, kind: "customGame" | "customEvent", deleted: boolean) => {
  const key = kind === "customGame" ? "mygame:test" : "myevent:abcdef";
  const payload = kind === "customGame"
    ? { id: key, name: "Test", hue: "#112233", at: when(18) }
    : { id: key, game: "mygame:test", title: "Test", type: "other", summary: null,
      startsAt: when(18), startPrecision: "exact", endsAt: when(29),
      endPrecision: "exact", repeat: null, at: when(18), updatedAt: when(day) };
  return { kind, key, deleted, payload: deleted ? null : payload,
    changedAt: when(day), mutationId: id(n) };
};

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${alice}'), ('${bob}');
  `);
  for (const file of [
    "20260925150000_account_sync_schema.sql", "20260925150100_account_sync_rpc.sql",
  ]) {
    await db.exec(await Bun.file(new URL(`../supabase/migrations/${file}`, import.meta.url)).text());
  }
});
afterAll(async () => { await db.close(); });

describe("S3 Supabase schema, grants and RLS", () => {
  test("all seven personal tables have RLS and profile-scoped child FKs", async () => {
    const result = await db.query<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity from pg_class
      where relnamespace = 'public'::regnamespace and relname = any($1::text[])
      order by relname
    `, [["profiles", "progress", "daily_marks", "ignored", "preferences", "custom_games", "custom_events"]]);
    expect(result.rows).toHaveLength(7);
    expect(result.rows.every((row) => row.relrowsecurity)).toBe(true);
  });

  test("anon cannot bootstrap, read, or apply mutations", async () => {
    await as(null, async () => {
      await expect(db.query("select public.ensure_default_profile()")).rejects.toThrow();
      await expect(db.query("select * from public.profiles")).rejects.toThrow();
      await expect(apply(alice, [progress(1, 20)])).rejects.toThrow();
    });
  });

  test("bootstrap is idempotent per owner and the partial index rejects a second default", async () => {
    await as(alice, async () => {
      const first = await db.query<{ id: string }>("select public.ensure_default_profile() as id");
      aProfile = first.rows[0]!.id;
      const again = await db.query<{ id: string }>("select public.ensure_default_profile() as id");
      expect(again.rows[0]!.id).toBe(aProfile);
    });
    await as(bob, async () => {
      bProfile = (await db.query<{ id: string }>("select public.ensure_default_profile() as id")).rows[0]!.id;
      expect(bProfile).not.toBe(aProfile);
    });
    await expect(db.query("insert into public.profiles(owner_id,is_default) values ($1,true)", [alice]))
      .rejects.toThrow();
  });

  test("direct writes are denied, reads are owner-scoped, and other-owner RPC is denied", async () => {
    await as(alice, async () => {
      expect(await apply(aProfile, [progress(2, 20)])).toEqual([
        { mutationId: id(2), outcome: "accepted" },
      ]);
      await expect(db.query(`insert into public.ignored
        (profile_id,event_id,ignored,changed_at,mutation_id)
        values ($1,'bypass',true,now(),$2)`, [aProfile, id(3)])).rejects.toThrow();
      await expect(db.query("delete from public.progress where profile_id=$1", [aProfile]))
        .rejects.toThrow();
    });
    await as(bob, async () => {
      const rows = await db.query("select * from public.progress");
      expect(rows.rows).toHaveLength(0);
      await expect(apply(aProfile, [progress(4, 21)])).rejects.toThrow();
      const own = await apply(bProfile, [progress(5, 20)]);
      expect(own[0]?.outcome).toBe("accepted");
    });
    await as(alice, async () => {
      const rows = await db.query("select * from public.progress");
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0]).toHaveProperty("profile_id", aProfile);
    });
  });
});

describe("conditional apply", () => {
  test("accepts exact replay and refuses stale or conflicting progress versions", async () => {
    await as(alice, async () => {
      const key = "opaque:event#2026-09-20";
      expect((await apply(aProfile, [progress(6, 22, true)]))[0]?.outcome).toBe("accepted");
      expect((await apply(aProfile, [progress(2, 20)]))[0]?.outcome).toBe("superseded");
      expect((await apply(aProfile, [progress(6, 22, true)]))[0]?.outcome).toBe("accepted");
      await expect(apply(aProfile, [{ ...progress(6, 22, false) }])).rejects.toThrow();
      const rows = await db.query<{ deleted: boolean }>(
        "select deleted from public.progress where profile_id=$1 and event_id=$2", [aProfile, key]);
      expect(rows.rows[0]?.deleted).toBe(true);
    });
  });

  test("daily untick, unignore, optional preference reset, and custom delete persist", async () => {
    await as(alice, async () => {
      const first = [daily(10, 19, true), ignored(11, 19, true),
        pref(12, 19, "knownGames", ["zzz"]), custom(13, 19, "customGame", false),
        custom(14, 19, "customEvent", false)];
      expect((await apply(aProfile, first)).every((r) => r.outcome === "accepted")).toBe(true);
      const later = [daily(15, 21, false), ignored(16, 21, false),
        pref(17, 21, "knownGames", null, true), custom(18, 21, "customGame", true),
        custom(19, 21, "customEvent", true)];
      expect((await apply(aProfile, later)).every((r) => r.outcome === "accepted")).toBe(true);
      expect((await apply(aProfile, first)).every((r) => r.outcome === "superseded")).toBe(true);
      expect((await db.query<{ completed: boolean }>("select completed from public.daily_marks")).rows[0]?.completed).toBe(false);
      expect((await db.query<{ ignored: boolean }>("select ignored from public.ignored")).rows[0]?.ignored).toBe(false);
      expect((await db.query<{ unset: boolean }>("select unset from public.preferences where key='knownGames'")).rows[0]?.unset).toBe(true);
      expect((await db.query<{ deleted: boolean }>("select deleted from public.custom_games")).rows[0]?.deleted).toBe(true);
      expect((await db.query<{ deleted: boolean }>("select deleted from public.custom_events")).rows[0]?.deleted).toBe(true);
    });
  });

  test("preference keys merge independently and equal-time tie-break uses mutation UUID", async () => {
    await as(alice, async () => {
      expect((await apply(aProfile, [pref(20, 20, "theme", "dark"),
        pref(21, 20, "region", "europe")])).map((r) => r.outcome)).toEqual(["accepted","accepted"]);
      expect((await apply(aProfile, [pref(22, 20, "theme", "light")]))[0]?.outcome).toBe("accepted");
      const rows = await db.query<{ key: string; value: string }>(
        "select key,value from public.preferences where key in ('theme','region') order by key");
      expect(rows.rows).toEqual([{ key: "region", value: "europe" }, { key: "theme", value: "light" }]);
      expect((await apply(aProfile, [pref(26, 20, "focusGame", null),
        pref(27, 20, "gameOrder", ["mygame:test", "retired-lane"]),
        pref(28, 21, "gameOrder", null, true)])).map((r) => r.outcome))
        .toEqual(["accepted", "accepted", "accepted"]);
      await expect(apply(aProfile, [pref(29, 22, "focusGame", null, true)])).rejects.toThrow();
    });
  });

  test("equal instant with a different offset uses UUID tie-break", async () => {
    await as(alice, async () => {
      const first = progress(40, 20, false, "event:offset");
      const laterId = { ...progress(41, 20, true, "event:offset"),
        changedAt: "2026-09-20T14:00:00.000+02:00" };
      expect((await apply(aProfile, [first, laterId]))[1]?.outcome).toBe("accepted");
      expect((await db.query<{ deleted: boolean }>(
        "select deleted from public.progress where event_id='event:offset'"))
        .rows[0]?.deleted).toBe(true);
    });
  });

  test("invalid preference pair and unknown kind fail atomically", async () => {
    await as(alice, async () => {
      await expect(apply(aProfile, [pref(23, 23, "theme", 123)])).rejects.toThrow();
      await expect(apply(aProfile, [pref(24, 23, "theme", "system"),
        { ...progress(25, 23), kind: "stranger" }])).rejects.toThrow();
      expect((await db.query<{ value: string }>("select value from public.preferences where key='theme'"))
        .rows[0]?.value).toBe("light");
    });
  });

  test("rejects missing payloads, reused versions and invalid batches", async () => {
    await as(alice, async () => {
      await expect(apply(aProfile, [{ ...progress(30, 23), payload: undefined }])).rejects.toThrow();
      await expect(apply(aProfile, [{ ...custom(31, 23, "customEvent", true), payload: undefined }]))
        .rejects.toThrow();
      await expect(apply(aProfile, [custom(32, 23, "customGame", false)])).resolves.toHaveLength(1);
      await expect(apply(aProfile, [custom(32, 24, "customGame", false)])).rejects.toThrow();
      await expect(db.query("select public.apply_profile_mutations($1::uuid, null::jsonb)",
        [aProfile])).rejects.toThrow();
      await expect(apply(aProfile, Array.from({ length: 101 }, (_, n) => ignored(100 + n, 23, true))))
        .rejects.toThrow();
    });
  });

  test("all child tables are invisible to the other owner, and cascade on auth deletion", async () => {
    await as(bob, async () => {
      for (const table of ["daily_marks", "ignored", "preferences", "custom_games", "custom_events"]) {
        const rows = await db.query(`select * from public.${table}`);
        expect(rows.rows).toHaveLength(0);
      }
    });
    await db.query("delete from auth.users where id=$1", [alice]);
    for (const table of ["profiles", "progress", "daily_marks", "ignored", "preferences", "custom_games", "custom_events"]) {
      const rows = await db.query<{ count: number }>(`select count(*)::integer as count from public.${table}`);
      expect(rows.rows[0]?.count).toBe(table === "profiles" || table === "progress" ? 1 : 0);
    }
  });
});
