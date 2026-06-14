import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pexelsProgressPath = path.resolve(__dirname, '../src/data/_pexels_progress.json');
const foodsJsPath = path.resolve(__dirname, '../src/data/foods.js');

// Helper to delay execution
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Load foods and other exports from foods.js
// We read the file contents first to parse it, but we can also import it since we are in ES module mode
import { foods, categories, sortOptions, ageGroupOptions, availabilityOptions } from '../src/data/foods.js';

// Load Pexels progress cache
let pexelsProgress = {};
if (fs.existsSync(pexelsProgressPath)) {
  try {
    pexelsProgress = JSON.parse(fs.readFileSync(pexelsProgressPath, 'utf8'));
    console.log(`Loaded ${Object.keys(pexelsProgress).length} entries from Pexels progress cache.`);
  } catch (err) {
    console.error('Error reading Pexels cache:', err);
  }
}

const PEXELS_API_KEY = 'rwYXkEC58vaM4k0HD8Y6eeWY6CAGGcc77VEYreTy4lLc9f3d6Ki3EMsC';
const USDA_API_KEY = 'DEMO_KEY';

// Standard 26 micronutrients we care about (mapping keys)
const NUTRIENT_MAPPING = {
  vitaminA: { names: ['Vitamin A, RAE', 'Vitamin A, IU'], unit: 'mcg' },
  vitaminB6: { names: ['Vitamin B-6'], unit: 'mg' },
  vitaminB12: { names: ['Vitamin B-12'], unit: 'mcg' },
  vitaminC: { names: ['Vitamin C, total ascorbic acid'], unit: 'mg' },
  vitaminD: { names: ['Vitamin D (D2 + D3)', 'Vitamin D'], unit: 'mcg' },
  vitaminE: { names: ['Vitamin E (alpha-tocopherol)'], unit: 'mg' },
  vitaminK: { names: ['Vitamin K (phylloquinone)', 'Vitamin K'], unit: 'mcg' },
  thiamin: { names: ['Thiamin'], unit: 'mg' },
  riboflavin: { names: ['Riboflavin'], unit: 'mg' },
  niacin: { names: ['Niacin'], unit: 'mg' },
  pantothenicAcid: { names: ['Pantothenic acid'], unit: 'mg' },
  folate: { names: ['Folate, total', 'Folate, DFE', 'Folate, food'], unit: 'mcg' },
  choline: { names: ['Choline, total'], unit: 'mg' },
  calcium: { names: ['Calcium, Ca'], unit: 'mg' },
  iron: { names: ['Iron, Fe'], unit: 'mg' },
  magnesium: { names: ['Magnesium, Mg'], unit: 'mg' },
  phosphorus: { names: ['Phosphorus, P'], unit: 'mg' },
  potassium: { names: ['Potassium, K'], unit: 'mg' },
  zinc: { names: ['Zinc, Zn'], unit: 'mg' },
  copper: { names: ['Copper, Cu'], unit: 'mg' },
  manganese: { names: ['Manganese, Mn'], unit: 'mg' },
  selenium: { names: ['Selenium, Se'], unit: 'mcg' },
  iodine: { names: ['Iodine, I'], unit: 'mcg' },
  omega3: { names: ['omega-3', 'ALA', 'EPA', 'DHA', 'DPA'], unit: 'special' }
};

// Sleep helper function to prevent rate limits
async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`;
  const res = await fetch(url, {
    headers: { 'Authorization': PEXELS_API_KEY }
  });
  if (!res.ok) {
    throw new Error(`Pexels API error ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

