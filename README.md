# aarkme — unsocial media profile

aarkme is a compact, curated profile for your favorite movies, albums, books, and games. Inspired by the golden era of personal web pages, it focuses on curation over connection. No feeds, no followers, just a signal.

## Features

- **Media Curation**: Exactly 10 slots for each category (Movies, Albums, Books, Games).
- **Liquid Glass Aesthetic**: A dark, minimalist design with glassmorphism and Frutiger Aero influences.
- **Owner-Only Editing**: Secure editing mode for profile owners.
- **Public Profiles**: Share your curation with a simple URL.
- **Responsive Editor**: Optimized for mobile and desktop use.
- **Robust Storage**: Local demo mode with `localStorage` and full Supabase integration for production.
- **Image Processing**: Automatic compression and resizing for avatars and covers.

## Local Development

To run the project locally for development or as a demo:

1. Clone the repository.
2. Run a local web server (e.g., `python3 -m http.server 8000`).
3. Open `http://localhost:8000` in your browser.

By default, the app runs in **Local Demo Mode** using `localStorage`.

## Supabase Configuration (Production)

To enable cloud storage and public sharing, follow these steps:

### 1. Create a Supabase Project
Sign up at [supabase.com](https://supabase.com) and create a new project.

### 2. Run Database Schema
Navigate to the **SQL Editor** in your Supabase dashboard and execute the contents of `supabase/schema.sql`. This will create:
- `profiles` table
- `media_items` table
- Necessary indexes and RLS (Row Level Security) policies.

### 3. Setup Storage
1. Go to **Storage** in the Supabase dashboard.
2. Create a new bucket named `aarkme-media`.
3. Set the bucket to **Public**.
4. (Optional) Run the storage policies provided in the comments at the end of `supabase/schema.sql`.

### 4. Provide Configuration
Create a `config.js` file (you can copy `config.example.js`) and fill in your Supabase credentials:

```javascript
export const CONFIG = {
  supabase: {
    url: 'https://your-project-id.supabase.co',
    anonKey: 'your-anon-key',
  }
};
```

## Deployment on Cloudflare Pages

1. Push your code to a GitHub repository.
2. Connect your repository to **Cloudflare Pages**.
3. Set the **Build command** to: (leave empty, it's a static site).
4. Set the **Build output directory** to: `.` (root).
5. In the Cloudflare Pages dashboard, add your `config.js` (or use environment variables if you adapt the loading logic).

## Architecture

- **Static Frontend**: Pure HTML/CSS/JS (ES Modules).
- **Service Layer**: `supabase-service.js` handles all backend communication.
- **State Management**: `app.js` manages the application state and rendering.
- **Utilities**: `utils.js` provides image compression, normalization, and debouncing.
- **Routing**: Uses `?u=username` query parameters for public profile lookups.

## Security

- **RLS**: Database access is restricted. Public visitors can only read profiles marked as public.
- **Authentication**: Supabase Auth (Email/Password) is used to identify the profile owner.
- **XSS Protection**: All user input is escaped before rendering.

## Known Limitations

- Exactly 10 items per category (by design).
- Requires a modern browser with Canvas API support for image compression.

---
*aarkme — just a signal.*
