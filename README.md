# aarkme

**aarkme** is a static, one-page “unsocial media” profile for people who want to share a compact personal page with their curated movies, albums, books, and games.

It is not a social network. There are no feeds, followers, likes, comments, messages, timelines, or discovery mechanics. The project is a polished static front-end intended to be hosted as a single personal profile/link-in-bio page.

## What is included

- Public/read-only profile mode
- Local owner/edit mode
- Public preview mode
- Editable profile name, username, bio, and profile photo
- Four media shelves: movies, albums, books, and games
- 10 editable slots per category
- Compact collapsed editors so the page never shows 40 full forms at once
- Cover image upload and removal for each media item
- Local saving through `localStorage`
- JSON backup export and import
- Compact theme editor with CSS variables
- Responsive mobile-first layout
- Static hosting preparation files
- Future Supabase schema draft

## File structure

```txt
index.html
styles.css
app.js
config.example.js
_headers
_redirects
supabase/schema.sql
README.md
```

## How to run locally

Open `index.html` directly in your browser.

For a more realistic local static server, run one of these commands inside the project folder:

```bash
python -m http.server 8080
```

Then open:

```txt
http://localhost:8080
```

No build step is required.

## How to host

Upload the full folder to any static host, such as:

- Cloudflare Pages
- Netlify
- Vercel static output
- GitHub Pages
- Any basic static web server

The `_headers` and `_redirects` files are included for platforms that support them. The app itself does not require server-side code.

## How local data works

All profile, media, cover image, avatar, theme, and mode data is saved in the browser with `localStorage` under the key:

```txt
aarkme:state:v1
```

Because this is local-only, the profile is stored per browser/device. Export/import is included so you can move your data manually.

## Edit mode and owner mode

Click the subtle `edit` button to enter local owner/edit mode immediately. There is no password in this static version.

This is intentionally not real authentication. It only hides editing tools from the public view on the same browser. Future Supabase Auth integration should replace it with email/password login.

## Public mode

Public mode hides:

- Inputs
- Textareas
- Upload controls
- Remove buttons
- Backup tools
- Theme editor
- Empty media slots
- Empty media categories
- Editor accordions

It shows only the curated profile content.

## Public preview mode

In edit mode, click `preview` to see how the public profile will look while keeping a small return control available for editing.

## Export/import

The backup panel in edit mode lets you export the complete local state as a JSON file. Import validates and normalizes the backup before replacing local data.

## Theme customization

The theme editor uses CSS variables for:

- Background color
- Panel/card color
- Border color
- Accent color
- Text color
- Muted text color
- Header color
- Button color
- Input color
- Font option
- Border radius

The customization panel scrolls internally and is hidden in public mode.

## Future Supabase integration

This version does not connect to Supabase. The included `config.example.js` and `supabase/schema.sql` prepare the project for future:

- Supabase Auth with email/password
- Public profile links such as `/@username` or `?u=username`
- Database-backed profiles
- Database-backed media slots
- Supabase Storage for profile photos and covers
- Owner-only editing with authenticated user IDs

## Notes and limitations

- The current app is fully static and offline-capable.
- Local owner mode is not security; it is only a local UI toggle.
- Large base64 images can consume browser localStorage space. For production with many high-resolution covers, use Supabase Storage or another file storage service.
