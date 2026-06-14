import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load USDA fetched data
const usdaData = JSON.parse(fs.readFileSync(path.join(__dirname, 'usda-fetched.json'), 'utf-8'));
const usdaMap = {};
for (const u of usdaData) usdaMap[u.id] = u;

// Read current foods.js as text
const foodsJsPath = path.join(__dirname, '..', 'src', 'data', 'foods.js');
const content = fs.readFileSync(foodsJsPath, 'utf-8');

// Parse the current foods array
const foodsStart = content.indexOf('export const foods = [');
if (foodsStart === -1) { console.error('Could not find foods array'); process.exit(1); }

// Find the matching closing ]; for the array
let depth = 0;
let foodsEnd = -1;
for (let i = foodsStart; i < content.length; i++) {
  const ch = content[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) { foodsEnd = i; break; }
  }
}
if (foodsEnd === -1) { console.error('Could not find end of foods array'); process.exit(1); }

// Find the ; after the closing ]
const afterArray = content.indexOf(';', foodsEnd);
const headerEnd = foodsStart;
const arrayContent = content.slice(foodsStart, afterArray + 1); // Includes "export const foods = [...];"
const footerStart = afterArray + 1; // After the semicolon

const headerPart = content.slice(0, headerEnd);
const footerPart = content.slice(footerStart);

// Parse current foods using Function constructor (safer than eval)
const foodsMatch = arrayContent.match(/export const foods = (\[[\s\S]*\]);/);
if (!foodsMatch) { console.error('Could not parse foods array'); process.exit(1); }

const currentFoods = eval('(' + foodsMatch[1] + ')');

// Items that should NOT be updated from USDA
const skipItems = new Set([
  'whey-protein', 'soy-protein', 'casein-protein',
  'nutritional-yeast', 'barramundi', 'havarti', 'mascarpone', 'quark',
  'skyr', 'tofu',
]);

function cloneObj(o) { return JSON.parse(JSON.stringify(o)); }

const correctedFoods = [];
for (const food of currentFoods) {
  const corrected = cloneObj(food);

  if (skipItems.has(food.id) || !usdaMap[food.id] || usdaMap[food.id].error) {
    correctedFoods.push(food); // keep original
    continue;
  }

  const u = usdaMap[food.id];

  // Update macros
  if (u.protein !== undefined) corrected.protein = Math.round(u.protein * 10) / 10;
  if (u.fat !== undefined) corrected.fat = Math.round(u.fat * 100) / 100;
  if (u.carbs !== undefined) corrected.carbs = Math.round(u.carbs * 100) / 100;
  if (u.fiber !== undefined) corrected.fiber = Math.round(u.fiber * 10) / 10;
  if (u.calories !== undefined) corrected.calories = Math.round(u.calories);

  // Update micros
  if (u.micros) {
    for (const [key, val] of Object.entries(u.micros)) {
      corrected.micros[key] = val;
    }
  }

  correctedFoods.push(corrected);
}

// Apply researched supplement data (not from USDA)
const supplementData = {
  'whey-protein': {
    protein: 87, calories: 390, carbs: 1, fat: 0.5, fiber: 0,
    micros: { calcium: 550, potassium: 650, sodium: 280, iron: 1.5, phosphorus: 500, magnesium: 200, zinc: 8, copper: 0.8, manganese: 0.5, selenium: 15, choline: 200, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, thiamin: 0.5, riboflavin: 0.8, niacin: 3, vitaminB6: 0.5, folate: 20, vitaminB12: 0.5, pantothenicAcid: 2 },
    completeProtein: true, aminoAcids: 18, bioavailability: 100,
    description: 'Fast-digesting, complete protein ideal for post-workout recovery.',
  },
  'soy-protein': {
    protein: 88.3, calories: 335, carbs: 0, fat: 3.4, fiber: 0,
    micros: { calcium: 178, potassium: 81, sodium: 1005, iron: 14.5, phosphorus: 776, magnesium: 39, zinc: 4, copper: 1.6, manganese: 1.49, selenium: 1, choline: 191, thiamin: 0.18, riboflavin: 0.1, niacin: 1.44, vitaminB6: 0.1, folate: 176 },
    completeProtein: true, aminoAcids: 18, bioavailability: 98,
    description: 'Plant-based complete protein, comparable to whey in quality.',
  },
  'casein-protein': {
    protein: 80, calories: 360, carbs: 3, fat: 1.5, fiber: 0,
    micros: { calcium: 1500, potassium: 400, sodium: 250, iron: 1, phosphorus: 850, magnesium: 100, zinc: 4, copper: 0.3, manganese: 0.05, selenium: 20, choline: 150, vitaminA: 0, vitaminC: 0, vitaminD: 0, vitaminE: 0, vitaminK: 0, thiamin: 0.1, riboflavin: 0.6, niacin: 0.8, vitaminB6: 0.1, folate: 10, vitaminB12: 1, pantothenicAcid: 1.5 },
    completeProtein: true, aminoAcids: 18, bioavailability: 100,
    description: 'Slow-digesting dairy protein, ideal for nighttime recovery.',
  },
};

