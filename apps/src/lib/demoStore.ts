import { randomUUID } from "node:crypto";

type Farm = { id: string; name: string; address?: string; state?: string; user_id: string; created_at: string };
type Field = { id: string; farm_id: string; name: string; acreage: number; centroid_lat?: number; centroid_lon?: number; created_at: string };
type Activity = {
  id: string;
  farm_id: string;
  field_id?: string;
  type: string;
  occurred_at: string;
  created_by: string;
  status: "draft" | "final";
  gps_lat?: number;
  gps_lon?: number;
  transcript?: string;
  data: unknown;
  created_at: string;
  finalized_at?: string;
};
type ActivityEvent = { id: string; activity_id: string; event_type: string; payload: unknown; created_at: string };
type ExportRow = { id: string; activity_id?: string; farm_id: string; kind: string; path: string; created_at: string };

type Store = {
  farms: Farm[];
  fields: Field[];
  activities: Activity[];
  events: ActivityEvent[];
  exports: ExportRow[];
  farmUsers: { farm_id: string; email: string; role: string; created_at: string }[];
};

const g = globalThis as unknown as { __farmitDemoStore?: Store };
if (!g.__farmitDemoStore) {
  g.__farmitDemoStore = { farms: [], fields: [], activities: [], events: [], exports: [], farmUsers: [] };
}
const store = g.__farmitDemoStore;

export function listFarms(userId: string) {
  return store.farms.filter((f) => f.user_id === userId);
}

export function createFarmDemo(userId: string, name: string, address?: string, state?: string) {
  const row: Farm = { id: randomUUID(), user_id: userId, name, address, state, created_at: new Date().toISOString() };
  store.farms.unshift(row);
  return row;
}

export function listFieldsDemo(farmId: string) {
  return store.fields.filter((f) => f.farm_id === farmId);
}

export function createFieldDemo(params: { farmId: string; name: string; acreage: number; centroidLat?: number; centroidLon?: number }) {
  const row: Field = {
    id: randomUUID(),
    farm_id: params.farmId,
    name: params.name,
    acreage: params.acreage,
    centroid_lat: params.centroidLat,
    centroid_lon: params.centroidLon,
    created_at: new Date().toISOString(),
  };
  store.fields.unshift(row);
  return row;
}

export function addFarmUserDemo(farmId: string, email: string, role: string) {
  const row = { farm_id: farmId, email, role, created_at: new Date().toISOString() };
  store.farmUsers.push(row);
  return row;
}

export function createActivityDemo(params: Omit<Activity, "id" | "created_at">) {
  const row: Activity = { ...params, id: randomUUID(), created_at: new Date().toISOString() };
  store.activities.unshift(row);
  return row;
}

export function addActivityEventDemo(activityId: string, eventType: string, payload: unknown) {
  const row: ActivityEvent = {
    id: randomUUID(),
    activity_id: activityId,
    event_type: eventType,
    payload,
    created_at: new Date().toISOString(),
  };
  store.events.push(row);
  return row;
}

export function addExportDemo(farmId: string, kind: string, path: string, activityId?: string) {
  const row: ExportRow = { id: randomUUID(), farm_id: farmId, kind, path, activity_id: activityId, created_at: new Date().toISOString() };
  store.exports.push(row);
  return row;
}

export function listActivitiesDemo(farmId: string) {
  return store.activities.filter((a) => a.farm_id === farmId);
}

export function getActivityDemo(activityId: string) {
  return store.activities.find((a) => a.id === activityId) ?? null;
}

export function getActivityEventsDemo(activityId: string) {
  return store.events.filter((e) => e.activity_id === activityId);
}

export function getActivityExportsDemo(activityId: string) {
  return store.exports.filter((e) => e.activity_id === activityId);
}
