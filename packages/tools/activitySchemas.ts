import { z } from "zod";

export const ActivityTypeSchema = z.enum(["spray", "fertilizer", "irrigation", "harvest", "labor", "other"]);

export const SprayLogSchema = z.object({
  applicator_name: z.string().min(1),
  product_name: z.string().min(1),
  epa_reg_no: z.string().min(1),
  rate_value: z.number().positive(),
  rate_unit: z.string().min(1),
  area_treated_acres: z.number().positive(),
  method: z.string().min(1),
  start_time: z.string().min(1),
  field_name: z.string().optional(),
  field_id: z.string().uuid().optional(),
  weather: z
    .object({
      wind_mph: z.number().optional(),
      temp_f: z.number().optional(),
      humidity_pct: z.number().optional(),
      precip_in: z.number().optional(),
    })
    .optional(),
});

export const FertilizerLogSchema = z.object({
  product_name: z.string().min(1),
  total_amount: z.number().positive(),
  unit: z.string().min(1),
  area_treated_acres: z.number().positive(),
  method: z.string().min(1),
});

export const IrrigationLogSchema = z.object({
  duration_minutes: z.number().positive(),
  method: z.string().min(1),
  estimated_inches: z.number().positive().optional(),
  estimated_gallons: z.number().positive().optional(),
});

export const HarvestLogSchema = z.object({
  crop: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  destination: z.string().optional(),
});

export const LaborLogSchema = z.object({
  task: z.string().min(1),
  duration_hours: z.number().positive(),
  worker_count: z.number().int().positive(),
});

export const ActivityDataSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("spray"), data: SprayLogSchema }),
  z.object({ type: z.literal("fertilizer"), data: FertilizerLogSchema }),
  z.object({ type: z.literal("irrigation"), data: IrrigationLogSchema }),
  z.object({ type: z.literal("harvest"), data: HarvestLogSchema }),
  z.object({ type: z.literal("labor"), data: LaborLogSchema }),
  z.object({ type: z.literal("other"), data: z.record(z.string(), z.any()) }),
]);

export const ParseOutputSchema = z.object({
  type: ActivityTypeSchema,
  occurred_at: z.string(),
  field: z
    .object({
      field_id: z.string().uuid().optional(),
      field_name: z.string().optional(),
    })
    .optional(),
  gps: z
    .object({
      lat: z.number().optional(),
      lon: z.number().optional(),
    })
    .optional(),
  entities: z
    .object({
      product_mention: z.string().optional(),
      applicator_name: z.string().optional(),
      crop: z.string().optional(),
    })
    .optional(),
  data: z.record(z.string(), z.any()),
  missing_fields: z.array(z.string()).default([]),
  confidence: z.record(z.string(), z.number().min(0).max(1)).default({}),
  normalization_notes: z.array(z.string()).default([]),
});

export type ParseOutput = z.infer<typeof ParseOutputSchema>;
