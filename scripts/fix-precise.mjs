import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_KEY = 'JbCPGA3KJw6qwxozIWXDJxKYIYoK7Hbx627XzKDL';
const BASE = 'https://api.nal.usda.gov/fdc/v1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NUTRIENT_MAP = {
  1003: 'protein', 1004: 'fat', 1005: 'carbs', 1008: 'calories', 1079: 'fiber',
  1087: 'calcium', 1089: 'iron', 1090: 'magnesium', 1091: 'phosphorus',
  1092: 'potassium', 1093: 'sodium', 1095: 'zinc', 1098: 'copper',
  1101: 'manganese', 1103: 'selenium', 1106: 'vitaminA_rae', 1109: 'vitaminE',
  1114: 'vitaminD', 1162: 'vitaminC', 1165: 'thiamin', 1166: 'riboflavin',
  1167: 'niacin', 1170: 'pantothenicAcid', 1175: 'vitaminB6', 1177: 'folate',
  1178: 'vitaminB12', 1180: 'choline', 1185: 'vitaminK',
};

function roundTo(v, d) {
  if (v === undefined || v === null) return v;
  return Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchByFDC(fdcId) {
  const url = `${BASE}/food/${fdcId}?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

function parseFood(data) {
  const n = data.foodNutrients || [];
  const protein = n.find(x => x.nutrientId === 1003)?.value;
  const fat = n.find(x => x.nutrientId === 1004)?.value;
  const carbs = n.find(x => x.nutrientId === 1005)?.value;
  const fiber = n.find(x => x.nutrientId === 1079)?.value;

  const microsRaw = {};
  for (const [nid, field] of Object.entries(NUTRIENT_MAP)) {
    const v = n.find(x => x.nutrientId === parseInt(nid))?.value;
    if (v !== undefined) microsRaw[field] = v;
  }

  const vitA_iu = n.find(x => x.nutrientId === 1104)?.value;
  const vitA_rae = microsRaw.vitaminA_rae;
  delete microsRaw.vitaminA_rae;
  const vitA_val = vitA_rae !== undefined ? vitA_rae : (vitA_iu !== undefined ? roundTo(vitA_iu / 3.33, 0) : undefined);

  const finalMicros = {};
  const order = ['vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin','niacin','vitaminB6','folate','vitaminB12','pantothenicAcid','choline','calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium'];
  for (const field of order) {
    if (field === 'vitaminA' && vitA_val !== undefined) finalMicros.vitaminA = roundTo(vitA_val, 0);
    else if (microsRaw[field] !== undefined) {
      const d = ['vitaminA','folate','vitaminB12','vitaminK','selenium','calcium','phosphorus','potassium','sodium','choline'].includes(field) ? 0 : 2;
      finalMicros[field] = roundTo(microsRaw[field], d);
    }
  }

  return {
    protein: protein !== undefined ? roundTo(protein, 1) : undefined,
    fat: fat !== undefined ? roundTo(fat, 2) : undefined,
    carbs: carbs !== undefined ? roundTo(carbs, 2) : undefined,
    fiber: fiber !== undefined ? roundTo(fiber, 1) : undefined,
    calories: protein !== undefined && fat !== undefined && carbs !== undefined
      ? roundTo(protein * 4 + carbs * 4 + fat * 9, 0) : undefined,
    micros: Object.keys(finalMicros).length > 0 ? finalMicros : undefined,
  };
}

// Known good FDC IDs for items that need precise matching
const FDC_LOOKUPS = {
  'chickpeas': 173757,
  'beef-sirloin': 174055,
  'pork-shoulder': 168260,
  'duck-breast': 172410,
  'soy-milk': 172456,
  'nutritional-yeast': null,
  'seitan': 168147,
  'barramundi': null,
  'skyr': 2647437,
  'havarti': null,
  'mascarpone': null,
  'quark': null,
  'lean-ground-beef': 174030,
  'veal-cutlet': 175269,
  'beef-brisket': 168658,
  'cornish-hen': 171108,
  'sour-cream': 171257,
  'shrimp': 175179,
};

async function main() {
  const resultsPath = path.join(__dirname, 'usda-fetched.json');
  let results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  for (const [id, fdcId] of Object.entries(FDC_LOOKUPS)) {
    const existingIdx = results.findIndex(r => r.id === id && !r.error);
    if (existingIdx >= 0) results.splice(existingIdx, 1);

    if (fdcId === null) {
      results.push({ id, error: 'No match found' });
      console.log(`${id}: null (no FDC entry)`);
      continue;
    }

    process.stdout.write(`${id}: looking up FDC#${fdcId}... `);
    try {
      const data = await fetchByFDC(fdcId);
      if (!data) {
        results.push({ id, error: 'FDC lookup failed' });
        console.log('✗ Failed');
      } else {
        const parsed = parseFood(data);
        results.push({
          id,
          name: data.description,
          fdcId: data.fdcId,
          dataType: data.dataType,
          ...parsed,
          aaCount: 0,
        });
        console.log(`✓ "${data.description}"`);
      }
    } catch (e) {
      results.push({ id, error: e.message });
      console.log(`✗ ${e.message}`);
    }
    await sleep(400);
  }

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log('\nDone!');
}

main().catch(console.error);
