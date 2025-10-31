import { useEffect } from 'react';

/**
 * Custom hook to dynamically update Open Graph meta tags for payment pages
 *
 * This updates meta tags on the client side for SEO and social sharing.
 * Works in conjunction with the server-side edge function for bot detection.
 */

interface PaymentMetaTagsOptions {
  amount?: string | null;
  label?: string | null;
  message?: string | null;
  total?: string | null;
  splitCount?: string | null;
}

export function usePaymentMetaTags(options: PaymentMetaTagsOptions) {
  const { amount, label, message, total, splitCount } = options;

  useEffect(() => {
    if (!amount || !label) return;

    const isSplitPayment = splitCount && total;

    // Build dynamic title and description
    const title = isSplitPayment
      ? `$${amount} split payment for ${label}`
      : `$${amount} payment for ${label}`;

    const description = isSplitPayment
      ? `Pay $${amount} instantly in USDC on Solana for ${label}. Your share of $${total} split among ${splitCount} people.`
      : `Pay $${amount} instantly in USDC on Solana for ${label}. Fast & secure!`;

    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isName = false) => {
      const attribute = isName ? 'name' : 'property';
      let tag = document.querySelector(`meta[${attribute}="${property}"]`);

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, property);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    };

    // Update Open Graph tags
    updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);

    // Update Twitter Card tags
    updateMetaTag('twitter:title', title, true);
    updateMetaTag('twitter:description', title, true);

    // Update standard meta description
    updateMetaTag('description', description, true);

    // Cleanup on unmount - restore default tags
    return () => {
      document.title = 'Novi | Text To Pay on Solana';
      updateMetaTag('og:title', 'Novi | Text To Pay on Solana');
      updateMetaTag('og:description', 'Text to pay on Solana. Simple, fast, and secure payments through text messages.');
      updateMetaTag('description', 'Text to pay on Solana. Simple, fast, and secure payments through text messages.', true);
    };
  }, [amount, label, message, total, splitCount]);
}