async function searchUsda(query) {
  // First search Foundation / SR Legacy
  let url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=5`;
  let res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA API error ${res.status}: ${res.statusText}`);
  }
  let data = await res.json();
  if (data.foods && data.foods.length > 0) {
    return data.foods[0];
  }

  // Fallback to general search (Branded / Survey)
  url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&pageSize=5`;
  res = await fetch(url);
  if (!res.ok) {
    throw new Error(`USDA API error ${res.status}: ${res.statusText}`);
  }
  data = await res.json();
  return data.foods && data.foods.length > 0 ? data.foods[0] : null;
}

function extractNutrientValue(usdaFood, microKey) {
  const mapping = NUTRIENT_MAPPING[microKey];
  if (!mapping) return null;

  if (microKey === 'omega3') {
    let sumG = 0;
    const omega3Names = [
      '18:3 n-3', '20:5 n-3', '22:5 n-3', '22:6 n-3',
      'ALA', 'EPA', 'DPA', 'DHA',
      'PUFA 18:3 n-3', 'PUFA 20:5 n-3', 'PUFA 22:5 n-3', 'PUFA 22:6 n-3'
    ];
    usdaFood.foodNutrients.forEach(n => {
      const name = n.nutrientName.toLowerCase();
      if (omega3Names.some(o3 => name.includes(o3.toLowerCase()))) {
        if (n.unitName === 'G' || n.unitName === 'g') {
          sumG += n.value;
        } else if (n.unitName === 'MG' || n.unitName === 'mg') {
          sumG += n.value / 1000;
        }
      }
    });
    return sumG > 0 ? parseFloat((sumG * 1000).toFixed(2)) : null;
  }

  for (const name of mapping.names) {
    const nutrient = usdaFood.foodNutrients.find(n => n.nutrientName.toLowerCase() === name.toLowerCase());
    if (nutrient) {
      let val = nutrient.value;
      const unit = nutrient.unitName.toUpperCase();
      if (unit === 'UG' || unit === 'MCG' || unit === 'µG') {
        return parseFloat((val / 1000).toFixed(4));
      }
      if (unit === 'MG') {
        return parseFloat(val.toFixed(4));
      }
      if (unit === 'G') {
        return parseFloat((val * 1000).toFixed(4));
      }
      if (unit === 'IU') {
        if (microKey === 'vitaminA') {
          return parseFloat((val * 0.0003).toFixed(4)); // 1 IU = 0.3 mcg = 0.0003 mg
        }
        if (microKey === 'vitaminD') {
          return parseFloat((val * 0.000025).toFixed(6)); // 1 IU = 0.025 mcg = 0.000025 mg
        }
      }
      return parseFloat(val.toFixed(4));
    }
  }
  return null;
}

// Custom JS formatter to produce hand-written style foods.js
function formatObject(obj, indent = 2) {
  const spaces = ' '.repeat(indent);
  if (Array.isArray(obj)) {
    if (obj.every(x => typeof x === 'string' || typeof x === 'number')) {
      return '[' + obj.map(x => typeof x === 'string' ? `'${x}'` : x).join(', ') + ']';
    }
    return '[\n' + obj.map(x => spaces + '  ' + formatObject(x, indent + 2)).join(',\n') + '\n' + spaces + ']';
  }
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    const isMicros = keys.every(k => typeof obj[k] === 'number');
    if (isMicros && keys.length <= 12) {
      const parts = keys.map(k => `${k}: ${obj[k]}`);
      return `{ ${parts.join(', ')} }`;
    }
    const parts = keys.map(k => {
      const valStr = formatObject(obj[k], indent + 2);
      return `${spaces}  ${k}: ${valStr}`;
    });
    return '{\n' + parts.join(',\n') + ',\n' + spaces + '}';
  }
  if (typeof obj === 'string') {
    return `'${obj.replace(/'/g, "\\'")}'`;
  }
  return String(obj);
}

