# BitYield Frontend

AI-powered sBTC yield optimization platform built with Next.js, shadcn/ui, and Stacks Connect.

## Features

- ✅ Stacks wallet integration (Leather/Xverse)
- ✅ Real-time sBTC balance tracking
- ✅ Deposit/withdrawal interface with form validation
- ✅ AI-powered yield recommendations
- ✅ Interactive yield dashboard with Recharts
- ✅ Protocol comparison and analytics
- ✅ Responsive design with shadcn/ui components
- ✅ Toast notifications
- ✅ Dark mode ready

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: shadcn/ui (Radix UI + Tailwind CSS)
- **Blockchain**: @stacks/connect for wallet integration
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18, 20, or 22
- npm or yarn
- Stacks wallet (Leather or Xverse)

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local with your configuration
```

### Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

```env
# Network (testnet or mainnet)
NEXT_PUBLIC_NETWORK=testnet

# Contract addresses
NEXT_PUBLIC_CONTRACT_ADDRESS=<vault-contract-address>
NEXT_PUBLIC_SBTC_CONTRACT=<sbtc-token-address>

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Project Structure

- `src/app/` - Next.js pages (home, vault, yields)
- `src/components/` - React components organized by feature
- `src/contexts/` - React Context providers
- `src/hooks/` - Custom React hooks
- `src/services/` - API and blockchain services
- `src/types/` - TypeScript type definitions

## Key Features

### Wallet Integration
Connect Leather or Xverse wallet to interact with the Stacks blockchain. Real-time balance tracking for STX and sBTC.

### Vault Management
Deposit and withdraw sBTC with form validation, post-conditions, and transaction tracking.

### Yield Dashboard
View and compare yield opportunities across protocols with interactive charts and analytics.

### AI Recommendations
Get personalized yield strategies based on your amount and risk tolerance.

## Documentation

For full documentation, see [./IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md)

## License

MIT

---

Built with ❤️ on Stacks • Secured by Bitcoin
