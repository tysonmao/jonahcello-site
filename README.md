# jonahcello-site

Official site of cellist Jonah Kim: https://www.jonahcello.com

Built with [Astro](https://astro.build), which turns the files in `src/` into plain static HTML pages. The shared header, nav, and footer live in one file, and concert details live in one data file, so most edits happen in a single place.

## How it deploys

The repo is connected to Vercel. **Every push to `main` builds the site and publishes it within about a minute.** Pushes to any other branch get a private preview URL instead, which is the safer way to try out larger changes.

`www.jonahcello.com` is the main address; `jonahcello.com` forwards to it. If a push breaks the build, Vercel keeps the previous version live.

## Where things are

| Path | What it is |
|---|---|
| `src/data/events.json` | **Concerts.** Drives the Calendar page, the "Next performance" bar at the top of every page, the "Upcoming Concerts" section on the home page, and the search-engine event data. |
| `src/data/videos.json` | **Videos and recordings** on the Stream page, including which ones are featured. |
| `src/pages/*.astro` | One file per page (`index.astro` is Home, `404.astro` is the page-not-found page). Mostly plain HTML. |
| `src/layouts/Base.astro` | Shared `<head>`, announcement bar, header, nav, and footer used by every page. |
| `src/components/` | Small reusable pieces: the social icons and the click-to-play YouTube thumbnail. |
| `public/styles.css` | All styling. |
| `public/images/` | Photos, album covers, and the logo (`jonah-signature.png`). |
| `public/` | Everything else copied as-is: favicon, `robots.txt`, `sitemap.xml`. |
| `src/data/store.json` | **Store items** for the beta store at `/betastore`, including their Stripe price IDs. See `docs/store-setup.md`. |
| `api/checkout.js` | Vercel Function that turns a basket into a Stripe checkout. Needs `STRIPE_SECRET_KEY` set in Vercel. |
| `src/pages/contact.astro` | Contact form. Messages are delivered by [Formspree](https://formspree.io) (form `xgaejrra`, in Tyson's Formspree account) to Jonah's inbox. |
| `vercel.json` | Build settings and redirects from old Squarespace addresses (e.g. `/about`, `/concerts`). |

Pages keep their `.html` addresses (`/about.html`, `/calendar.html`, ...). There is no Store page for now: `/store` and `/store.html` redirect to the Records page, where each album links to where it can be bought.

## Common edits

**Adding or changing a concert**: edit `src/data/events.json`. Copy an existing event and change it. Fields:

- `month`, `day`: what shows in the date column (`"day": "3–4"` or `"TBA"` are fine).
- `end`: the event's last day as `YYYY-MM-DD`. Used to sort it under a year and to fade it out once it has passed.
- `title`: the event name. Simple HTML like `<em>` is allowed.
- `badge` (optional): a small tag above the title, e.g. `"To be confirmed"`.
- `details` (optional): lines of plain text under the title.
- `venue` (optional): smaller grey lines for times and places. To link part of a line, write it as `{ "text": "7:30 PM, Peninsula Temple Sholom, Burlingame", "link": { "label": "Peninsula Temple Sholom", "url": "https://www.sholom.org/" } }`; the `label` words become the link.
- `tickets` (optional): ticket link; adds a Tickets button.
- `listing` (optional): add this only once the date, start time, and venue are confirmed. It lets Google show the concert in event search results. Venues are defined once under `venues` at the top of the file.

Events show in the order they appear in the file, so keep them in date order. The bar at the top of every page shows the first event whose `end` date hasn't passed, with its Tickets link if it has one.

**Changing videos** (`src/data/videos.json`): each entry under `performances` has a `title`, a `meta` description, and a list of `videos`. A video's `id` is the part after `v=` in its YouTube link (`youtube.com/watch?v=XEVIkHJW6lE` → `XEVIkHJW6lE`). An entry can have an `audio` link instead of, or as well as, videos. To feature a video at the top of the page, add its `id` to the `featured` list; optionally give that video a `featuredTitle` and `featuredMeta` to describe it on its own.

**Adding a photo** (`src/pages/gallery.astro`): resize it to about 1600px on the long side first (a few hundred KB, not several MB), put it in `public/images/`, and copy an existing `<a class="gallery-item">` line, changing the image path in both places. Clicking a photo opens it full size. The gallery crops every photo to the same box; if a face gets cut off, add `style="object-position:50% 20%"` (a smaller second number shows more of the top).

**Changing the nav, header, or footer**: edit `src/layouts/Base.astro` once; every page picks it up.

**Page titles and share previews**: each page passes a `title` and `description` to `<Base>` at the top of its file. These control the browser tab, Google results, and link previews.

Editing on GitHub directly works for all of the above: open the file, click the pencil icon, and commit.

## Working locally

Requires Node.js 22.12 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open the address it prints (usually http://localhost:4321). To check the exact files that will be published:

```bash
npm run build
```

The result lands in `dist/`. Redirects in `vercel.json` only work on Vercel.
