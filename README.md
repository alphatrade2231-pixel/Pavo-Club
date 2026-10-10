# PAVO Club — Static HTML/CSS/JavaScript + Supabase

A starter project based on the existing PAVO navy-and-gold identity. It contains a bilingual public site and a separate admin dashboard. No build step, Node.js, React, or TypeScript is required.

## Files
- `index.html`, `style.css`, `script.js` — public website, English/Arabic toggle, player/match/news views, published line-up display.
- `admin.html`, `admin.css`, `admin.js` — Supabase Auth sign-in, player/match/news CRUD, line-up editor with click-to-place players, draft/publish.
- `supabase.js` — public browser client configuration.
- `supabase-schema.sql` — reference schema and example RLS policies for a NEW project.

## 1. Configure Supabase
1. Open `supabase.js`.
2. Replace `https://YOUR-PROJECT-REF.supabase.co` with your Project URL.
3. Replace `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with the project's publishable key (or legacy `anon` key).
4. Never paste a `service_role`/secret key into a browser file or commit it to GitHub.

## 2. Database
You said you already ran the earlier PAVO SQL. If that is the same Supabase project, **do not blindly run `supabase-schema.sql` again**. Check the tables in Table Editor and compare column names with the file. The admin forms use `position`, `opponent_name_en` / `opponent_name_ar`, and the corresponding `*_en`/`*_ar` content fields. If your existing schema uses `position` or `opponent_en` instead, align the columns before testing.

For a new project, review `supabase-schema.sql` in the SQL Editor and run it in a controlled setup. Confirm the RLS policies after execution. Create a public Storage bucket named `pavo-media` if you want uploaded images. Image paths may also be full HTTPS URLs.

## 3. Create the first admin
1. In Supabase Dashboard → Authentication → Users, create the admin user.
2. Copy that user's UUID.
3. In SQL Editor, insert a profile using that UUID (only do this for your own trusted account):

```sql
insert into public.admin_profiles (user_id, display_name, role, is_active)
values ('PASTE-AUTH-USER-UUID-HERE', 'PAVO Admin', 'super_admin', true);
```

The dashboard currently permits `super_admin` and `admin` roles. `editor` is not allowed into this first-version dashboard. Never allow public users to write to admin tables.

## 4. Run locally and deploy
- For quick preview, open `index.html` in a browser; a small static preview appears when Supabase is not configured.
- For full Auth behavior, use a local static server or deploy to GitHub Pages / Netlify. Supabase Auth → URL Configuration should include your local/deployed site URL and redirect URLs.
- Upload the project files to your GitHub repository. No build command is needed.

## Important first-version notes
- This is a starter implementation, not a claim that it has been connected to your Supabase project or tested against your live schema.
- The public site reads published rows. If RLS policies or table columns differ, check the browser console and Supabase API logs.
- The line-up editor places selected players by clicking the pitch. Click a placed player to remove them. Save draft or publish to make it public.
- Before public launch, verify all RLS policies, storage permissions, mobile layout, real data, and account recovery.


## Temporary demo mode and CSV samples

- The public site now falls back to clearly labelled demo content whenever a public section has no published rows in Supabase. Fallback is per section: real published players can show alongside demo matches/news until those sections have real data.
- The demo preview banner is shown whenever one or more public sections use sample content. The data is fictional and should not be presented as official club records.
- Sample CSVs are in `sample-data-csv/`. They match the column names in `supabase-schema.sql`. Import order for relational integrity: `players.csv`, `matches.csv`, `staff.csv`, `news.csv`, `lineups.csv`, `lineup_players.csv`, `match_events.csv`, then `site_settings.csv`.
- CSV import writes sample records into your database; it is optional. If you import them, they are actual rows in Supabase and should be deleted/replaced before production. The website's built-in demo fallback does not write anything to Supabase.
- Because CSV line-up rows reference the included player and match UUIDs, import the files in the order above. If tables already contain conflicting UUIDs, use the built-in website fallback instead of importing.
- Do not import `admin_profiles.csv` or any secrets; no admin account is included.
