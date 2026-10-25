// Vercel Function: turns a basket into a Stripe Checkout session.
// Lives outside src/ so the Astro site stays a plain static build with .html URLs.
import Stripe from 'stripe';
import storeData from '../src/data/store.json' with { type: 'json' };

const MAX_QUANTITY = 10;

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
  const requested = Array.isArray(body?.items) ? body.items : [];

  // Prices come from the catalogue on the server, never from the browser, so a tampered
  // basket cannot change what is charged.
  const lineItems = [];
  for (const item of requested) {
    const product = storeData.products.find((candidate) => candidate.id === item?.id);
    if (!product?.priceId) continue;
    const quantity = Math.min(Math.max(Math.floor(Number(item.quantity) || 0), 1), MAX_QUANTITY);
    lineItems.push({
      price: product.priceId,
      quantity,
      adjustable_quantity: { enabled: true, minimum: 1, maximum: MAX_QUANTITY },
    });
  }

  if (lineItems.length === 0) {
    return response.status(400).json({ error: 'Your basket is empty.' });
  }

  const origin = request.headers.origin || `https://${request.headers.host}`;
  const shippingRates = (storeData.shipping?.rateIds || []).filter(Boolean);

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/order-complete.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/betastore.html`,
      shipping_address_collection: { allowed_countries: storeData.shipping?.countries || ['US'] },
      ...(shippingRates.length > 0 && {
        shipping_options: shippingRates.map((rate) => ({ shipping_rate: rate })),
      }),
    });

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
