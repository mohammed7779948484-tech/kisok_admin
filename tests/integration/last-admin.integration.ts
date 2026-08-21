import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.SUPABASE_DB_URL;
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
if (!databaseUrl || !supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "SUPABASE_DB_URL, SUPABASE_URL, and SUPABASE_SECRET_KEY are required for the last-admin integration test.",
  );
}

const sql = postgres(databaseUrl, {
  max: 4,
  prepare: false,
  ssl: "require",
});
const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let firstAdminId = "";
let secondAdminId = "";

async function updateProfile(
  actorId: string,
  targetId: string,
  changes: Record<string, string | boolean>,
) {
  return sql.begin((transaction) =>
    transaction`
      select *
      from public.admin_update_profile(
        ${actorId}::uuid,
        ${targetId}::uuid,
        ${transaction.json(changes)}::jsonb
      )
    `,
  );
}

describe.sequential("last active administrator invariant", () => {
  beforeAll(async () => {
    const suffix = crypto.randomUUID();
    const [first, second] = await Promise.all([
      supabase.auth.admin.createUser({
        email: `last-admin-a-${suffix}@integration.invalid`,
        password: `${crypto.randomUUID()}Aa1!`,
        email_confirm: true,
      }),
      supabase.auth.admin.createUser({
        email: `last-admin-b-${suffix}@integration.invalid`,
        password: `${crypto.randomUUID()}Aa1!`,
        email_confirm: true,
      }),
    ]);
    if (first.error || second.error || !first.data.user || !second.data.user) {
      throw first.error ?? second.error ?? new Error("Temporary Auth users were not created.");
    }
    firstAdminId = first.data.user.id;
    secondAdminId = second.data.user.id;
    const updated = await sql<{ id: string }[]>`
      insert into public.profiles (id, display_name, role, is_active)
      values
        (${firstAdminId}::uuid, 'Integration Admin A', 'admin', true),
        (${secondAdminId}::uuid, 'Integration Admin B', 'admin', true)
      returning id
    `;
    if (updated.length !== 2) {
      throw new Error(`Expected two temporary profiles, updated ${updated.length}.`);
    }
  });

  afterAll(async () => {
    if (firstAdminId && secondAdminId) {
      await sql`
        delete from public.profiles
        where id in (${firstAdminId}::uuid, ${secondAdminId}::uuid)
      `;
    }
    const deletions = await Promise.all([
      firstAdminId ? supabase.auth.admin.deleteUser(firstAdminId) : Promise.resolve(),
      secondAdminId ? supabase.auth.admin.deleteUser(secondAdminId) : Promise.resolve(),
    ]);
    for (const deletion of deletions) {
      if (deletion && "error" in deletion && deletion.error) {
        throw deletion.error;
      }
    }
    await sql.end({ timeout: 5 });
  });

  it("serializes concurrent deactivation attempts and preserves one active admin", async () => {
    const results = await Promise.allSettled([
      updateProfile(firstAdminId, secondAdminId, { is_active: false }),
      updateProfile(secondAdminId, firstAdminId, { is_active: false }),
    ]);
    const outcomes = results.map((result) =>
      result.status === "fulfilled"
        ? "fulfilled"
        : result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
      outcomes.join(" | "),
    ).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const active = await sql<{ id: string }[]>`
      select id from public.profiles
      where id in (${firstAdminId}::uuid, ${secondAdminId}::uuid)
        and role = 'admin' and is_active
    `;
    expect(active).toHaveLength(1);

    await expect(
      updateProfile(active[0].id, active[0].id, { is_active: false }),
    ).rejects.toThrow(/administrator access|active administrator/i);
    await expect(
      updateProfile(active[0].id, active[0].id, { role: "customer" }),
    ).rejects.toThrow(/administrator access|active administrator/i);
  }, 30_000);
});
