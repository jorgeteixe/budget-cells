# Budget Cells

A friend runs a construction company and I watched him painfully copying line items from architect PDFs to his invoicing system (with a 256 character limit per field).

5 years ago I built [text-to-cells](http://github.com/jorgeteixe/text-to-cells) to help. He's been using it ever since, and it's saved hundreds of hours. But it crashes sometimes and I saw many ways to improve it.

Now with more experience, I decided to rebuild it properly. Budget Cells uses AI to automatically extract budget line items from PDFs and lets you copy any piece of data with one click.

## What it does

- Upload construction budget PDFs
- AI extracts all line items (descriptions, quantities, prices, totals)
- Smart text chunking that respects sentence structure  
- One-click copying to clipboard
- Tracks AI costs so you know what you're spending
- Works offline and everything is stored locally

## Tech Stack

- **SvelteKit 5** with TypeScript
- **Tailwind CSS** + shadcn-inspired design
- **Google Gemini AI** for text extraction
- **PDF.js** for client-side PDF processing
- **IndexedDB** for local storage

## Setup

```bash
# Install
pnpm install
pnpm run dev

# Get a Gemini API key from https://makersuite.google.com/app/apikey
# Add it in the app settings
```

## Why rebuild?

The original text-to-cells worked but had issues:

- Manual PDF copy/paste
- Basic UI

Budget Cells fixes all of this with AI automation, better architecture, and a professional interface.

## Interface

The app is in Spanish since it's built for Spanish construction professionals, but the code and documentation are in English.

## License

This codebase is licensed under MIT.
