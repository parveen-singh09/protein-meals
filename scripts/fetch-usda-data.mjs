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

const AMINO_ACID_IDS = {
  501: 'tryptophan', 502: 'threonine', 503: 'isoleucine', 504: 'leucine',
  505: 'lysine', 506: 'methionine', 507: 'cystine', 508: 'phenylalanine',
  509: 'tyrosine', 510: 'valine', 511: 'arginine', 512: 'histidine',
  513: 'alanine', 514: 'asparticAcid', 515: 'glutamicAcid', 516: 'glycine',
  517: 'proline', 518: 'serine',
};

const ITEM_SEARCH = {
  'chicken-breast': 'Chicken, breast, broiler, meat only, raw',
  'turkey-breast': 'Turkey, all classes, breast, meat only, raw',
  'lean-ground-beef': 'Beef, ground, 90% lean meat / 10% fat, raw',
  'beef-sirloin': 'Beef, top sirloin, separable lean only, trimmed to 1/8" fat, raw',
  'pork-tenderloin': 'Pork, fresh, tenderloin, separable lean only, raw',
  'lamb-chop': 'Lamb, domestic, loin chop, separable lean only, raw',
  'bison': 'Bison, ground, raw',
  'chicken-thigh': 'Chicken, broiler, thigh, meat only, raw',
  'venison': 'Venison, deer, raw',
  'pork-chops': 'Pork, fresh, loin, center loin (chops), bone-in, separable lean only, raw',
  'beef-jerky': 'Beef jerky',
  'ground-turkey': 'Turkey, ground, 93% lean, raw',
  'beef-liver': 'Beef, liver, raw',
  'duck-breast': 'Duck, domesticated, breast, meat only, raw',
  'rabbit-meat': 'Rabbit, domestic, composite of cuts, raw',
  'veal-cutlet': 'Veal, leg (top round), separable lean only, raw',
  'goat-meat': 'Goat, raw',
  'chicken-liver': 'Chicken, liver, raw',
  'beef-brisket': 'Beef, brisket, flat half, separable lean only, trimmed to 1/8" fat, raw',
  'pork-shoulder': 'Pork, fresh, shoulder, blade, separable lean only, raw',
  'pork-belly': 'Pork, fresh, belly, raw',
  'turkey-thigh': 'Turkey, all classes, thigh, meat only, raw',
  'beef-tongue': 'Beef, tongue, raw',
  'lamb-shoulder': 'Lamb, domestic, shoulder, arm, separable lean only, raw',
  'cornish-hen': 'Cornish game hen, meat and skin, raw',
  'quail': 'Quail, meat only, raw',
  'goose': 'Goose, domesticated, meat only, raw',
  'chicken-gizzards': 'Chicken, gizzard, raw',
  'beef-heart': 'Beef, heart, raw',
  'salmon': 'Fish, salmon, Atlantic, wild, raw',
  'tuna': 'Fish, tuna, light, canned in water, drained solids',
  'shrimp': 'Crustaceans, shrimp, mixed species, raw',
  'cod': 'Fish, cod, Atlantic, raw',
  'tilapia': 'Fish, tilapia, raw',
  'sardines': 'Fish, sardine, Atlantic, canned in oil, drained solids with bone',
  'halibut': 'Fish, halibut, Atlantic and Pacific, raw',
  'scallops': 'Scallop, raw',
  'crab': 'Crustaceans, crab, blue, raw',
  'lobster': 'Crustaceans, lobster, northern, raw',
  'mackerel': 'Fish, mackerel, Atlantic, raw',
  'tuna-steak': 'Fish, tuna, yellowfin, raw',
  'clams': 'Mollusks, clam, mixed species, canned, drained solids',
  'trout': 'Fish, trout, rainbow, wild, raw',
  'haddock': 'Fish, haddock, raw',
  'catfish': 'Fish, catfish, channel, raw',
  'sea-bass': 'Fish, sea bass, mixed species, raw',
  'snapper': 'Fish, snapper, mixed species, raw',
  'swordfish': 'Fish, swordfish, raw',
  'octopus': 'Octopus, common, raw',
  'mussels': 'Mollusks, mussel, blue, raw',
  'oysters': 'Mollusks, oyster, eastern, raw',
  'anchovies': 'Fish, anchovy, European, canned in oil, drained solids',
  'eel': 'Fish, eel, raw',
  'mahi-mahi': 'Fish, mahi-mahi, raw',
  'squid': 'Squid, raw',
  'perch': 'Fish, perch, mixed species, raw',
  'barramundi': 'Barramundi, raw',
  'crayfish': 'Crustaceans, crayfish, mixed species, raw',
  'monkfish': 'Monkfish, raw',
  'eggs': 'Egg, whole, raw, fresh',
  'egg-whites': 'Egg, white, raw, fresh',
  'greek-yogurt': 'Yogurt, Greek, plain, nonfat',
  'cottage-cheese': 'Cheese, cottage, 1% milkfat',
  'mozzarella': 'Cheese, mozzarella, part skim milk',
  'parmesan': 'Cheese, parmesan, grated',
  'cheddar': 'Cheese, cheddar',
  'milk': 'Milk, reduced fat, fluid, 2% milkfat',
  'ricotta': 'Cheese, ricotta, part skim milk',
  'feta': 'Cheese, feta',
  'swiss-cheese': 'Cheese, swiss',
  'buttermilk': 'Milk, buttermilk, fluid',
  'heavy-cream': 'Cream, fluid, heavy whipping',
  'sour-cream': 'Sour cream, reduced fat',
  'cream-cheese': 'Cheese, cream',
  'goat-cheese': 'Cheese, goat, semisoft type',
  'blue-cheese': 'Cheese, blue',
  'gouda': 'Cheese, gouda',
  'havarti': 'Cheese, havarti',
  'provolone': 'Cheese, provolone',
  'monterey-jack': 'Cheese, monterey',
  'colby-cheese': 'Cheese, colby',
  'mascarpone': 'Cheese, mascarpone',
  'quark': 'Cheese, quark',
  'skyr': 'Yogurt, skyr',
  'kefir': 'Kefir, lowfat, plain',
  'duck-eggs': 'Egg, duck, whole, fresh, raw',
  'quail-eggs': 'Egg, quail, whole, fresh, raw',
  'powdered-milk': 'Milk, dry, nonfat, regular',
  'condensed-milk': 'Milk, canned, condensed, sweetened',
  'tofu': 'Tofu, raw, firm, prepared with calcium sulfate',
  'tempeh': 'Tempeh',
  'edamame': 'Edamame, frozen, prepared',
  'lentils': 'Lentils, mature seeds, cooked, boiled, without salt',
  'chickpeas': 'Chickpeas, mature seeds, cooked, boiled, without salt',
  'black-beans': 'Beans, black, mature seeds, cooked, boiled, without salt',
  'quinoa': 'Quinoa, cooked',
  'almonds': 'Nuts, almonds',
  'peanuts': 'Peanuts, dry-roasted, without salt',
  'peanut-butter': 'Peanut butter, natural, no salt',
  'walnuts': 'Nuts, walnuts, English',
  'cashews': 'Nuts, cashew nuts, dry roasted, without salt',
  'pistachios': 'Nuts, pistachio nuts, dry roasted, without salt',
  'hemp-seeds': 'Seeds, hemp seed, hulled',
  'chia-seeds': 'Seeds, chia seeds, dried',
  'seitan': 'Seitan',
  'pumpkin-seeds': 'Seeds, pumpkin and squash seed kernels, dried',
  'oats': 'Oats, rolled',
  'spinach': 'Spinach, cooked, boiled, drained, without salt',
  'broccoli': 'Broccoli, cooked, boiled, drained, without salt',
  'green-peas': 'Peas, green, cooked, boiled, drained, without salt',
  'sweet-corn': 'Corn, sweet, yellow, cooked, boiled, drained, without salt',
  'brussels-sprouts': 'Brussels sprouts, cooked, boiled, drained, without salt',
  'asparagus': 'Asparagus, cooked, boiled, drained',
  'mushrooms': 'Mushrooms, white, cooked, boiled, drained, without salt',
  'hummus': 'Hummus, commercial',
  'soy-milk': 'Soymilk, original',
  'nutritional-yeast': 'Nutritional yeast',
  'kidney-beans': 'Beans, kidney, all types, mature seeds, cooked, boiled, without salt',
  'sunflower-seeds': 'Seeds, sunflower seed kernels, dry roasted, without salt',
  'whey-protein': null,
  'soy-protein': null,
  'casein-protein': null,
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
  if (!res.ok) {
    console.error(`  API error: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.foods || [];
}

function isGoodMatch(usdaDesc, searchTerm) {
  const d = usdaDesc.toLowerCase();
  const s = searchTerm.toLowerCase();
  const sWords = s.split(/\s+/).filter(w => w.length > 2 && w !== 'raw' && w !== 'without' && w !== 'with' && w !== 'fresh' && w !== 'all' && w !== 'classes' && w !== 'mixed' && w !== 'species' && w !== 'salt');
  const matchCount = sWords.filter(w => d.includes(w)).length;
  if (matchCount === 0) return false;
  if (d.includes(s.slice(0, 20))) return true;
  return matchCount >= Math.min(3, sWords.length);
}

function calcCalories(protein, carbs, fat) {
  return roundTo(protein * 4 + carbs * 4 + fat * 9, 0);
}

async function fetchItem(id, searchTerm) {
  const results = await searchUSDA(searchTerm);
  if (!results || results.length === 0) return null;

  let best = null;
  let bestScore = -1;

  for (const r of results) {
    const d = r.description.toLowerCase();
    const s = searchTerm.toLowerCase();
    const sWords = s.split(/\s+/).filter(w => w.length > 2 && w !== 'raw' && w !== 'without' && w !== 'with' && w !== 'fresh' && w !== 'all' && w !== 'classes' && w !== 'mixed' && w !== 'species' && w !== 'salt');
    const matchCount = sWords.filter(w => d.includes(w)).length;
    const ratio = matchCount / sWords.length;
    if (ratio >= 0.5 && ratio > bestScore) {
      bestScore = ratio;
      best = r;
    }
  }

  if (!best && results[0]) {
    if (isGoodMatch(results[0].description, searchTerm)) {
      best = results[0];
    }
  }

  if (!best && results.length > 0) {
    const d = results[0].description.toLowerCase();
    const s = searchTerm.toLowerCase();
    const firstWord = s.split(/\s+/)[0];
    if (d.includes(firstWord)) {
      best = results[0];
    }
  }

  if (!best) return null;

  const n = best.foodNutrients || [];
  const protein = getVal(n, 1003);
  const fat = getVal(n, 1004);
  const carbs = getVal(n, 1005);
  const fiber = getVal(n, 1079);

  const micros = {};
  for (const [nid, field] of Object.entries(NUTRIENT_MAP)) {
    const v = getVal(n, parseInt(nid));
    if (v !== undefined) micros[field] = v;
  }

  const aminoAcids = {};
  let aaCount = 0;
  for (const [aaid, name] of Object.entries(AMINO_ACID_IDS)) {
    const v = getVal(n, parseInt(aaid));
    if (v !== undefined) {
      aminoAcids[name] = roundTo(v, 2);
      aaCount++;
    }
  }

  const vitA_iu = getVal(n, 1104);
  const vitA_rae = micros.vitaminA_rae;
  delete micros.vitaminA_rae;

  const vitA_val = vitA_rae !== undefined ? vitA_rae : (vitA_iu !== undefined ? roundTo(vitA_iu / 3.33, 0) : undefined);

  const finalMicros = {};
  const microOrder = ['vitaminA','vitaminC','vitaminD','vitaminE','vitaminK','thiamin','riboflavin','niacin','vitaminB6','folate','vitaminB12','pantothenicAcid','choline','calcium','iron','magnesium','phosphorus','potassium','sodium','zinc','copper','manganese','selenium'];

  for (const field of microOrder) {
    const keyInMap = field === 'vitaminA' ? null : field;
    if (field === 'vitaminA' && vitA_val !== undefined) {
      finalMicros.vitaminA = roundTo(vitA_val, 0);
    } else if (micros[field] !== undefined) {
      const decimals = ['vitaminA','folate','vitaminB12','vitaminK','selenium','calcium','phosphorus','potassium','sodium','choline'].includes(field) ? 0 : 2;
      finalMicros[field] = roundTo(micros[field], decimals);
    }
  }

  const result = {
    id,
    name: best.description,
    fdcId: best.fdcId,
    dataType: best.dataType,
    protein: protein !== undefined ? roundTo(protein, 1) : undefined,
    fat: fat !== undefined ? roundTo(fat, 2) : undefined,
    carbs: carbs !== undefined ? roundTo(carbs, 2) : undefined,
    fiber: fiber !== undefined ? roundTo(fiber, 1) : undefined,
    calories: undefined,
    micros: Object.keys(finalMicros).length > 0 ? finalMicros : undefined,
    aminoAcids: Object.keys(aminoAcids).length > 0 ? aminoAcids : undefined,
    aaCount,
  };

  if (result.protein !== undefined && result.fat !== undefined && result.carbs !== undefined) {
    result.calories = calcCalories(result.protein, result.carbs, result.fat);
  }

  return result;
}

async function main() {
  const resultsPath = path.join(__dirname, 'usda-fetched.json');
  const alreadyDone = new Set();
  let results = [];

  if (fs.existsSync(resultsPath)) {
    results = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
    for (const r of results) alreadyDone.add(r.id);
    console.log(`Loaded ${results.length} previously fetched items`);
  }

  const entries = Object.entries(ITEM_SEARCH);
  const skipped = [];
  const failed = [];

  for (let i = 0; i < entries.length; i++) {
    const [id, searchTerm] = entries[i];
    if (alreadyDone.has(id)) {
      console.log(`[${i + 1}/${entries.length}] ${id} (already done)`);
      continue;
    }
    if (!searchTerm) {
      skipped.push(id);
      console.log(`[${i + 1}/${entries.length}] ${id} (skipped - no search term)`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${entries.length}] ${id}: "${searchTerm}"... `);

    try {
      const data = await fetchItem(id, searchTerm);
      if (data) {
        const existingIdx = results.findIndex(r => r.id === id);
        if (existingIdx >= 0) results[existingIdx] = data;
        else results.push(data);
        console.log(`✓ FDC#${data.fdcId} (${data.dataType})`);
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      } else {
        console.log(`✗ No match found`);
        failed.push(id);
        const existingIdx = results.findIndex(r => r.id === id);
        if (existingIdx >= 0) results.splice(existingIdx, 1);
        results.push({ id, error: 'No match found' });
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
      }
    } catch (e) {
      console.log(`✗ Error: ${e.message}`);
      failed.push(id);
    }

    await sleep(300);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Fetched: ${results.filter(r => !r.error).length}/${entries.length}`);
  console.log(`Skipped (no USDA): ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (skipped.length > 0) console.log(`Skipped: ${skipped.join(', ')}`);
  if (failed.length > 0) console.log(`Failed: ${failed.join(', ')}`);

  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to scripts/usda-fetched.json`);
}

main().catch(console.error);
