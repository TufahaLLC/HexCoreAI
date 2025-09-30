This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

  The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
 
 ## Riot Matches API
 
 An API route is available at `/api/matches` that accepts `gameName` and `tagLine` query parameters (Riot ID in the form `gameName/tagLine`). It will:
 
 - Fetch the player's PUUID via Riot's Account API.
 - Retrieve all match IDs from the last year via Match V5.
 - Fetch match details in batches of 10.
 - Return `{ matches: [...] }` as JSON.
 
### Configuration
 
 Add your Riot API key to an environment file. Create `.env.local` in the project root with:
 
 ```
 RIOT_API_KEY=your_real_riot_api_key_here
 ```
 
Restart the dev server after adding or changing environment variables.
 
### Endpoint
 
 Path (App Router): `src/app/api/matches/route.ts`
 
Request example:
 
```bash
 curl "http://localhost:3000/api/matches?gameName=SomePlayer&tagLine=NA1"
```
 
Response shape:
 
```json
{
  "matches": [
    { /* match data object from Riot */ },
    { /* ... */ }
  ]
}
```
 
Notes:
 
- Requires a valid Riot API key with access to the Match V5 endpoints.
- Basic error messages are returned as `{ error: string }` with HTTP 4xx/5xx codes.
- Requests use `cache: 'no-store'` to avoid stale data.
