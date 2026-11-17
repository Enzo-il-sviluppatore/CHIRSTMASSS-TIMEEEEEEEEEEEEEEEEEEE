# Vincenzo's Christmas Wishlist 🎄

A classic red, green and gold Christmas wishlist with shared gift listings, 24-hour holds, a private admin area, search and filters, an inspiration section, a YouTube Christmas music player, and a custom favicon.

## 1. Enable Firebase

1. Create a project in the Firebase Console.
2. Add a **Web app** to the project and copy its Firebase configuration.
3. In **Authentication → Sign-in method**, enable **Anonymous** and **Email/Password**.
4. In **Firestore Database**, create a database.
5. Open **Firestore Database → Rules** and paste the contents of `firestore.rules`. Replace `YOUR_ADMIN_USER_UID` with the admin user's UID (step 6 below), then publish.
6. In **Authentication → Users**, add the admin account using email/password. Copy its UID.
7. Open `config.js` in this repository. Replace the Firebase configuration placeholders and `YOUR_ADMIN_USER_UID` with the values from your Firebase project and admin account.

The Firebase web configuration is public by design. Do not put service-account keys or private credentials in this repository. Firestore security rules—not hidden client settings—protect the data.

## 2. Publish with GitHub Pages

1. Open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`, then save.
4. GitHub Pages will display the published website address when deployment completes.

## 3. Add gifts and manage the site

Open the published site and choose **Admin** in the footer. Sign in using the Firebase email/password account. Add gift name, description, price, supplier, product link, optional image link, and optional inspiration text.

## Gift reservations

- Visitors are signed in anonymously by Firebase Authentication; no account is needed.
- Purchase and Maybe both create a shared 24-hour hold.
- The visitor's anonymous Firebase account is associated with the hold, so the same browser can mark it bought later.
- An expired hold can be replaced by another visitor.
- Bought items remain visible and cannot be reserved again.
- The admin can mark any item bought or add/edit/delete gifts.
- Hold documents contain only a random anonymous UID and status/expiry information. Do not collect personal details in the gift list.

## Christmas music

The music player uses YouTube's official embedded player. It includes the three links supplied for the project plus three traditional carol performances from the verified United States Air Force Band channel. Playback starts only after a visitor chooses a track. YouTube controls playback and any ads shown in its player. The fact that a carol's composition is public domain does not automatically make every modern recording public domain; the website embeds videos rather than copying their audio.

## Files

- `index.html` — page structure and music player
- `styles.css` — responsive Christmas theme
- `app.js` — Firebase, reservations, admin, filters and music playlist
- `config.js` — public Firebase web configuration and admin UID
- `firestore.rules` — Firestore access rules
- `favicon.svg` — custom Christmas tree browser icon

If you update a file on GitHub, GitHub Pages will redeploy the site automatically.
