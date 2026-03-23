# Privacy Policy — SG to YNAB

**Last updated:** 2026-03-23

## Summary

SG to YNAB is a client-side web application. All PDF processing happens locally in your browser. No data is uploaded to any server except YNAB's official API (when you explicitly push transactions). The sole purpose of this application is to parse Singapore bank eStatement PDFs and import the extracted transactions into your YNAB budget.

## Data We Process

### Bank Statement PDFs
- PDFs are read and parsed **entirely in your browser**
- PDF content is held in browser memory only and cleared when you close the tab
- PDFs are **never** uploaded to any server

### YNAB Data
- When you connect to YNAB via OAuth, the app receives a temporary access token
- The token is stored **in memory only** (not localStorage, not cookies)
- The token expires after 2 hours and is cleared when you close the tab
- The app fetches your budget list and account names to enable account mapping
- Transaction data is sent **only** to YNAB's official API (`api.ynab.com`) when you click "Push to YNAB"

### Locally Stored Data
The following is saved in your browser's `localStorage` for convenience:
- **Account mappings**: which bank account maps to which YNAB account (account IDs only, no transaction data)
- **Import history**: file names and transaction counts from past imports (no transaction details)
- **Budget preference**: your selected YNAB budget ID

This data persists across browser sessions until you delete it (see "Data Deletion" below).

## Data Storage & Security

This application has **no server or database**. It is a static site hosted on GitHub Pages.

- **YNAB access token**: Held in JavaScript memory only. Never written to disk, localStorage, cookies, or any persistent storage. Automatically discarded when you close the tab or after 2-hour expiry.
- **PDF content and parsed transactions**: Held in JavaScript memory only. Automatically discarded when you close the tab.
- **Account mappings, import history, budget preference**: Stored in your browser's `localStorage` on your device only. Contains no transaction data, financial amounts, or personal information — only account IDs, file names, and counts.

No data obtained through the YNAB API is stored persistently. All YNAB data (budgets, account names, transactions) exists only in browser memory for the duration of your session.

## Third-Party Data Sharing

**Data obtained through the YNAB API will not be passed to any third party.** The only network requests this application makes are:

- **YNAB API** (`api.ynab.com`): To fetch your budgets and accounts, and to create transactions when you explicitly click "Push to YNAB". Subject to [YNAB's Privacy Policy](https://www.ynab.com/privacy-policy).
- **cdnjs.cloudflare.com**: To load the PDF.js worker script (a JavaScript library for parsing PDFs). No user data is sent to this CDN.
- **GitHub Pages** (`khairula.github.io`): Serves the static application files. GitHub may collect standard web server logs (IP address, user agent). No application data is sent to GitHub. See [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

Your YNAB data and bank statement data are never sold, shared, aggregated, or analyzed for any purpose other than importing transactions into your YNAB budget.

## Data We Do NOT Collect
- No analytics or tracking scripts
- No cookies (beyond browser-native behaviour)
- No server-side logging
- No telemetry
- No personal information
- No financial account credentials (only OAuth access tokens obtained directly from YNAB)

## Data Deletion

You can delete all locally stored data at any time by either:
1. Clearing site data for this domain in your browser settings
2. Opening your browser's Developer Tools → Application → Local Storage → deleting entries for this site

Since no data is stored on any server, clearing your browser's local storage removes all data associated with this application.

If you wish to revoke this application's access to your YNAB account, you can do so from your [YNAB Account Settings](https://app.ynab.com/settings) under "Authorized Applications".

If you have any questions about your data or wish to request data deletion assistance, please contact us (see below).

## Open Source

This application is fully open source. You can inspect all code at [github.com/KhairulA/sg-to-ynab](https://github.com/KhairulA/sg-to-ynab) to verify these claims.

## Contact

For privacy questions or data deletion requests, please open an issue on the [GitHub repository](https://github.com/KhairulA/sg-to-ynab/issues) or email the repository owner via their GitHub profile.
