const USDA_API_KEY = 'DEMO_KEY';

async function searchUsda(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(query)}&dataType=Foundation,SR%20Legacy&pageSize=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('API error');
  return await res.json();
}

const queries = [
  'Milk, reduced fat, fluid, 2% milkfat',
  'Milk, buttermilk, fluid',
  'kefir',
  'Cream, fluid, heavy whipping',
  'Soymilk, original',
  'Milk, condensed, sweetened'
];

async function run() {
  for (const q of queries) {
    console.log(`\nQuery: "${q}"`);
    try {
      const data = await searchUsda(q);
      const foods = data.foods || [];
      foods.forEach((f, idx) => {
        console.log(`  [${idx}] FDC ID: ${f.fdcId} | Description: "${f.description}" | DataType: ${f.dataType}`);
      });
    } catch (err) {
      console.error('  Error:', err.message);
    }
  }
}
run();
