import { pool } from "./client";

export type ActivityType = "spray" | "fertilizer" | "irrigation" | "harvest" | "labor" | "other";
export type FarmRole = "owner" | "manager" | "worker" | "auditor";

export async function createFarm(params: {
  userId: string;
  name: string;
  address?: string;
  state?: string;
}) {
  const farm = await pool.query(
    `INSERT INTO farms (user_id, name, address, state)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [params.userId, params.name, params.address ?? null, params.state ?? null],
  );

  await pool.query(
    `INSERT INTO farm_users (farm_id, user_id, role)
     VALUES ($1,$2,'owner')
     ON CONFLICT (farm_id, user_id) DO UPDATE SET role = excluded.role`,
    [farm.rows[0].id, params.userId],
  );

  return farm.rows[0];
}

export async function listFarmsForUser(userId: string) {
  const r = await pool.query(
    `SELECT f.*
     FROM farms f
     JOIN farm_users fu ON fu.farm_id = f.id
     WHERE fu.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );
  return r.rows;
}

export async function addFarmUser(params: { farmId: string; userId: string; role: FarmRole; invitedEmail?: string }) {
  const r = await pool.query(
    `INSERT INTO farm_users (farm_id, user_id, role, invited_email)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (farm_id, user_id) DO UPDATE SET role = excluded.role, invited_email = excluded.invited_email
     RETURNING *`,
    [params.farmId, params.userId, params.role, params.invitedEmail ?? null],
  );
  return r.rows[0];
}

export async function createField(params: {
  farmId: string;
  name: string;
  acreage: number;
  centroidLat?: number;
  centroidLon?: number;
  polygonGeojson?: unknown;
}) {
  const r = await pool.query(
    `INSERT INTO fields (farm_id, name, acreage, centroid_lat, centroid_lon, polygon_geojson)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [
      params.farmId,
      params.name,
      params.acreage,
      params.centroidLat ?? null,
      params.centroidLon ?? null,
      params.polygonGeojson ? JSON.stringify(params.polygonGeojson) : null,
    ],
  );
  return r.rows[0];
}

export async function listFields(farmId: string) {
  const r = await pool.query(`SELECT * FROM fields WHERE farm_id = $1 ORDER BY created_at DESC`, [farmId]);
  return r.rows;
}

export async function listCatalog() {
  const r = await pool.query(`SELECT * FROM product_catalog ORDER BY name ASC`);
  return r.rows;
}

export async function findCatalogCandidates(raw: string, limit = 5) {
  const normalized = raw.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const r = await pool.query(
    `SELECT *,
      CASE
        WHEN lower(name) = $1 THEN 100
        WHEN lower(name) LIKE '%' || $1 || '%' THEN 80
        WHEN EXISTS (SELECT 1 FROM unnest(coalesce(aliases, '{}')) a WHERE lower(a) LIKE '%' || $1 || '%') THEN 75
        ELSE 50
      END AS score
    FROM product_catalog
    WHERE lower(name) LIKE '%' || $1 || '%'
      OR EXISTS (SELECT 1 FROM unnest(coalesce(aliases, '{}')) a WHERE lower(a) LIKE '%' || $1 || '%')
    ORDER BY score DESC, name ASC
    LIMIT $2`,
    [normalized, limit],
  );
  return r.rows;
}

export async function getFieldById(fieldId: string) {
  const r = await pool.query(`SELECT * FROM fields WHERE id = $1`, [fieldId]);
  return r.rows[0] ?? null;
}

export async function createActivity(params: {
  farmId: string;
  fieldId?: string;
  type: ActivityType;
  occurredAt: string;
  createdBy: string;
  status: "draft" | "final";
  gpsLat?: number;
  gpsLon?: number;
  transcript?: string;
  data: unknown;
  finalizedAt?: string;
}) {
  const r = await pool.query(
    `INSERT INTO activities
      (farm_id, field_id, type, occurred_at, created_by, status, gps_lat, gps_lon, transcript, data, finalized_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      params.farmId,
      params.fieldId ?? null,
      params.type,
      params.occurredAt,
      params.createdBy,
      params.status,
      params.gpsLat ?? null,
      params.gpsLon ?? null,
      params.transcript ?? null,
      JSON.stringify(params.data),
      params.finalizedAt ?? null,
    ],
  );
  return r.rows[0];
}

export async function appendActivityEvent(activityId: string, eventType: string, payload: unknown) {
  await pool.query(
    `INSERT INTO activity_events (activity_id, event_type, payload) VALUES ($1,$2,$3)`,
    [activityId, eventType, JSON.stringify(payload)],
  );
}

export async function addExport(params: { farmId: string; kind: "activity_pdf" | "audit_pack_pdf" | "csv"; path: string; activityId?: string }) {
  const r = await pool.query(
    `INSERT INTO exports (activity_id, farm_id, kind, path)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [params.activityId ?? null, params.farmId, params.kind, params.path],
  );
  return r.rows[0];
}

export async function getActivity(activityId: string) {
  const r = await pool.query(`SELECT * FROM activities WHERE id = $1`, [activityId]);
  return r.rows[0] ?? null;
}

export async function getActivityEvents(activityId: string) {
  const r = await pool.query(`SELECT * FROM activity_events WHERE activity_id = $1 ORDER BY created_at ASC`, [activityId]);
  return r.rows;
}

export async function getActivityExports(activityId: string) {
  const r = await pool.query(`SELECT * FROM exports WHERE activity_id = $1 ORDER BY created_at DESC`, [activityId]);
  return r.rows;
}

export async function listActivities(params: { farmId: string; type?: string; fieldId?: string; from?: string; to?: string }) {
  const values: any[] = [params.farmId];
  const where = ["farm_id = $1"];
  if (params.type) {
    values.push(params.type);
    where.push(`type = $${values.length}`);
  }
  if (params.fieldId) {
    values.push(params.fieldId);
    where.push(`field_id = $${values.length}`);
  }
  if (params.from) {
    values.push(params.from);
    where.push(`occurred_at >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    where.push(`occurred_at <= $${values.length}`);
  }

  const r = await pool.query(
    `SELECT a.*, f.name AS field_name
     FROM activities a
     LEFT JOIN fields f ON f.id = a.field_id
     WHERE ${where.join(" AND ")}
     ORDER BY occurred_at DESC
     LIMIT 200`,
    values,
  );
  return r.rows;
}
