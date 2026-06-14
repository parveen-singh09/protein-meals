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

function getVal(nutrients, id) {
  const n = nutrients?.find(n => n.nutrientId === id);
  return n?.value ?? undefined;
}

async function searchUSDA(query) {
  const url = `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=10&dataType=SR%20Legacy,Foundation&requireAllWords=false`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`  API error: ${res.status}`); return []; }
  const data = await res.json();
  return data.foods || [];
}

const FIXES = {
  'scallops': { search: 'Mollusks scallop mixed species raw' },
  'mahi-mahi': { search: 'Fish mahi-mahi coryphaena hippurus raw' },
  'chickpeas': { search: 'Chickpeas mature seeds cooked boiled without salt' },
  'havarti': { search: 'Cheese havarti' },
  'mascarpone': { search: 'Cheese mascarpone' },
  'quark': { search: 'Cheese quark' },
  'shrimp': { search: 'Crustaceans shrimp mixed species raw' },
  'turkey-breast': { search: 'Turkey whole breast meat only raw' },
  'pork-shoulder': { search: 'Pork fresh shoulder blade separable lean only raw' },
  'cornish-hen': { search: 'Cornish game hen meat only raw' },
  'duck-breast': { search: 'Duck domesticated breast meat only raw' },
  'sour-cream': { search: 'Sour cream cultured' },
  'soy-milk': { search: 'Soymilk original and vanilla fortified' },
  'nutritional-yeast': { search: 'Nutritional yeast vegetarian support' },
  'goat-cheese': { search: 'Cheese goat soft type' },
  'oysters': { search: 'Mollusks oyster eastern wild raw' },
  'anchovies': { search: 'Fish anchovy european canned in oil drained solids' },
  'lean-ground-beef': { search: 'Beef ground 90 percent lean meat raw' },
  'beef-sirloin': { search: 'Beef top sirloin separable lean only raw' },
  'veal-cutlet': { search: 'Veal leg top round separable lean only raw' },
  'beef-brisket': { search: 'Beef brisket flat half separable lean only raw' },
  'barramundi': { search: 'Barramundi fish raw' },
  'seitan': { search: 'Seitan wheat gluten' },
  'skyr': { search: 'Skyr yogurt nonfat' },
  'chicken-breast': { search: 'Chicken breast skinless boneless meat only raw' },
};

async function fetchWithFDC(fdcId) {
  const url = `${BASE}/food/${fdcId}?api_key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

async function fetchItem(id, searchTerm) {
  const results = await searchUSDA(searchTerm);
  if (!results || results.length === 0) {
    console.log(`  No results for "${searchTerm}"`);
    return null;
  }

  const r = results[0];
  const n = r.foodNutrients || [];
  const protein = getVal(n, 1003);
  const fat = getVal(n, 1004);
  const carbs = getVal(n, 1005);
  const fiber = getVal(n, 1079);

  const microsRaw = {};
  for (const [nid, field] of Object.entries(NUTRIENT_MAP)) {
    const v = getVal(n, parseInt(nid));
    if (v !== undefined) microsRaw[field] = v;
  }

  const vitA_iu = getVal(n, 1104);
  const vitA_rae = microsRaw.vitaminA_rae;
  delete microsRaw.vitaminA_rae;

  const vitA_val = vitA_rae !== undefined ? vitA_rae : (vitA_iu !== undefined ? roundTo(vitA_iu / 3.33, 0) : undefined);

  const finalMicros = {};
  const microOrder = ['vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin','niacin','vitaminB6','folate','vitaminB12','pantothenicAcid','choline','calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium'];

  for (const field of microOrder) {
    if (field === 'vitaminA' && vitA_val !== undefined) {
      finalMicros.vitaminA = roundTo(vitA_val, 0);
    } else if (microsRaw[field] !== undefined) {
      const decimals = ['vitaminA','folate','vitaminB12','vitaminK','selenium','calcium','phosphorus','potassium','sodium','choline'].includes(field) ? 0 : 2;
      finalMicros[field] = roundTo(microsRaw[field], decimals);
    }
  }

  return {
    id,
    name: r.description,
    fdcId: r.fdcId,
    dataType: r.dataType,
    protein: protein !== undefined ? roundTo(protein, 1) : undefined,
    fat: fat !== undefined ? roundTo(fat, 2) : undefined,
    carbs: carbs !== undefined ? roundTo(carbs, 2) : undefined,
    fiber: fiber !== undefined ? roundTo(fiber, 1) : undefined,
    calories: protein !== undefined && fat !== undefined && carbs !== undefined
      ? roundTo(protein * 4 + carbs * 4 + fat * 9, 0) : undefined,
    micros: Object.keys(finalMicros).length > 0 ? finalMicros : undefined,
    aaCount: 0,
  };
}

async function main() {
  const resultsPath = path.join(__dirname, 'usda-fetched.json');
  let results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  for (const [id, config] of Object.entries(FIXES)) {
    process.stdout.write(`Fixing ${id}: "${config.search}"... `);

    const existingIdx = results.findIndex(r => r.id === id);
    if (existingIdx >= 0 && !results[existingIdx].error) {
      // Remove old result (will be replaced)
      results.splice(existingIdx, 1);
    }

    try {
      const data = await fetchItem(id, config.search);
      if (data) {
        results.push(data);
        console.log(`✓ FDC#${data.fdcId} (${data.dataType}) "${data.name}"`);
      } else {
        results.push({ id, error: 'No match found' });
        console.log(`✗ No match`);
      }
    } catch (e) {
      results.push({ id, error: e.message });
      console.log(`✗ Error: ${e.message}`);
    }
    await sleep(400);
  }

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nDone! Results written to usda-fetched.json`);
}

main().catch(console.error);