for (const [id, data] of Object.entries(supplementData)) {
  const f = correctedFoods.find(x => x.id === id);
  if (!f) continue;
  f.protein = data.protein;
  f.calories = data.calories;
  f.carbs = data.carbs;
  f.fat = data.fat;
  f.fiber = data.fiber;
  f.description = data.description;
  f.completeProtein = data.completeProtein;
  f.aminoAcids = data.aminoAcids;
  f.bioavailability = data.bioavailability;
  for (const [key, val] of Object.entries(data.micros)) {
    f.micros[key] = val;
  }
}

// Generate new array content with proper formatting
const microOrder = ['vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin','niacin','vitaminB6','folate','vitaminB12','pantothenicAcid','choline','calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium'];

function fmtNum(val, decimals) {
  if (val === undefined || val === null) return '0';
  const n = Math.round(val * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return String(n);
}

function fmtItem(f, idx) {
  const lines = [];
  const comma = idx < correctedFoods.length - 1 ? ',' : '';

  lines.push('  {');
  lines.push(`    id: '${f.id}',`);
  lines.push(`    name: '${f.name.replace(/'/g, "\\'")}',`);
  lines.push(`    category: '${f.category}',`);
  lines.push(`    protein: ${f.protein},`);
  lines.push(`    calories: ${f.calories},`);
  lines.push(`    carbs: ${f.carbs},`);
  lines.push(`    fat: ${f.fat},`);
  lines.push(`    fiber: ${f.fiber},`);
  lines.push(`    price: ${f.price},`);
  lines.push(`    priceUnit: '${f.priceUnit}',`);
  lines.push(`    serving: '${f.serving}',`);
  lines.push(`    ageGroups: ${JSON.stringify(f.ageGroups)},`);
  lines.push(`    availability: '${f.availability}',`);
  lines.push(`    image: '${f.image.replace(/'/g, "\\'")}',`);

  // micros
  if (f.micros) {
    lines.push('    micros: {');
    for (const key of microOrder) {
      if (f.micros[key] !== undefined) {
        const decimals = ['vitaminA','folate','vitaminB12','vitaminK','selenium','calcium','phosphorus','potassium','sodium','choline'].includes(key) ? 0 : 2;
        lines.push(`      ${key}: ${fmtNum(f.micros[key], decimals)},`);
      }
    }
    lines.push('    },');
  }

  lines.push(`    description: '${f.description.replace(/'/g, "\\'")}',`);
  lines.push(`    type: '${f.type}',`);
  lines.push(`    completeProtein: ${f.completeProtein},`);
  lines.push(`    aminoAcids: ${f.aminoAcids},`);
  lines.push(`    bioavailability: ${f.bioavailability},`);
  lines.push(`    tags: ${JSON.stringify(f.tags)},`);
  lines.push(`  }${comma}`);

  return lines.join('\n');
}

let newArray = 'export const foods = [\n';
for (let i = 0; i < correctedFoods.length; i++) {
  newArray += fmtItem(correctedFoods[i], i) + '\n';
}
newArray += '];';

// Build final output
const output = headerPart + newArray + '\n' + footerPart;

fs.writeFileSync(foodsJsPath, output, 'utf-8');

// Verify
console.log(`✓ Written ${correctedFoods.length} food items to foods.js`);
console.log(`  - ${correctedFoods.filter(f => !skipItems.has(f.id) && usdaMap[f.id] && !usdaMap[f.id].error).length} items updated from USDA`);
console.log(`  - ${correctedFoods.filter(f => skipItems.has(f.id) || !usdaMap[f.id] || usdaMap[f.id].error).length} items kept as-is`);

// Verify key items
const verifyKeys = ['chicken-breast', 'salmon', 'eggs', 'tofu', 'lentils', 'whey-protein'];
for (const id of verifyKeys) {
  const f = correctedFoods.find(x => x.id === id);
  if (f) console.log(`  ${f.name}: protein=${f.protein}, cal=${f.calories}, fat=${f.fat}, carbs=${f.carbs}`);
}
