# For You

A small site for writing a letter, sealing it with a four-digit passcode, and sharing it as a link.

## Run it on your computer

    npm install
    npm run dev

## Put it live on Vercel

1. Push this folder to a GitHub repository, or run `npx vercel` inside the folder.
2. In Vercel, import the project. It detects Vite automatically (build: `npm run build`, output: `dist`).
3. In the project's **Storage** tab, add **Upstash for Redis** and connect it to the project. This creates the database and its keys.
4. Redeploy. Short links (`/l/abc123`) and scheduled delivery start working.

Without step 3 the site still works. Letters use long links that carry the letter inside the URL, and scheduled delivery is turned off.

## Notes

- Letters are encrypted in the browser with the passcode. The server stores only the encrypted letter.
- Stored letters expire after two years.
- Four-digit passcodes can be guessed by someone who has the link, so don't rely on them for sensitive information.
