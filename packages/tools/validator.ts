import type { ParseOutput } from "./activitySchemas";

type CatalogMatch = {
  name: string;
  restricted_use?: boolean;
  label_rate_min?: number | null;
  label_rate_max?: number | null;
  label_rate_unit?: string | null;
};

export function validateRequiredFields(activity: ParseOutput) {
  const requiredByType: Record<string, string[]> = {
    spray: [
      "data.applicator_name",
      "data.product_name",
      "data.epa_reg_no",
      "data.rate_value",
      "data.rate_unit",
      "data.area_treated_acres",
      "data.method",
      "occurred_at",
      "field.field_id|field.field_name",
    ],
    fertilizer: ["data.product_name", "data.total_amount", "data.unit", "data.area_treated_acres", "data.method", "occurred_at"],
    irrigation: ["data.duration_minutes", "data.method", "occurred_at"],
    harvest: ["data.crop", "data.quantity", "data.unit", "occurred_at"],
    labor: ["data.task", "data.duration_hours", "data.worker_count", "occurred_at"],
    other: ["occurred_at"],
  };

  const missing: string[] = [];
  const req = requiredByType[activity.type] ?? [];

  for (const key of req) {
    if (key === "field.field_id|field.field_name") {
      if (!activity.field?.field_id && !activity.field?.field_name) missing.push(key);
      continue;
    }

    const v = key.split(".").reduce<any>((acc, part) => (acc ? acc[part] : undefined), activity as any);
    if (v === undefined || v === null || v === "") missing.push(key);
  }

  return missing;
}

export function validateRanges(activity: ParseOutput, productCatalogMatch?: CatalogMatch | null, fieldAcreage?: number | null) {
  const flags: string[] = [];
  const hard_errors: string[] = [];

  const area = Number((activity.data as any).area_treated_acres);
  if (!Number.isNaN(area) && fieldAcreage && area > fieldAcreage * 1.2) {
    hard_errors.push(`area_treated_acres exceeds known field acreage (${fieldAcreage}).`);
  }

  if (activity.type === "spray") {
    const rateValue = Number((activity.data as any).rate_value);
    const rateUnit = String((activity.data as any).rate_unit ?? "");

    if (productCatalogMatch?.restricted_use) {
      flags.push("Product is marked restricted-use; confirm licensed applicator and permit context.");
    }

    if (
      productCatalogMatch?.label_rate_min != null &&
      productCatalogMatch?.label_rate_max != null &&
      !Number.isNaN(rateValue) &&
      rateValue > 0
    ) {
      if (productCatalogMatch.label_rate_unit && rateUnit && productCatalogMatch.label_rate_unit !== rateUnit) {
        flags.push(
          `Rate unit differs from catalog (${rateUnit} vs ${productCatalogMatch.label_rate_unit}); verify conversion manually.`,
        );
      } else if (rateValue < productCatalogMatch.label_rate_min || rateValue > productCatalogMatch.label_rate_max) {
        flags.push("Rate outside catalog label range; override reason is required to finalize.");
      }
    }

    if ((activity.data as any).epa_reg_no === "unknown") {
      flags.push("EPA registration number is unknown and must be confirmed before compliance use.");
    }
  }

  return { flags, hard_errors };
}
