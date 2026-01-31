# Budget Tracker

A self-hosted personal finance and budget tracking application. Track expenses, manage bills, set savings goals, and monitor your financial health - all while keeping your data private on your own server.

## Features

- **Account Management** - Track multiple bank accounts, credit cards, and cash
- **Transaction Tracking** - Log income and expenses with categories
- **Bill Management** - Never miss a payment with bill tracking and due date reminders
- **Budget Planning** - Set monthly budgets by category and track spending
- **Savings Goals** - Set financial goals and track progress with contributions
- **Dashboard Analytics** - Visual insights into spending patterns and trends
- **Document Scanner** - OCR-powered receipt scanning (experimental)
- **Full Data Export/Import** - Complete backup and restore functionality
- **Mobile Friendly** - Responsive design works on any device

## Quick Start with Docker

The easiest way to run Budget Tracker is with Docker:

```bash
# Using docker-compose (recommended)
docker-compose up -d

# Or using docker directly
docker run -d \
  -p 5555:5555 \
  -v budget-data:/app/data \
  --name budget-tracker \
  budget-tracker
```

Then open http://localhost:5555 in your browser.

### Docker Compose

```yaml
version: '3.8'
services:
  budget-tracker:
    image: budget-tracker
    build: .
    ports:
      - "5555:5555"
    volumes:
      - budget-data:/app/data
    restart: unless-stopped

volumes:
  budget-data:
```

## Windows Desktop App

Download the latest installer from the [Releases](https://github.com/mitchcode-cold/budget-tracker/releases) page.

Or build it yourself:

```bash
git clone https://github.com/mitchcode-cold/budget-tracker.git
cd budget-tracker
npm install
npm run electron:build:win
```

The installer will be in the `release` folder.

## Manual Installation

### Prerequisites

- Node.js 20+
- npm or pnpm

### Setup

```bash
# Clone the repository
git clone https://github.com/mitchcode-cold/budget-tracker.git
cd budget-tracker

# Install dependencies
npm install

# Start development server
npm run dev

# Or build and run production
npm run build
npm start
```

## Data Safety

Your financial data is important. Budget Tracker includes full export/import functionality:

1. Go to **Settings** in the app
2. Click **Export Data** to download a complete JSON backup
3. Use **Import Data** to restore from a backup

The export includes all accounts, transactions, categories, bills, goals, and budgets.

**Tip:** Set up regular backups of your Docker volume or export your data periodically.

## Development

```bash
# Run in development mode (hot reload)
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint
```

## Tech Stack

- **Frontend:** React, TypeScript, TailwindCSS, React Query
- **Backend:** Hono (lightweight Node.js server)
- **Database:** SQLite (with better-sqlite3)
- **Build:** Vite, tsup
- **Container:** Docker
- **Desktop:** Electron

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you find this project useful, consider [sponsoring on GitHub](https://github.com/sponsors/mitchcode-cold) to support ongoing development.

## License

MIT License - see [LICENSE](LICENSE) for details.
