// Vercel Function: turns a basket into a Stripe Checkout session.
// Lives outside src/ so the Astro site stays a plain static build with .html URLs.
import Stripe from 'stripe';
import storeData from '../src/data/store.json' with { type: 'json' };

const MAX_QUANTITY = 10;
const CURRENCY = 'usd';

const line = (stripeProductId, price, quantity, adjustable = true) => ({
  price_data: { currency: CURRENCY, product: stripeProductId, unit_amount: Math.round(Number(price) * 100) },
  quantity,
  ...(adjustable && { adjustable_quantity: { enabled: true, minimum: 1, maximum: MAX_QUANTITY } }),
});

// Exported so the checkout can be tested without calling Stripe.
export function buildSessionParams(requested, origin, destination = 'us') {
  // Amounts come from the catalogue on the server, never from the browser, so a tampered
  // basket cannot change what is charged. store.json is the single source of truth for price.
  const lineItems = [];
  let needsShipping = false;
  let personalizedCount = 0;

  for (const item of Array.isArray(requested) ? requested : []) {
    const product = storeData.products.find((candidate) => candidate.id === item?.id);
    if (!product?.stripeProductId || product.status !== 'available') continue;

    const unitAmount = Math.round(Number(product.price) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) continue;

    const quantity = Math.min(Math.max(Math.floor(Number(item.quantity) || 0), 1), MAX_QUANTITY);
    if (product.shipped) needsShipping = true;
    if (item.personalize && product.personalizable) personalizedCount += quantity;

    lineItems.push(line(product.stripeProductId, product.price, quantity));
  }

  if (lineItems.length === 0) return null;

  // One personalization charge per signed copy, as its own line so Jonah sees how many to sign.
  const personalization = storeData.personalization;
  if (personalizedCount > 0 && personalization?.stripeProductId) {
    lineItems.push(line(personalization.stripeProductId, personalization.price, personalizedCount, false));
  }

  // The buyer chooses US or international in the basket. Checkout then only accepts addresses in
  // that group's countries, so the chosen rate and the delivery address can never disagree.
  const international = destination === 'international';
  const zone = international ? storeData.shipping?.international : storeData.shipping?.us;

  return {
    mode: 'payment',
    line_items: lineItems,
    success_url: `${origin}/order-complete.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/betastore.html`,
    // A basket of downloads alone never asks for a postal address.
    ...(needsShipping && {
      shipping_address_collection: { allowed_countries: zone?.countries || ['US'] },
      // US prices include shipping, so that rate is $0 and checkout reads "Free".
      ...(zone?.rateId && { shipping_options: [{ shipping_rate: zone.rateId }] }),
    }),
    ...(personalizedCount > 0 && {
      custom_fields: [{
        key: 'personalization',
        label: { type: 'custom', custom: personalization.checkoutQuestion },
        type: 'text',
        text: { maximum_length: 100 },
        optional: false,
      }],
    }),
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY is not set on this deployment.');
    return response.status(503).json({ error: 'The store is not finished being set up yet.' });
  }

  const body = typeof request.body === 'string' ? safeParse(request.body) : request.body;
  const origin = request.headers.origin || `https://${request.headers.host}`;
  const params = buildSessionParams(body?.items, origin, body?.destination === 'international' ? 'international' : 'us');

  if (!params) {
    return response.status(400).json({ error: 'Your basket is empty.' });
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create(params);
    if (!session.url) {
      return response.status(502).json({ error: 'Stripe did not return a checkout page.' });
    }
    return response.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout failed', error);
    const message = error?.type === 'StripeInvalidRequestError'
      ? 'This item is not set up correctly in Stripe yet.'
      : 'Checkout could not be started.';
    return response.status(502).json({ error: message });
  }
}

function safeParse(value) {
  try { return JSON.parse(value); } catch { return {}; }
}
