// Creates (or updates) one Stripe product per catalogue item, then writes the resulting
// product IDs back into src/data/store.json. Prices are NOT stored in Stripe: the site
// sends the amount from store.json at checkout, so there is only one place to edit.
//
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-seed.mjs
//
// Safe to re-run: items are matched by the `jonahcello_id` metadata field, so an existing
// product is updated rather than duplicated. Run it once against test keys and again
// against live keys when the store opens.
import { readFileSync, writeFileSync } from 'node:fs';
import Stripe from 'stripe';

const STORE = new URL('../src/data/store.json', import.meta.url);
const key = process.env.STRIPE_SECRET_KEY;

if (!key) {
  console.error('Set STRIPE_SECRET_KEY first. Nothing was changed.');
  process.exit(1);
}

const mode = key.startsWith('sk_live') || key.startsWith('rk_live') ? 'LIVE' : 'test';
const stripe = new Stripe(key);
const data = JSON.parse(readFileSync(STORE, 'utf8'));

// Items that can be bought, plus the personalization add-on.
const wanted = [
  ...data.products
    .filter((product) => product.status === 'available')
    .map((product) => ({
      ref: product,
      id: product.id,
      name: `${product.title} (${product.format})`,
      description: product.description || undefined,
    })),
  {
    ref: data.personalization,
    id: data.personalization.id,
    name: data.personalization.label,
    description: 'Signed and personalized by Jonah Kim.',
  },
];

console.log(`Stripe ${mode} mode — syncing ${wanted.length} products\n`);

const existing = new Map();
for await (const product of stripe.products.list({ limit: 100 })) {
  const ref = product.metadata?.jonahcello_id;
  if (ref) existing.set(ref, product);
}

for (const item of wanted) {
  const found = existing.get(item.id);
  const fields = { name: item.name, description: item.description, metadata: { jonahcello_id: item.id } };
  const product = found
    ? await stripe.products.update(found.id, fields)
    : await stripe.products.create(fields);

  item.ref.stripeProductId = product.id;
  console.log(`  ${found ? 'updated' : 'created'}  ${product.id}  ${item.name}`);
}

writeFileSync(STORE, `${JSON.stringify(data, null, 2)}\n`);
console.log('\nWrote product IDs into src/data/store.json.');
console.log('Still to do by hand: a $0 shipping rate in Stripe, with its shr_ ID in shipping.freeRateId.');
