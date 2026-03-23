# SG to YNAB

[![CI](https://github.com/KhairulA/sg-to-ynab/actions/workflows/ci.yml/badge.svg)](https://github.com/KhairulA/sg-to-ynab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Client-Side Only](https://img.shields.io/badge/processing-client--side%20only-green.svg)](#privacy)
[![No Backend](https://img.shields.io/badge/backend-none-brightgreen.svg)](#privacy)

Import Singapore bank eStatement PDFs into [YNAB](https://www.ynab.com/) (You Need A Budget).

All processing happens locally in your browser. No data is uploaded to any server.

**[Try it live →](https://khairula.github.io/sg-to-ynab/)**

## Supported Banks

| Bank | Savings / Current | Credit Cards |
|------|:-:|:-:|
| DBS / POSB | Yes | Yes |
| UOB | Yes | Yes |
| OCBC | Planned | Planned |
| Standard Chartered | Planned | Planned |
| HSBC | Planned | Planned |
| Maybank | Planned | Planned |
| Citibank | Planned | Planned |

Consolidated eStatements with multiple accounts are supported.

## How It Works

1. **Connect** — Authorise with YNAB via OAuth (Implicit Grant, no server needed)
2. **Upload** — Drop your bank eStatement PDF (password-protected PDFs supported)
3. **Auto-detect** — The app identifies the bank and parses transactions locally
4. **Review** — Edit payees, memos, and toggle individual transactions
5. **Map** — Link each bank account to a YNAB account (mappings are remembered)
6. **Push** — Send transactions to YNAB with automatic deduplication via import IDs

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 24+
- A [YNAB](https://www.ynab.com/) account

### Local Development

```bash
# Install dependencies
npm install

# Copy env file and add your YNAB OAuth client ID
cp .env.example .env

# Start dev server
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run preview` | Preview production build locally |

### YNAB OAuth Setup

1. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Create a new OAuth application
3. Set the redirect URI:
   - Local dev: `http://localhost:5173/sg-to-ynab/`
   - Production: your GitHub Pages URL (e.g. `https://<user>.github.io/sg-to-ynab/`)
4. Copy the Client ID to your `.env` file as `VITE_YNAB_CLIENT_ID`
5. Set `VITE_YNAB_REDIRECT_URI` to match the redirect URI above

The app uses OAuth **Implicit Grant** — no client secret is needed.

### Deployment (GitHub Pages)

Set these **repository secrets** under Settings > Secrets and variables > Actions:

| Secret | Description |
|--------|-------------|
| `VITE_YNAB_CLIENT_ID` | Your YNAB OAuth Client ID |
| `VITE_YNAB_REDIRECT_URI` | Your production redirect URI (e.g. `https://<user>.github.io/sg-to-ynab/`) |

The CI/CD pipeline handles the rest — see below.

## Architecture

```
src/
├── parsers/          # PDF text extraction and bank-specific parsing
│   ├── pdfExtractor  # PDF.js wrapper for positional text extraction
│   ├── bankDetector  # Auto-detect bank from PDF content
│   ├── columnDetector# Table column/row detection via x/y clustering
│   ├── dbs           # DBS/POSB statement parser
│   └── uob           # UOB statement parser
├── ynab/             # YNAB API integration
│   ├── client        # REST client (budgets, accounts, transactions)
│   ├── oauth         # OAuth Implicit Grant flow
│   └── importId      # Deduplication via YNAB import IDs
├── lib/              # Shared utilities
│   ├── amounts       # Currency parsing and formatting
│   └── config        # LocalStorage persistence (mappings, history)
├── components/       # React UI components
└── App.tsx           # Main application orchestration
```

## Testing

The project uses [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/).

- **235 tests** across 19 test files
- **V8 coverage** with enforced thresholds (95% statements/lines/functions, 85% branches)
- Unit tests for parsers, utilities, and YNAB client
- Component tests for all React components
- Integration tests for the full App flow (upload, parse, push)

## CI/CD

Single GitHub Actions workflow (`.github/workflows/ci.yml`):

| Job | Depends on | Runs on |
|-----|-----------|---------|
| **lint** | — | Every PR and push to `main` |
| **test** | — | Every PR and push to `main` |
| **build** | lint, test | After both quality gates pass |
| **deploy** | build | Push to `main` only (GitHub Pages) |

Coverage thresholds are enforced in CI — the build fails if coverage drops below the configured minimums.

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/)
- [PDF.js](https://mozilla.github.io/pdf.js/) (`pdfjs-dist`) for positional text extraction
- [TailwindCSS](https://tailwindcss.com/) for styling
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) for testing
- [GitHub Pages](https://pages.github.com/) for hosting

## Privacy

All PDF processing happens in your browser. No data is sent anywhere except to YNAB's API when you explicitly click "Push to YNAB". See [PRIVACY.md](PRIVACY.md) for full details.

## License

[MIT](LICENSE)
