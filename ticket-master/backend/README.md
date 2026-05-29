# Ticketmaster Backend

## Setup
1. Copy `.env` and set your DB/Redis/Stripe credentials.
2. Run `npm install`.
3. Start PostgreSQL and Redis locally.
4. Run `npm start` to launch the backend.

## Features
- Event search and details (with caching)
- Ticket booking with distributed lock (Redis)
- Transactional booking (no double booking)
- Stripe payment integration (mocked)
- Production error handling
