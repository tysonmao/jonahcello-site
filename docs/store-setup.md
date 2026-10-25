# Store setup (Stripe)

The beta store lives at `/betastore` and is not linked from the site. Each product's Buy button
turns on as soon as that product has a Stripe Payment Link in `src/data/store.json`.

## Why Payment Links

The site is static: there is no server, no database, and no secret keys in this repo. Stripe
Payment Links keep it that way. Stripe hosts the checkout page and handles card details, the
shipping address, receipts, and refunds. Nothing sensitive touches this site.

If the store later needs a basket holding several items at once, that needs a server endpoint, a
Stripe secret key stored in Vercel, and an Astro adapter. Worth doing only once the store earns it.

## What Jonah does (once)

Jonah has to own the Stripe account: it is tied to his bank account and his identity verification.

1. Create the account at https://dashboard.stripe.com/register using jonahkimcello@gmail.com.
2. Complete "Activate payments": legal name and address, what he sells, and the bank account that
   receives payouts. Stripe asks for ID.
3. Set the public details under Settings → Business: statement descriptor (what buyers see on their
   card statement, e.g. JONAHCELLO), support email, and a support address.
4. Invite Tyson under Settings → Team so he can add products and read orders.

## Creating a product link (per product)

In the Stripe Dashboard, with **Test mode** on while setting up:

1. Product catalog → Add product. Name it exactly as it appears on the site, set the price, and
   upload the cover image.
2. Payment Links → New → pick the product.
3. Under options, turn on:
   - **Collect shipping address** (physical items), limited to the countries Jonah ships to.
   - **Shipping rates** — add the flat rate(s) he charges.
   - **Let customers adjust quantity**.
   - **Limit the number of payments** if stock is finite.
4. Copy the link and paste it into the matching product's `checkout` field in
   `src/data/store.json`.
5. Repeat in **Live mode** once the test purchase works, and replace the test links with the live
   ones. Test links start with `https://buy.stripe.com/test_`; live ones do not.

## Before the store goes public

- Place one real purchase end to end and refund it.
- Confirm the order email reaches Jonah and that payouts are scheduled to his bank.
- Decide sales tax. Stripe Tax can calculate and collect it, but it must be switched on and Jonah
  must register where he has an obligation. Worth asking his accountant.
- Link the store from the nav again (it was removed when the old Squarespace store broke).
