# Vincenzo's Christmas Wishlist 🎄

A classic Christmas-themed, mobile-friendly wishlist. It supports product descriptions, names, prices, store names and links; search and sorting; 24-hour Purchase/Maybe holds; a permanent Bought status; a free-text inspiration section; an admin area; a rotating welcome greeting; and optional original synthesized bell music.

## 1. Publish with GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Choose the `main` branch and `/(root)`, then save.
5. GitHub will show the public website address when deployment is ready.

## 2. Connect the database (Supabase)

The site uses Supabase for shared gifts and holds, so visitors all see the same reservations.

1. Create a Supabase project.
2. Open **SQL Editor** in Supabase.
3. Paste and run all of `supabase-setup.sql`.
4. Paste and run all of `admin-mark-bought.sql`.
5. In **Project Settings → API**, copy the Project URL and anon/publishable key.
6. Open `config.js` in this repository and replace the two placeholder values:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`

The anon/publishable key is designed to be used in a public website. **Never place a Supabase service-role key in this repository.**

## 3. Create the admin login

1. In Supabase, open **Authentication → Users** and create your admin user with an email and password.
2. Copy that user's UUID.
3. In Supabase **SQL Editor**, replace `YOUR-USER-UUID` in the commented example at the bottom of `supabase-setup.sql` with the UUID, remove the leading SQL comment markers from the two lines, and run it:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where id = 'YOUR-USER-UUID';
```

4. Sign out and back in after the role is set. Open **Admin** in the website footer and sign in with that account.

Only users with the admin role can add, edit or delete gifts. Visitors can view gifts and create a hold, but the reservation records and private hold tokens are not exposed to visitors.

## 4. Add your gifts

In the website's **Admin** area, add each gift's name, description, price, supplier, product URL, and optional image URL. Put any general likes and gift ideas in the Inspiration text field; it appears in the “Want some inspo?” section. You can add several inspiration entries across gifts.

## How holds work

- **Purchase** and **Maybe** both create a 24-hour hold.
- A held gift shows “Someone is thinking of buying this item” and the remaining hold time.
- The browser that placed the hold gets a **Bought** button. After purchasing, the visitor can return and mark it bought.
- A bought gift remains visible but cannot be reserved again.
- The admin can also mark a gift as bought from the admin area.
- An expired hold becomes available again automatically.

The optional music is generated in the browser and starts only after a visitor presses the Music button. No audio file or copyrighted song is used.

## Files

- `index.html` — page structure
- `styles.css` — classic Christmas styling and responsive layout
- `app.js` — wishlist, search, holds, admin tools and music
- `config.js` — public Supabase project settings
- `supabase-setup.sql` — database, access policies and hold functions
- `admin-mark-bought.sql` — admin-only mark-bought function

If you change files on GitHub, GitHub Pages will redeploy the site automatically.
