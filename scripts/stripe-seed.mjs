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

// Shipping rates: $0 for the US (postage is already in the price) and a flat international rate.
const zones = [
  { key: 'us', zone: data.shipping.us, amount: 0, name: 'Shipping included' },
  { key: 'international', zone: data.shipping.international, amount: Math.round(Number(data.shipping.international.price) * 100), name: 'International shipping' },
];

const rates = [];
for await (const rate of stripe.shippingRates.list({ limit: 100, active: true })) rates.push(rate);

console.log('');
for (const { key, zone, amount, name } of zones) {
  const found = rates.find((rate) => rate.metadata?.jonahcello_zone === key);
  const rate = found ?? await stripe.shippingRates.create({
    display_name: name,
    type: 'fixed_amount',
    fixed_amount: { amount, currency: 'usd' },
    metadata: { jonahcello_zone: key },
  });
  zone.rateId = rate.id;
  console.log(`  ${found ? 'reused ' : 'created'}  ${rate.id}  ${name} ($${(amount / 100).toFixed(2)})`);
}

writeFileSync(STORE, `${JSON.stringify(data, null, 2)}\n`);
console.log('\nWrote product and shipping IDs into src/data/store.json.');
console.log(`These are ${mode} IDs — re-run with the live key before the store opens.`);
