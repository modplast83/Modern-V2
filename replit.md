# MPBF - Manufacturing Planning for Plastic Bag Factory

An MRP system for plastic bag manufacturing, managing the entire production lifecycle from orders to delivery, with an Arabic-first interface.

## Run & Operate

- **Run**: `npm run dev` (starts Express server on port 5000/8000, serving API and Vite frontend)
- **Environment Variables**:
    - `DATABASE_URL`: PostgreSQL connection string
    - `SESSION_SECRET`: Express session secret
    - `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`: WhatsApp API credentials
    - `TAQNYAT_API_KEY`, `TAQNYAT_SENDER_NAME`: SMS gateway
    - `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`: Adobe PDF service
    - `OPENAI_API_KEY`: AI integration key

## Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack Query v5, Tailwind CSS, shadcn/ui, Recharts, Three.js
- **Backend**: Node.js, Express.js, TypeScript (tsx)
- **Database**: PostgreSQL (Neon Serverless)
- **ORM**: Drizzle ORM
- **Authentication**: Session-based (Passport.js), Replit Auth (OpenID Connect), Mobile Bearer tokens
- **Validation**: Zod
- **Build Tool**: Vite

## Where things live

- **Frontend**: `client/`
    - Pages: `client/src/pages/`
    - UI Components: `client/src/components/ui/`
    - API Request/Query Client: `client/src/lib/queryClient.ts`
    - Internationalization: `client/src/i18n/locales/`
    - Navigation Configuration: `client/src/config/navigationConfig.ts`
- **Backend**: `server/`
    - Entry Point: `server/index.ts`
    - Main API Routes: `server/routes.ts`
    - Database Access Layer: `server/storage.ts`
    - Middleware: `server/middleware/`
    - Shared Services: `server/services/`
- **Shared Code (Frontend/Backend)**: `shared/`
    - DB Schema: `shared/schema.ts`
    - Permissions: `shared/permissions.ts`
- **Migrations**: `migrations/`
- **Static Assets/PWA**: `public/`
- **Mobile App API Contract**: `attached_assets/MOBILE_APP_API_CONTRACT.md`

## Architecture decisions

- **Arabic-First RTL Design**: Primary interface is Arabic (RTL) with English fallback, ensuring culturally appropriate user experience.
- **Comprehensive AI Agent**: The AI agent acts as a full executive digital assistant with extensive system capabilities, including document generation, database interaction (safe queries), and knowledge base management.
- **Robust Authentication**: Implements a dual authentication system (session for web, token for mobile) with granular permission control and role-based access to ensure secure operations.
- **Offline-First Mobile Support**: The native Expo app includes mechanisms for offline attendance syncing and action queuing, enhancing usability in environments with intermittent connectivity.
- **Strict Data Integrity**: Enforces business rules at the database level and through transaction wrappers, coupled with sequential stage transitions for production orders, to maintain data consistency.

## Product

- **Manufacturing Lifecycle Management**: Handles customer orders, multi-stage production (film, printing, cutting), warehouse inventory, and quality control.
- **Real-time Monitoring**: Provides real-time factory monitoring, machine status, and production progress dashboards.
- **HR & Admin**: Manages HR functions (attendance, leaves, performance), machine maintenance, and system administration.
- **AI-Powered Assistance**: Features an AI agent for chat, knowledge base access, document generation, and database queries.
- **Multi-channel Notifications**: Integrates with Meta WhatsApp Business API, Taqnyat SMS, and Twilio WhatsApp for alerts and customer communication.
- **PWA & Mobile Apps**: Offers a Progressive Web App (PWA) and a native Expo mobile application for enhanced accessibility and offline capabilities.

## User preferences

- Language: Arabic (RTL) primary, English fallback
- Error messages: Always in Arabic for end users
- Number formatting: Arabic numerals, 2 decimal places for weight, 1-2 for percentages
- Logging: Comprehensive server-side, never log sensitive data (passwords, tokens)

## Gotchas

- **Do Not Modify**: `vite.config.ts`, `server/vite.ts`, `drizzle.config.ts`, `package.json` should not be manually edited.
- **Mobile API Contract**: Do not change field names, data types, or remove fields without updating `attached_assets/MOBILE_APP_API_CONTRACT.md`.
- **AI Agent SQL**: `DROP`, `DELETE`, `TRUNCATE`, `ALTER` are blocked for safety in `execute_database_query`.
- **Database Auto-Migration**: On startup, `drizzle-kit push --force` is run for new databases (0 tables), or to add missing critical tables. This creates new tables but **never drops or modifies existing data**.

## Pointers

- **TanStack Query**: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)
- **Zod**: [https://zod.dev/](https://zod.dev/)
- **shadcn/ui**: [https://ui.shadcn.com/](https://ui.shadcn.com/)
- **Recharts**: [https://recharts.org/en-US/](https://recharts.org/en-US/)
- **Three.js**: [https://threejs.org/](https://threejs.org/)
- **i18next**: [https://www.i18next.com/](https://www.i18next.com/)