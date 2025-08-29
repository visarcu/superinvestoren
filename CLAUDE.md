# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database & Prisma
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run postinstall` - Auto-runs after install to generate Prisma client

### Data Management & Scraping
- `npm run update-holdings` - Update holdings index
- `npm run update-stocks` - Update stock information
- `npm run update-sectors` - Update sector data

### RAG System (AI/Search)
- `npm run rag:check-env` - Check RAG environment setup
- `npm run rag:setup` - Setup RAG system
- `npm run rag:status` - Check RAG system status
- `npm run rag:ingest` - Ingest documents into RAG
- `npm run rag:update` - Update RAG system
- `npm run rag:clean` - Clean RAG data

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 13 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **AI/Search**: RAG system with Pinecone vector database and OpenAI
- **Styling**: Tailwind CSS
- **Charts**: Chart.js, Recharts, Lightweight Charts

### Project Structure

#### Route Groups
- `(website)/` - Public marketing pages (landing, pricing, news)
- `(terminal)/` - Authenticated app interface (analyse, profile, settings)
- `(portfolio)/` - Portfolio management features
- `auth/` - Authentication pages (signin, signup, reset)

#### Key Directories
- `src/components/` - React components
- `src/lib/` - Utility functions, services, and configurations
- `src/data/` - Static data files and investor holdings
- `scripts/` - Data scraping and maintenance scripts
- `prisma/` - Database schema and migrations

#### Data Flow
- **Investor Data**: Stored in `src/data/holdings/` from 13F filings
- **Stock Data**: Fetched from Financial Modeling Prep API
- **User Data**: Stored in PostgreSQL via Prisma
- **Real-time Data**: Cached in JSON files in `public/data/`

### Key Services

#### Data Services
- `src/lib/fmp.ts` - Financial Modeling Prep API client
- `src/lib/superinvestorDataService.ts` - Investor data management
- `src/lib/hybridFinancialService.ts` - Combined financial data service
- `src/lib/ragSystem.ts` - RAG/AI search functionality

#### Authentication & Payments
- `src/lib/supabaseClient.ts` & `src/lib/supabaseAdmin.ts` - Supabase integration
- `src/lib/stripeAuth.ts` - Stripe payment handling

### Database Schema
- **User**: User accounts with premium subscriptions
- **WatchlistItem**: User's watched stocks
- **EmailVerificationToken**: Email verification system
- **PasswordResetToken**: Password reset functionality

### API Routes
- `/api/quotes/` - Stock quotes and market data
- `/api/investor/` - Superinvestor portfolio data
- `/api/ai/` - RAG-based AI responses
- `/api/screener/` - Stock screening functionality
- `/api/portfolio/` - User portfolio management

### Environment Variables
Key environment variables needed:
- `DATABASE_URL` - PostgreSQL connection
- `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY` - Supabase
- `STRIPE_SECRET_KEY` & `STRIPE_PUBLISHABLE_KEY` - Stripe
- `FMP_API_KEY` - Financial Modeling Prep API
- `OPENAI_API_KEY` & `PINECONE_API_KEY` - RAG system

### Development Notes
- Uses TypeScript with strict mode enabled
- Webpack config ignores `@supabase/realtime-js` to prevent bundling issues
- Custom path alias `@/*` maps to `./src/*`
- German language comments and content throughout the codebase
- Financial data is cached and updated via scheduled scripts
- die FinclueAI ist ein Thema das ich sowieso "neu angehen" bzw verbessern wollte. Soll ich dir sagen was ich machen will und wir legen schrittweise los?
- ich will dioe FinancialAnalysisClient als nächstes verbessern vom design (nur vom design). Genau will ich die Charts optimieren und zwar fehlen da aktuell x und y achse und vll ein dezentes grid dass die charts aufwerten würde. Bitte die Charts dementsprechend optimieren.