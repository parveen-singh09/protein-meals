import { foods } from '../src/data/foods.js';
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
  1101: 'manganese', 1103: 'selenium', 1106: 'vitaminA', 1109: 'vitaminE',
  1114: 'vitaminD', 1162: 'vitaminC', 1165: 'thiamin', 1166: 'riboflavin',
  1167: 'niacin', 1170: 'pantothenicAcid', 1175: 'vitaminB6', 1177: 'folate',
  1178: 'vitaminB12', 1180: 'choline', 1185: 'vitaminK',
};

const MACROS = ['protein', 'calories', 'carbs', 'fat', 'fiber'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function roundTo(v, d) { return v !== undefined ? Math.round(v * Math.pow(10, d)) / Math.pow(10, d) : v; }

function isGoodMatch(usdaDesc, ourName) {
  const d = usdaDesc.toLowerCase();
  const n = ourName.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, '').trim();

  const badWords = ['egg, white', 'emu', 'squash', 'chard', 'cherries', 'breadfruit', 'chanterelle', 'soy meal',
    'crab, blue', 'goat, raw', 'corned beef', 'sweetened condensed milk', 'cookies', 'cake', 'crackers'];

  for (const bw of badWords) {
    if (d.includes(bw)) return false;
  }

  const nameWords = n.split(/\s+/).filter(w => w.length > 2);
  const matchCount = nameWords.filter(w => d.includes(w)).length;

  if (matchCount === 0) return false;

  if (d.includes('raw') && !n.includes('raw') && !d.includes(n)) return true;
  if (d.includes(n)) return true;

  return matchCount >= Math.min(2, nameWords.length);
}

async function searchUSDA(query) {
  const url = `${BASE}/foods/search?api_key=${API_KEY}&query=${encodeURIComponent(query)}&pageSize=10&dataType=SR%20Legacy,Foundation&requireAllWords=false`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.foods || [];
}

function getVal(food, id) {
  const n = food.foodNutrients?.find(n => n.nutrientId === id);
  return n?.value;
}

async function verifyFood(foodItem) {
  let query = foodItem.name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (foodItem.category === 'meat' || foodItem.category === 'seafood') query = `raw ${query}`;

  const results = await searchUSDA(query);
  if (!results || results.length === 0) return { error: 'No results' };

  for (const r of results) {
    if (isGoodMatch(r.description, foodItem.name)) {
      const corrections = {};
      for (const macro of MACROS) {
        const nid = Object.keys(NUTRIENT_MAP).find(k => NUTRIENT_MAP[k] === macro);
        const uv = getVal(r, parseInt(nid));
        const ov = foodItem[macro];
        if (uv !== undefined && ov !== undefined) {
          const rd = roundTo(uv, macro === 'calories' ? 0 : 2);
          const th = macro === 'calories' ? 15 : 2;
          if (Math.abs(ov - rd) > th) {
            if (!corrections.macros) corrections.macros = {};
            corrections.macros[macro] = { from: ov, to: rd };
          }
        }
      }

      for (const [nidStr, field] of Object.entries(NUTRIENT_MAP)) {
        if (MACROS.includes(field)) continue;
        const uv = getVal(r, parseInt(nidStr));
        const ov = foodItem.micros?.[field];
        if (uv !== undefined && ov !== undefined) {
          const decimals = ['vitaminA', 'folate', 'vitaminB12', 'vitaminK', 'selenium', 'calcium', 'phosphorus', 'potassium', 'sodium', 'choline'].includes(field) ? 0 : 2;
          const rd = roundTo(uv, decimals);
          const th = decimals === 0 ? 15 : 0.3;
          if (Math.abs(ov - rd) > th) {
            if (!corrections.micros) corrections.micros = {};
            corrections.micros[field] = { from: ov, to: rd };
          }
        }
      }

      return { match: r.description, fdcId: r.fdcId, corrections };
    }
  }

  const fallback = results[0];
  if (isGoodMatch(fallback.description, foodItem.name)) {
    return verifyFood(foodItem);
  }

  return { error: `No good match. Best was "${fallback.description}"` };
}

