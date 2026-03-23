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

# Build for production
npm run build
```

### YNAB OAuth Setup

1. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Create a new OAuth application
3. Set redirect URI to `http://localhost:5173/sg-to-ynab/` for local dev
4. Copy the Client ID to your `.env` file as `VITE_YNAB_CLIENT_ID`

## Tech Stack

- React 18 + TypeScript + Vite
- PDF.js (`pdfjs-dist`) for positional text extraction
- TailwindCSS for styling
- GitHub Pages for hosting

## Privacy

All PDF processing happens in your browser. See [PRIVACY.md](PRIVACY.md) for full details.

## License

[MIT](LICENSE)
