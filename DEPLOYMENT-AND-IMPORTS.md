# Truvelo Drags: deployment and results imports

Website: https://gunit177.github.io/Truvelo-Drags-Website/

Results formatter: https://gunit177.github.io/Truvelo-Drags-Website/formatter.html

## Website releases

The editable website is in `dist`. GitHub Actions tests each push to `main` and deploys only `dist` to GitHub Pages. No build or package installation is needed. GitHub Settings → Pages must use GitHub Actions as its source. Keep the existing Sites backup separately.

In Supabase Authentication → URL Configuration, set Site URL to the website URL above and allow these redirect URLs (keep any local URLs needed for testing):

- https://gunit177.github.io/Truvelo-Drags-Website/
- https://gunit177.github.io/Truvelo-Drags-Website/?recovery=1
- https://gunit177.github.io/Truvelo-Drags-Website/index.html
- https://gunit177.github.io/Truvelo-Drags-Website/index.html?recovery=1

After deployment, test registration with confirmation email, login, password reset, published events/results, all three dashboard links and preparing a quotation email. Events and results retain their existing member-only access. The formatter has no database credentials or write access. Quotes still open an email draft for you to send.

## Format a new or historical race event

1. In Supabase `events`, create the event if it does not exist. Use the correct date, location, quarter-mile distance and system (01 Ralf, 02 Gareth, 03 Pierre). Keep `published=false` while importing. Copy the event's `id`.
2. Open the formatter. Choose the original `.xlsx` or `.csv` two-lane timing export, then its worksheet. Enter the event ID, date and timing system.
3. Confirm that TrackType 400 means quarter mile and QuartS is the official km/h speed. Confirm calibration and unnumbered-run exclusions only if they apply to this event.
4. Validate. Review the listed errors. Either correct them in a separate copy of the source, or select **Exclude results with validation errors** and validate again. Only invalid lanes are excluded; valid opposite lanes remain. The review report keeps the original source row and reason for each validation exclusion. Review each exclusion and the timing preview, then tick the review confirmation.
5. Download the review report and SQL file. SQL is recommended because the whole insert runs in one transaction and refuses an event with existing results. It verifies the date, system, distance and unpublished status. It does not create an event, change its status or publish it.
6. In the website Supabase project's SQL Editor, paste the SQL and run once. This requires `race_results.sixty_ft` to exist, as it already does in the current website database. Do not rerun `database/setup.sql` on the current database.
7. Compare the inserted count with the report and spot-check reaction, sixty-foot, ET and speed. Set status to `past` and published to true when approved. Sign in on the website to check History.

CSV alternative: import the downloaded CSV into `race_results` using Table Editor → Insert → Import data from CSV. Do not run both SQL and CSV. CSV does not perform the SQL event checks; verify identity and absence of existing results yourself. The database's event/run/lane uniqueness constraint helps reject duplicates.

This release supports the confirmed legacy quarter-mile format only. It rejects missing timings, duplicate run/lane pairs, unexpected dates/distances, formula cells and malformed headers. It preserves negative reactions and rounds timings/speed to three decimals, half away from zero. The report retains original timing values and the input SHA-256. It never silently repairs faulty runs or overwrites imported events. A correction to an existing imported event requires a separate reviewed update.

Do not reimport Midvaal: those results already exist. Keep original race files, generated imports and review reports outside this public repository.

## Dependencies

The browser spreadsheet reader is SheetJS CE 0.20.3, vendored from https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs. Its Apache 2.0 license is in `dist/assets/xlsx-LICENSE.txt`. It runs locally in the browser, without sending race data to a server.

## Later work

Protected website administrator roles, direct database uploads and event editing are a separate future release. Supabase project access is used for administration today.
