/**
 * Vercel Edge Function for Dynamic OG Meta Tags
 *
 * This function intercepts /transfer requests from bots/crawlers (WhatsApp, Telegram, etc.)
 * and serves dynamic HTML with custom Open Graph meta tags based on payment parameters.
 *
 * For real users, it serves the normal SPA.
 */

export const config = {
  runtime: 'edge',
};

// Bot user agents to detect link preview requests
const BOT_USER_AGENTS = [
  'facebookexternalhit',
  'facebot',
  'WhatsApp',
  'Telegram',
  'Slackbot',
  'TwitterBot',
  'LinkedInBot',
  'Discordbot',
  'iMessageBot',
  'SkypeUriPreview',
  'applebot',
];

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot.toLowerCase()));
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const userAgent = req.headers.get('user-agent') || '';

  // Extract payment parameters from URL
  const recipient = searchParams.get('recipient') || '';
  const amount = searchParams.get('amount') || '0';
  const label = searchParams.get('label') || 'payment';
  const message = searchParams.get('message') || '';
  const total = searchParams.get('total');
  const splitCount = searchParams.get('splitCount');

  // Determine if this is a split payment
  const isSplitPayment = splitCount && total;

  // Build dynamic meta tags
  const title = isSplitPayment
    ? `$${amount} split payment for ${label}`
    : `$${amount} payment for ${label}`;

  const description = isSplitPayment
    ? `Pay $${amount} instantly in USDC on Solana for ${label}. Your share of $${total} split among ${splitCount} people.`
    : `Pay $${amount} instantly in USDC on Solana for ${label}`;

  const imageUrl = `${url.origin}/NoviLogo.PNG`;
  const fullUrl = req.url;

  // If it's a bot/crawler, serve HTML with dynamic OG tags
  if (isBot(userAgent)) {
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:image" content="${imageUrl}" />

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <!-- Additional Meta Tags -->
    <meta name="description" content="${description}" />

    <!-- Redirect to SPA after bots have scraped -->
    <meta http-equiv="refresh" content="0;url=${fullUrl}" />
  </head>
  <body>
    <div style="text-align: center; padding: 50px; font-family: system-ui;">
      <h1>${title}</h1>
      <p>${description}</p>
      <p style="color: #666;">Redirecting to payment page...</p>
    </div>
  </body>
</html>`;

    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
        'cache-control': 'public, max-age=60, s-maxage=60',
      },
    });
  }

  // For real users, serve the normal SPA index.html
  const indexResponse = await fetch(`${url.origin}/index.html`);
  const indexHtml = await indexResponse.text();

  return new Response(indexHtml, {
    headers: {
      'content-type': 'text/html;charset=UTF-8',
    },
  });
}
