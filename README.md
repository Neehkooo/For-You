# For You

A small site for writing a letter, sealing it with a four or six-digit passcode, and sharing it as a link.

## Run it on your computer

    npm install
    npm run dev

## Put it live on Vercel

1. Push this folder to a GitHub repository, or run `npx vercel` inside the folder.
2. In Vercel, import the project. It detects Vite automatically (build: `npm run build`, output: `dist`).
3. In the project's **Storage** tab, add **Upstash for Redis** and connect it to the project. This creates the database and injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*` equivalents) into the deployment.
4. Redeploy. Short links (`https://foryou-letter.vercel.app/<16-character-code>`) and server-side scheduled delivery start working.

Without step 3 the site still works seamlessly: letters use client-side encrypted links that carry the letter inside the URL, and scheduled letters feature a live countdown timer until the unlock date. The editor tells you when a letter fell back to the long link. Connecting Upstash gives you short 16-character links and server-side letter withholding.

## Notes

- Letters are encrypted in the browser with the passcode. The server stores only the encrypted letter.
- Stored letters expire after two years.
- Four-digit passcodes can be guessed by someone who has the link, so don't rely on them for sensitive information. Six-digit passcodes are stronger; letters sealed with either length still open with the length they were created with.
