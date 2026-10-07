import { getDb } from "./db";
export async function getProvinces(): Promise<any[]> {
  const db = await getDb();
  return db.select("SELECT * FROM provinces ORDER BY id");
}
export async function getDistricts(provinceId: number): Promise<any[]> {
  const db = await getDb();
  return db.select("SELECT * FROM districts WHERE province_id = ? ORDER BY name", [provinceId]);
}
export async function getLocalLevels(districtId: number): Promise<any[]> {
  const db = await getDb();
  return db.select("SELECT * FROM local_levels WHERE district_id = ? ORDER BY name", [districtId]);
}
export const NEPALI_MONTHS = ["Shrawan","Bhadra","Ashwin","Kartik","Mangsir","Poush","Magh","Falgun","Chaitra","Baisakh","Jestha","Ashadh"];
