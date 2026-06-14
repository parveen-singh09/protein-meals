const USDA_API_KEY = 'DEMO_KEY';
const fdcId = 171267; // Milk, 2%

async function run() {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Error: ${res.status}`);
    return;
  }
  const food = await res.json();
  console.log(`Food: "${food.description}"`);
  console.log(`Nutrients count: ${food.foodNutrients.length}`);
  
  // Print a few nutrients to see structure
  food.foodNutrients.slice(0, 10).forEach(n => {
    const name = n.nutrient.name;
    const value = n.amount; // In detail endpoint, amount is usually at root or under nutrient
    const unitName = n.nutrient.unitName;
    console.log(`  - ${name}: ${value} ${unitName}`);
  });
}

run();
