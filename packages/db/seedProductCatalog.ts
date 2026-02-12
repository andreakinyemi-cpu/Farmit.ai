import { pool } from "./client";

const rows = [
  ["ClearField Herbicide", "AgriNova", "EPA-FAKE-1001", "herbicide", false, 12, 30, 12, 32, "oz/acre", ["corn", "soybean"], ["clear field", "cf herb"]],
  ["RustGuard 480", "AgriNova", "EPA-FAKE-1002", "fungicide", false, 24, 14, 8, 16, "oz/acre", ["wheat", "barley"], ["rust guard"]],
  ["WeedStop Max", "GreenChem", "EPA-FAKE-1003", "herbicide", true, 48, 45, 10, 24, "oz/acre", ["cotton"], ["weed stop"]],
  ["MildewBlock S", "GreenChem", "EPA-FAKE-1004", "fungicide", false, 12, 7, 1, 3, "qt/acre", ["grape", "berry"], ["mildew block"]],
  ["NitroPlus 28-0-0", "SoilWorks", null, "fertilizer", false, null, null, 5, 30, "gal/acre", ["corn"], ["np 28"]],
  ["PhosBoost 10-34-0", "SoilWorks", null, "fertilizer", false, null, null, 3, 20, "gal/acre", ["corn", "soybean"], ["phos boost"]],
  ["YieldSure K", "SoilWorks", null, "fertilizer", false, null, null, 50, 300, "lb/acre", ["potato", "alfalfa"], ["ysk"]],
  ["InsectAway Pro", "CropDefend", "EPA-FAKE-1005", "insecticide", true, 24, 21, 4, 12, "oz/acre", ["vegetable"], ["insect away"]],
  ["LeafShield", "CropDefend", "EPA-FAKE-1006", "fungicide", false, 4, 3, 6, 18, "oz/acre", ["tomato", "pepper"], ["leaf shield"]],
  ["AquaWet Surfactant", "CropDefend", null, "adjuvant", false, null, null, 0.1, 1, "% v/v", null, ["aquawet"]],
  ["FieldClean Burndown", "TerraLine", "EPA-FAKE-1007", "herbicide", true, 24, 30, 16, 40, "oz/acre", ["fallow"], ["burndown"]],
  ["RootRise Bio", "TerraLine", null, "biological", false, null, null, 1, 4, "qt/acre", ["all"], ["root rise"]],
];

async function main() {
  for (const r of rows) {
    await pool.query(
      `INSERT INTO product_catalog
        (name, manufacturer, epa_reg_no, product_type, restricted_use, rei_hours, phi_days, label_rate_min, label_rate_max, label_rate_unit, allowed_crops, aliases)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
       WHERE NOT EXISTS (SELECT 1 FROM product_catalog WHERE name = $1)`,
      r,
    );
  }
  await pool.end();
  console.log(`Seeded ${rows.length} demo catalog products`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