async function main() {
  // First fix seitan bioavailability
  const rawPath = path.join(__dirname, '..', 'src', 'data', 'foods.js');
  let rawContent = fs.readFileSync(rawPath, 'utf-8');
  rawContent = rawContent.replace(
    /(id: 'seitan',\n[\s\S]*?bioavailability:\s*)\d+/,
    '$135'
  );
  fs.writeFileSync(rawPath, rawContent, 'utf-8');
  console.log('✓ Fixed seitan bioavailability: 80 → 35\n');

  const foodsCopy = JSON.parse(JSON.stringify(foods));
  // Also fix the copy for verification
  const seitan = foodsCopy.find(f => f.id === 'seitan');
  if (seitan) seitan.bioavailability = 35;

  console.log(`Verifying ${foodsCopy.length} food items...\n`);

  const corrections = [];
  const failed = [];

  for (let i = 0; i < foodsCopy.length; i++) {
    const f = foodsCopy[i];
    process.stdout.write(`[${i + 1}/${foodsCopy.length}] ${f.name}... `);

    try {
      const result = await verifyFood(f);
      if (result.error) {
        console.log(`⚠ ${result.error}`);
        failed.push(f.name);
        continue;
      }

      const mc = result.corrections.macros ? Object.keys(result.corrections.macros).length : 0;
      const mic = result.corrections.micros ? Object.keys(result.corrections.micros).length : 0;
      if (mc + mic > 0) {
        corrections.push({ name: f.name, id: f.id, match: result.match, corrections: result.corrections });
        console.log(`✓ ${mc + mic} corrections (matched: "${result.match}")`);
      } else {
        console.log(`✓ OK (matched: "${result.match}")`);
      }
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed.push(f.name);
    }

    await sleep(380);
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Good matches with corrections: ${corrections.length}`);
  console.log(`Failed to match: ${failed.length}`);
  console.log(`Total corrections: ${corrections.reduce((s, c) => {
    return s + Object.keys(c.corrections.macros || {}).length + Object.keys(c.corrections.micros || {}).length;
  }, 0)}`);

  console.log(`\n=== FAILED TO MATCH ===`);
  for (const f of failed) console.log(`  ${f}`);

  console.log(`\n=== CORRECTIONS ===`);
  for (const c of corrections) {
    console.log(`\n${c.name} (${c.id}): "${c.match}"`);
    if (c.corrections.macros) for (const [k, v] of Object.entries(c.corrections.macros)) console.log(`  ${k}: ${v.from} → ${v.to}`);
    if (c.corrections.micros) for (const [k, v] of Object.entries(c.corrections.micros)) console.log(`  micros.${k}: ${v.from} → ${v.to}`);
  }

  // Apply corrections
  console.log(`\n=== APPLYING CORRECTIONS ===`);
  for (const c of corrections) {
    const food = foodsCopy.find(f => f.id === c.id);
    if (!food) continue;

    if (c.corrections.macros) {
      for (const [key, val] of Object.entries(c.corrections.macros)) {
        const idx = rawContent.indexOf(`id: '${c.id}'`);
        if (idx === -1) continue;
        const chunk = rawContent.slice(idx, idx + 800);
        const re = new RegExp(`(${key}:\\s*)${food[key]}(\\s*[,/]|\\s*$)`);
        const m = chunk.match(re);
        if (m) {
          const gi = idx + m.index + m[1].length;
          rawContent = rawContent.slice(0, gi) + val.to + rawContent.slice(gi + m[2].length - 1);
        }
      }
    }

    if (c.corrections.micros) {
      const foodOrig = foods.find(f => f.id === c.id);
      if (!foodOrig) continue;
      for (const [key, val] of Object.entries(c.corrections.micros)) {
        const origVal = foodOrig.micros?.[key];
        if (origVal === undefined) continue;
        const idx = rawContent.indexOf(`id: '${c.id}'`);
        if (idx === -1) continue;
        const chunk = rawContent.slice(idx, idx + 2000);
        const re = new RegExp(`(${key}:\\s*)${origVal}([,}\\s])`);
        const m = chunk.match(re);
        if (m) {
          const gi = idx + m.index + m[1].length;
          rawContent = rawContent.slice(0, gi) + val.to + rawContent.slice(gi + m[2].length - 1);
        }
      }
    }
  }

  fs.writeFileSync(rawPath, rawContent, 'utf-8');
  console.log(`✓ Corrections applied to foods.js`);
  console.log(`\nDone!`);
}

main().catch(console.error);
