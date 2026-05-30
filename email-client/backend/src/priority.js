// Server-side priority classifier. In a real system this is the user's "rules" engine
// (Outlook Inbox Rules / Apple VIP / Gmail importance markers). Keep simple, deterministic.

const HIGH_SENDERS = [/@yourboss\.com$/i, /^alice@/i]; // VIP / boss
const HIGH_KEYWORDS = [/\burgent\b/i, /\basap\b/i, /\[security\]/i, /^re:.*urgent/i];
const LOW_SENDERS = [/no[-_]?reply/i, /jobs@/i, /newsletter@/i, /noreply@/i, /receipts?@/i, /notifications?@/i];
const LOW_KEYWORDS = [/unsubscribe/i, /promo(tion)?/i, /^digest\b/i];

function classify({ fromAddress = '', subject = '', body = '' }) {
  const text = `${subject}\n${body}`;
  if (HIGH_SENDERS.some(r => r.test(fromAddress))) return 'high';
  if (HIGH_KEYWORDS.some(r => r.test(text))) return 'high';
  if (LOW_SENDERS.some(r => r.test(fromAddress))) return 'low';
  if (LOW_KEYWORDS.some(r => r.test(text))) return 'low';
  return 'medium';
}

module.exports = { classify };
