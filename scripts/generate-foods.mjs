import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const usdaData = JSON.parse(fs.readFileSync(path.join(__dirname, 'usda-fetched.json'), 'utf-8'));
const foodsJsPath = path.join(__dirname, '..', 'src', 'data', 'foods.js');

const foodsModule = fs.readFileSync(foodsJsPath, 'utf-8');

// Extract current foods array as string
const match = foodsModule.match(/export const foods = ([\s\S]*?);\n\nexport const sortOptions/);
if (!match) { console.error('Could not parse foods.js'); process.exit(1); }

const currentFoods = eval('(' + match[1] + ')');
const usdaMap = {};
for (const u of usdaData) usdaMap[u.id] = u;

const updates = [];
const noUpdates = [];
const errors = [];

for (const food of currentFoods) {
  const u = usdaMap[food.id];
  if (!u || u.error) {
    noUpdates.push(food.id + (u?.error ? ` (error: ${u.error})` : ' (no USDA data)'));
    continue;
  }

  const changes = {};

  // Macros
  if (u.protein !== undefined && Math.abs(food.protein - u.protein) > 0.3) {
    changes.protein = { from: food.protein, to: u.protein };
  }
  if (u.fat !== undefined && Math.abs(food.fat - u.fat) > 0.2) {
    changes.fat = { from: food.fat, to: u.fat };
  }
  if (u.carbs !== undefined && Math.abs(food.carbs - u.carbs) > 0.2) {
    changes.carbs = { from: food.carbs, to: u.carbs };
  }
  if (u.fiber !== undefined && Math.abs((food.fiber || 0) - u.fiber) > 0.2) {
    changes.fiber = { from: food.fiber, to: u.fiber };
  }
  if (u.calories !== undefined && Math.abs(food.calories - u.calories) > 5) {
    changes.calories = { from: food.calories, to: u.calories };
  }

  // Micros
  const microChanges = {};
  if (u.micros && food.micros) {
    for (const [key, usdaVal] of Object.entries(u.micros)) {
      const currVal = food.micros[key];
      if (currVal === undefined && usdaVal !== undefined && usdaVal !== 0) {
        microChanges[key] = { from: 'missing', to: usdaVal };
      } else if (currVal !== undefined && usdaVal !== undefined) {
        const diff = Math.abs(currVal - usdaVal);
        const threshold = ['vitaminA','folate','vitaminB12','vitaminK','selenium','calcium','phosphorus','potassium','sodium','choline'].includes(key) ? 10 : 0.2;
        if (diff > threshold) {
          microChanges[key] = { from: currVal, to: usdaVal };
        }
      }
    }
    // Check for keys in current that USDA doesn't have (keep current values)
  }

  if (Object.keys(changes).length > 0 || Object.keys(microChanges).length > 0) {
    updates.push({ id: food.id, name: food.name, changes, microChanges });
  } else {
    noUpdates.push(`${food.id} (no changes needed)`);
  }
}

console.log(`=== Items needing updates: ${updates.length} ===`);
for (const u of updates) {
  console.log(`\n${u.name} (${u.id}):`);
  for (const [k, v] of Object.entries(u.changes)) {
    console.log(`  ${k}: ${v.from} -> ${v.to}`);
  }
  for (const [k, v] of Object.entries(u.microChanges)) {
    console.log(`  micros.${k}: ${v.from} -> ${v.to}`);
  }
}

console.log(`\n=== Items without updates: ${noUpdates.length} ===`);
for (const n of noUpdates) console.log(`  ${n}`);

// Now generate the corrected file
let output = foodsModule;

for (const u of updates) {
  const food = currentFoods.find(f => f.id === u.id);
  if (!food) continue;

  // Update macros
  for (const [key, val] of Object.entries(u.changes)) {
    const idx = output.indexOf(`id: '${u.id}'`);
    if (idx === -1) continue;
    const chunk = output.slice(idx, idx + 2000);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${escapedKey}:\\s*)${food[key]}(\\s*[,/]|\\s*$)`);
    const m = chunk.match(re);
    if (m) {
      const gi = idx + m.index + m[1].length;
      output = output.slice(0, gi) + val.to + output.slice(gi + (m[0].length - m[1].length));
      console.log(`  Applied ${key}: ${food[key]} -> ${val.to}`);
    } else {
      console.log(`  Could not find pattern for ${key}: ${food[key]}`);
    }
  }

  // Update micros
  for (const [key, val] of Object.entries(u.microChanges)) {
    const idx = output.indexOf(`id: '${u.id}'`);
    if (idx === -1) continue;
    const chunk = output.slice(idx, idx + 3000);
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (val.from === 'missing') {
      // Need to add new micronutrient
      // Find the last micro entry before closing
      const closeMatch = chunk.match(/(\s{4,6})(\w+):\s*[\d.]+\s*,[\s\S]*?\n(\s{4,6})\}/);
      if (closeMatch) {
        const indent = closeMatch[3];
        const insertPoint = idx + chunk.lastIndexOf('}');
        const newEntry = `\n${indent}${key}: ${val.to},`;
        output = output.slice(0, insertPoint) + newEntry + output.slice(insertPoint);
        console.log(`  Added micros.${key}: ${val.to}`);
      }
    } else {
      const origVal = food.micros[key];
      const re = new RegExp(`(${escapedKey}:\\s*)${origVal}([,\\}])`);
      const m = chunk.match(re);
      if (m) {
        const gi = idx + m.index + m[1].length;
        output = output.slice(0, gi) + val.to + output.slice(gi + m[2].length - 1);
        console.log(`  Applied micros.${key}: ${origVal} -> ${val.to}`);
      }
    }
  }
}

fs.writeFileSync(foodsJsPath, output, 'utf-8');
console.log(`\n✓ Written to foods.js`);
