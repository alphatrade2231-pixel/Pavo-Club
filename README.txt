PAVO CLUB CODE UPDATE

Files:
- script.js: removes all hardcoded demo/sample fallback content. The public site now shows only rows returned by the existing Supabase queries. It upgrades the public tactical lineup to show player photos, shirt numbers, and names.
- admin.js: replaces Supabase Auth login with a front-end-only login gate. Default login:
  Username: admin@pavo.local
  Password: Pavo@2026!
  Change LOCAL_ADMIN_USERNAME and LOCAL_ADMIN_PASSWORD near the top of admin.js before using.
- pavo-pitch-enhancements.css: append the entire CSS block to the END of BOTH style.css and admin.css.

INSTALL
1. Make a backup copy of your current script.js and admin.js.
2. Replace the current script.js with this script.js.
3. Replace the current admin.js with this admin.js.
4. Append pavo-pitch-enhancements.css to the END of style.css and admin.css. Do not replace the whole CSS files.
5. Ensure player records have photo_path filled with either a full public image URL or a path inside the public Supabase Storage bucket named pavo-media.
6. Ensure lineup_players rows link to the right players and have x_position/y_position values between 0 and 100.
7. Commit and push the changed files to GitHub, then hard-refresh the website (Ctrl+Shift+R).

IMPORTANT
- The hardcoded admin login is only a front-end gate. Anyone can inspect browser JavaScript and discover/bypass it. Do not reuse this password anywhere important.
- Supabase Row Level Security (RLS) still applies to database operations. If current RLS policies require a Supabase-authenticated user, this local login will open the dashboard but edits/deletes/publishing can be rejected by Supabase. Do NOT put a service_role/secret key in browser code and do not make all tables anonymously writable just to bypass RLS.
- If Supabase tables are empty or public reads are denied by RLS, the public page will now show its empty-state messages instead of fabricated sample content.
- The code preserves the current expected table and column names; it does not create or rename tables.