async function run() {
  console.log('--- Step 1: Align Existing Micronutrient Units (convert mcg to mg) ---');
  // Micronutrient keys to convert from mcg to mg if they are in the large range (> threshold)
  const mcgKeys = {
    selenium: 0.5,
    vitaminB12: 0.1,
    vitaminA: 10,
    folate: 1.0,
    vitaminD: 0.1,
    vitaminK: 1.0
  };

  let alignedCount = 0;
  foods.forEach(food => {
    if (food.micros) {
      Object.entries(mcgKeys).forEach(([key, threshold]) => {
        if (food.micros[key] !== undefined && food.micros[key] > threshold) {
          food.micros[key] = parseFloat((food.micros[key] / 1000).toFixed(6));
          alignedCount++;
        }
      });
    }
  });
  console.log(`Aligned ${alignedCount} micronutrient values to standard milligram unit.`);

  console.log('\n--- Step 2: Resolve Missing Micronutrients using USDA ---');
  let usdaEnrichedCount = 0;
  for (const food of foods) {
    const microCount = Object.keys(food.micros || {}).length;
    if (microCount < 10) {
      console.log(`Food "${food.name}" has only ${microCount} micronutrients. Querying USDA...`);
      try {
        const usdaFood = await searchUsda(food.name);
        if (usdaFood) {
          console.log(`Found matching USDA entry: "${usdaFood.description}" (ID: ${usdaFood.fdcId})`);
          // Extract remaining keys from the NUTRIENT_MAPPING that are not currently in food.micros
          let added = 0;
          for (const key of Object.keys(NUTRIENT_MAPPING)) {
            if (food.micros[key] === undefined) {
              const val = extractNutrientValue(usdaFood, key);
              if (val !== null && val > 0) {
                food.micros[key] = val;
                added++;
              }
            }
          }
          console.log(`Added ${added} new micronutrients from USDA to "${food.name}".`);
          usdaEnrichedCount++;
        } else {
          console.warn(`No USDA entry found for "${food.name}".`);
        }
      } catch (err) {
        console.error(`Error querying USDA for "${food.name}":`, err.message);
      }
      await sleep(1000); // Respect USDA limit
    }
  }
  console.log(`Enriched ${usdaEnrichedCount} foods with USDA nutrients.`);

  console.log('\n--- Step 3: Pexels Image Deduplication and Retrieval ---');
  // First, find all current image URLs to identify duplicates
  const imageUrlCounts = {};
  foods.forEach(f => {
    if (f.image) {
      imageUrlCounts[f.image] = (imageUrlCounts[f.image] || 0) + 1;
    }
  });

  // Track assigned Pexels IDs to ensure uniqueness
  const assignedPexelsIds = new Set();
  
  // First pass: register non-duplicate Pexels photo IDs as already used
  foods.forEach(f => {
    if (f.image && imageUrlCounts[f.image] === 1 && f.image.includes('pexels.com/photos/')) {
      const match = f.image.match(/photos\/(\d+)\//);
      if (match) {
        assignedPexelsIds.add(parseInt(match[1], 10));
      }
    }
  });
  console.log(`Registered ${assignedPexelsIds.size} already unique Pexels images.`);

  let pexelsUpdatedCount = 0;
  for (const food of foods) {
    const isDuplicate = imageUrlCounts[food.image] > 1;
    const isCached = pexelsProgress[food.id];
    const isPexels = food.image && food.image.includes('pexels.com');
    
    // We need to fetch if:
    // 1. Image is shared (duplicate)
    // 2. Not a Pexels image
    // 3. Not in cache and is duplicate
    if (isDuplicate || !isPexels || !isCached) {
      console.log(`Food "${food.name}" needs a unique image (current URL shared or invalid). Querying Pexels...`);
      let photos = [];
      try {
        // Try query 1: name + raw
        const query1 = `${food.name} raw`;
        console.log(`Querying: "${query1}"`);
        let res = await searchPexels(query1);
        photos = res.photos || [];

        // Fallback: try just the name
        if (photos.length === 0) {
          const query2 = food.name;
          console.log(`Fallback Querying: "${query2}"`);
          res = await searchPexels(query2);
          photos = res.photos || [];
        }

        // Fallback 2: try first word of the name
        if (photos.length === 0) {
          const query3 = food.name.split(' ')[0];
          console.log(`Fallback 2 Querying: "${query3}"`);
          res = await searchPexels(query3);
          photos = res.photos || [];
        }

        // Find the first unique photo
        let chosenPhoto = null;
        for (const photo of photos) {
          if (!assignedPexelsIds.has(photo.id)) {
            chosenPhoto = photo;
            break;
          }
        }

        // If no unique photo found in results, just take the first one returned
        if (!chosenPhoto && photos.length > 0) {
          chosenPhoto = photos[0];
        }

        if (chosenPhoto) {
          const cleanUrl = `https://images.pexels.com/photos/${chosenPhoto.id}/pexels-photo-${chosenPhoto.id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop`;
          
          // Update cache
          pexelsProgress[food.id] = {
            url: cleanUrl,
            pexels_id: chosenPhoto.id,
            query: food.name,
            photographer: chosenPhoto.photographer,
            alt: chosenPhoto.alt || ''
          };
          assignedPexelsIds.add(chosenPhoto.id);

          // Update food image URL
          food.image = cleanUrl;
          console.log(`Assigned unique photo ${chosenPhoto.id} by "${chosenPhoto.photographer}" to "${food.name}".`);
          pexelsUpdatedCount++;
        } else {
          console.warn(`No photos returned for "${food.name}".`);
        }
      } catch (err) {
        console.error(`Error fetching Pexels for "${food.name}":`, err.message);
      }
      await sleep(200); // Politeness delay
    }
  }

  // Save cache
  fs.writeFileSync(pexelsProgressPath, JSON.stringify(pexelsProgress, null, 2), 'utf8');
  console.log(`Saved Pexels progress cache to: ${pexelsProgressPath}`);

  console.log('\n--- Step 4: Write Updated Database back to foods.js ---');
  // Write back foods.js file
  const fileContent = `export const categories = ${formatObject(categories, 0)};

export const foods = ${formatObject(foods, 0)};

export const sortOptions = ${formatObject(sortOptions, 0)};

export const ageGroupOptions = ${formatObject(ageGroupOptions, 0)};

export const availabilityOptions = ${formatObject(availabilityOptions, 0)};
`;

  fs.writeFileSync(foodsJsPath, fileContent, 'utf8');
  console.log(`Successfully wrote database updates to: ${foodsJsPath}`);
  console.log('Enrichment process completed successfully!');
}

run().catch(console.error);
