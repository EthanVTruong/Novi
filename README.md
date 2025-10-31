Novi — Text-to-Pay on Solana

⚠️ **Note:** This project has only been tested on **Solana Devnet** so far. Do not use this in production / mainnet without additional testing and audits.

Novi makes on-chain Solana payments ridiculously simple — no copying or sharing wallet addresses. Create a link, share it, and friends pay you instantly in USDC. Great for splitting bills, paying back friends, or quick on-chain transfers.

Features
- Create single payment requests (shareable HTTPS link).
- Create split payment requests (auto-calc per-person amount + shareable link).
- Recipient-facing `/transfer` page that prompts payers to sign and finalize the transaction using their connected wallet.
- Uses connected wallet for signing and shows recipient wallet for verification on the transfer page.
- Copies links to clipboard and shows a “Payment link ready” UI.
- Minimal UI built with Tailwind CSS. Deploys easily to Vercel.

## Repo layout
```

/public
NoviLogo.PNG
NoviLogoInvert.png
/src
/pages
Index.tsx
TransferRedirect.tsx
Request.tsx
Pay.tsx
/components
PaymentSplitForm.tsx
ui/button.tsx
main.tsx
vite.config.ts
vercel.json
tailwind.config.js
package.json
README.md

---

## Quick start (local)

1. Install dependencies
```bash
npm install
````

2. Run dev server

```bash
npm run dev
# Open http://localhost:5173
```

3. Build & Preview (test production build locally)

```bash
npm run build
npm run preview
# preview usually runs at http://localhost:4173
```

---

## Build & Deploy (Vercel)

**Recommended Vercel setup**

1. Ensure `package.json` scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

2. Add `vercel.json` to repo root:

```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

3. `vite.config.ts` — important bits:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: './', // important for Vercel asset paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      buffer: 'buffer'
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  }
});
```

4. Push to GitHub, import into Vercel. Vercel will run `npm run build` and serve the `dist/` folder.

---

How it works

1. Creator fills amount, label, message on Request page.
2. App generates a link:

```
example: https://yourdomain/transfer?recipient=<RECIPIENT>&amount=<AMOUNT>&label=...&message=...
```

3. Link is auto-copied to clipboard and shown in a “Payment link ready” UI for the creator to share.

OR Create a split payment

1. Creator enters total and number of participants.
2. App computes `amount = total / participants`, builds per-person links, auto-copies link(s), and shows “Payment link ready”.

### Pay (payer / recipient of the link)

1. Payer opens `/transfer?recipient=...&amount=...`.
2. The page reads the query params and displays: amount, purpose, and recipient short address for verification.
3. Payer connects wallet, clicks **Pay $X**, signs, and the app programmatically sends the `SystemProgram.transfer` transaction.
4. App waits for confirmation (finalized) and shows a success screen with the transaction signature and explorer link.

---

## Implementation notes & snippets

### Buffer polyfill (put at top of `main.tsx`)

Some Solana libraries expect `Buffer` in browser. Add:

```ts
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}
```

### Copy-to-clipboard helper

```ts
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
};
```

### Sending a simple SOL transfer (example)

```ts
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

const { publicKey, sendTransaction } = useWallet();
const { connection } = useConnection();

const handlePay = async (recipientStr, amountSOL) => {
  if (!publicKey) throw new Error("Connect wallet");
  const recipient = new PublicKey(recipientStr);
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: recipient,
      lamports: Math.round(Number(amountSOL) * LAMPORTS_PER_SOL),
    })
  );
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, "finalized");
  return sig;
};
```

---

## Troubleshooting (common issues)

### Blank page on Vercel

* Open browser console and check runtime errors (e.g., `Buffer is not defined`).
* Ensure `vite.config.ts` has `base: './'`.
* Ensure `vercel.json` routes requests to `index.html` for SPA routing.

### `Buffer is not defined`

* Install `buffer`:

```bash
npm install buffer
```

* Add the polyfill snippet to `main.tsx` (see above).

### `vite build` exits with code 127 on Vercel

* Ensure `vite` is in `devDependencies`:

```bash
npm install -D vite @vitejs/plugin-react-swc
```

* Confirm `build` script is `"vite build"`.

### Links in messaging apps (Telegram) not opening wallet

* In-app browsers often block `solana:` custom protocol links. Always share the HTTPS `/transfer?...` link (the page will redirect or prompt correctly in the system browser).

---

## Testing & Network

* **This project has only been tested on Solana Devnet.** Mainnet behaviour, fees, and token mints may differ — test thoroughly and audit before using with real funds.

---

## Contributing

1. Fork the repo → create a branch → open a PR.
2. Keep UX consistent: links copied by default; `/transfer` finalizes payments.
3. Add tests for changes to payment splitting or transaction logic.

---

## License

MIT

---
