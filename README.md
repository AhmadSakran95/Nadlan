# Nadlan Tours

Starter application for Nadlan Tours booking management and customer portal.

## Included
- Admin login using environment credentials
- Customer creation
- Booking creation with unique NDL + six digits
- Booking status management
- Customer portal login using PNR + surname
- Booking summary for customer
- Default booking terms
- Gemini-powered travel chat (when `GEMINI_API_KEY` is configured)
- PostgreSQL / Prisma schema
- Railway deployment configuration and health endpoint

## Requirements
- Node.js 20.9+
- PostgreSQL database
- Railway account for deployment

## Local setup
1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `SESSION_SECRET` (at least 32 characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Install dependencies: `npm install`
4. Create database tables: `npx prisma db push`
5. Start development server: `npm run dev`
6. Open `http://localhost:3000`.

## Railway deployment
1. Upload this project to a GitHub repository.
2. In Railway, create a project and deploy the GitHub repository.
3. Add a PostgreSQL service.
4. Add the following variables to the web service:
   - `DATABASE_URL` (reference Railway PostgreSQL `DATABASE_URL`)
   - `SESSION_SECRET` (a random secret of 32+ characters)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `GEMINI_API_KEY` (optional until AI chat is enabled)
   - `GEMINI_MODEL` (optional; defaults to `gemini-2.5-flash`)
5. Railway uses `railway.json`; the deploy command runs `prisma db push` then starts Next.js.
6. Generate a public domain in Railway.

## Important production notes
- Change the initial admin password before exposing the site.
- Use a long random `SESSION_SECRET`.
- Configure a persistent S3-compatible bucket before enabling customer document uploads.
- Configure a weather provider and Google Places API before showing live weather, restaurant ratings, or attractions.
- This starter does not yet implement flight/hotel/transfer document upload and extraction screens, live weather, Places search, WhatsApp sending, or full CRUD for every itinerary item. Those are planned integration modules, not fake live features.
- For a production deployment, prefer versioned Prisma migrations (`prisma migrate deploy`) rather than relying on `db push` for ongoing schema evolution.
- Add rate limiting at the edge or via Redis before public launch. PNR + surname is a low-assurance login method; do not expose airline booking references or payment data in the customer portal.
- Keep API keys in Railway server-side variables only. Never use `NEXT_PUBLIC_` for secrets.

## Project layout
- `app/admin`: admin pages
- `app/portal`: customer pages
- `app/api`: API routes
- `lib`: Prisma, sessions, PNR generation
- `prisma/schema.prisma`: database schema
