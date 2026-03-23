# SG to YNAB

Import Singapore bank eStatement PDFs into [YNAB](https://www.ynab.com/) (You Need A Budget).

All processing happens locally in your browser. No data is uploaded to any server.

## Supported Banks

- **DBS / POSB** — Consolidated eStatements (savings, current, credit cards)
- **UOB** — Consolidated eStatements (savings, current, credit cards)
- More banks planned (OCBC, Standard Chartered, HSBC, Maybank, Citibank)

## How It Works

1. Connect to YNAB via OAuth
2. Drop your bank eStatement PDF
3. App auto-detects the bank and parses transactions locally
4. Review and edit transactions in the preview table
5. Map bank accounts to YNAB accounts
6. Push transactions to YNAB (with automatic deduplication)

## Development

```bash
# Install dependencies
npm install

# Copy env file and configure YNAB OAuth client ID
cp .env.example .env

# Start dev server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Build for production
npm run build
```

### Testing

The project uses [Vitest](https://vitest.dev/) with [Testing Library](https://testing-library.com/) for comprehensive test coverage.

- **235 tests** across 19 test files
- **V8 coverage** with enforced thresholds (95% statements/lines/functions, 85% branches)
- Unit tests for parsers, utilities, and YNAB client
- Component tests for all React components
- Integration tests for the full App flow (upload, parse, push)

### CI/CD

- **CI workflow** runs lint + test in parallel on every PR and push to `main`
- Build only runs after both quality gates pass
- **Deploy workflow** triggers after CI succeeds on `main`, deploying to GitHub Pages

### YNAB OAuth Setup

1. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Create a new OAuth application
3. Set redirect URI to `http://localhost:5173/sg-to-ynab/` for local dev
4. Copy the Client ID to your `.env` file as `VITE_YNAB_CLIENT_ID`

## Tech Stack

- React 19 + TypeScript + Vite
- PDF.js (`pdfjs-dist`) for positional text extraction
- TailwindCSS for styling
- GitHub Pages for hosting

## Privacy

All PDF processing happens in your browser. See [PRIVACY.md](PRIVACY.md) for full details.

## License

[MIT](LICENSE)
