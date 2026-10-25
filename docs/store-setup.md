# Store setup (Stripe)

The beta store lives at `/betastore`. It is not linked from the site, and it only sells what has
been set up in Stripe: a product with no `priceId` in `src/data/store.json` shows a disabled
button and cannot go in the basket.

## How it works

- The site stays a plain static build, so none of its pages changed.
- `api/checkout.js` is a single Vercel Function. The basket in the browser sends it only product
  IDs and quantities; the function looks up the Stripe price for each one and creates a Stripe
  Checkout session. **Prices are never taken from the browser**, so a tampered basket cannot
  change what is charged.
- Stripe hosts the payment page and collects the card and shipping address. Card details never
  touch this site.

## 1. Jonah creates the Stripe account (once)

Jonah has to own the account: it is tied to his bank account and his identity verification.

1. Register at https://dashboard.stripe.com/register with jonahkimcello@gmail.com.
2. Complete "Activate payments": legal name and address, what he sells, the bank account that
   receives payouts, and an ID check.
3. Settings → Business: set the statement descriptor (what buyers see on their card statement,
   e.g. JONAHCELLO) and a support email.
4. Settings → Team: invite Tyson, so he can set up products and read orders.

## 2. Build the catalogue in Stripe

Prices live in `src/data/store.json`, not in Stripe, and they **include US shipping**. Stripe only
needs one product per item, so the page and the charge can never disagree.

Do this in **Test mode** first.

1. Put the test secret key in a local `.env` file (it is gitignored and never committed):

       STRIPE_SECRET_KEY=sk_test_...

2. Create the products:

       node --env-file=.env scripts/stripe-seed.mjs

   It creates one Stripe product per sellable item plus the personalization add-on, writes the
   `prod_` IDs back into `store.json`, and is safe to re-run — items are matched on a metadata
   field, so nothing is duplicated.

3. Create two shipping rates by hand in Stripe (Settings → Shipping):
   - **$0**, named something like "Shipping included" — paste its `shr_` ID into `shipping.us.rateId`
   - **$20**, named "International shipping" — paste its ID into `shipping.international.rateId`

4. Repeat both steps in **Live mode** when the store opens; test and live objects are separate.

### How shipping works

US prices include postage, so the US rate is $0 and checkout displays "Free". International adds a
flat charge, chosen by the buyer in the basket. The checkout only accepts addresses in the country
list for whichever option they picked, so the rate charged and the address given always match.
A basket of downloads alone never asks for an address at all.

### Editing the catalogue

Everything is `src/data/store.json`:

- `price` — what the page shows and the card is charged.
- `status` — `available`, `out-of-stock` or `coming-soon`. Only `available` items can be bought,
  and the server refuses the rest even if someone forges a request.
- `shipped` — `false` for downloads.
- `personalizable` — offers the +$15 signed option, and asks at checkout who to make it out to.

New items need a Stripe product, so re-run the seed script after adding one.

## 3. Add the key to Vercel

In the Vercel project (jonahcello-site) → Settings → Environment Variables:

- Name: `STRIPE_SECRET_KEY`
- Value: the **test** secret key (`sk_test_…`) from Stripe → Developers → API keys
- Environments: Preview and Production

Redeploy afterwards so the function picks it up. The key lives only in Vercel; it is never in this
repo. If it ever leaks, roll it in Stripe and update it here.

## 4. Test before going live

With the test key in place, buy something on the preview URL using Stripe's test card
`4242 4242 4242 4242`, any future expiry date, and any CVC. Check that:

- the basket totals match the prices on the page,
- shipping options appear and the address is collected,
- the order shows up in the Stripe dashboard with the right items and address,
- the browser lands back on `/order-complete.html`.

## 5. Go live

1. Repeat step 2 in **Live mode** (products, prices, shipping rates are separate from test mode)
   and replace the IDs in `store.json` with the live ones.
2. Replace `STRIPE_SECRET_KEY` in Vercel with the live key (`sk_live_…`).
3. Place one real order and refund it, to confirm payouts reach Jonah's bank.
4. Decide sales tax. Stripe Tax can calculate and collect it, but it costs extra per transaction
   and Jonah must register where he owes it — worth asking his accountant.
5. Put the Store link back in the nav (`src/layouts/Base.astro`) and in `public/sitemap.xml`, and
   remove the preview banner from `src/pages/betastore.astro`.
