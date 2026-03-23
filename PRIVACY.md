# Privacy Policy — SG to YNAB

**Last updated:** 2025-01-01

## Summary

SG to YNAB is a client-side web application. All PDF processing happens locally in your browser. No data is uploaded to any server except YNAB's official API (when you explicitly push transactions).

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

You can clear this data at any time via your browser's developer tools or by clearing site data.

## Data We Do NOT Collect
- No analytics or tracking scripts
- No cookies (beyond browser-native behaviour)
- No server-side logging
- No telemetry
- No personal information

## Third Parties
- **YNAB API** (`api.ynab.com`): Transaction data is sent here only when you explicitly push. Subject to [YNAB's Privacy Policy](https://www.ynab.com/privacy-policy).
- **cdnjs.cloudflare.com**: PDF.js worker script is loaded from this CDN.
- **GitHub Pages**: The app is hosted as a static site. GitHub may collect standard web server logs (IP address, user agent). See [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Open Source
This application is fully open source. You can inspect all code at [github.com/KhairulA/sg-to-ynab](https://github.com/KhairulA/sg-to-ynab) to verify these claims.

## Contact
For privacy questions, open an issue on the [GitHub repository](https://github.com/KhairulA/sg-to-ynab/issues).
