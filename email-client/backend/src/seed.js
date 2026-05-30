const { Account, Message } = require('./models');
const { threadKeyFor } = require('./threading');
const { classify } = require('./priority');

const ME = { id: 'me', name: 'You', email: 'you@example.com' };
const SAMPLES = [
  { fromName: 'GitHub', fromAddress: 'noreply@github.com', subject: 'New sign-in to your account', body: 'A new sign-in was detected from macOS.\n\nIf this was you, no action is needed.' },
  { fromName: 'Stripe', fromAddress: 'receipts@stripe.com', subject: 'Your receipt from Acme [#1023]', body: 'Thanks for your payment of $19.00.\n\nVisit dashboard for details.' },
  { fromName: 'Alice', fromAddress: 'alice@example.com', subject: 'Lunch tomorrow?', body: 'Hey! Want to grab lunch at the new ramen place?' },
  { fromName: 'Alice', fromAddress: 'alice@example.com', subject: 'Re: Lunch tomorrow?', body: '12:30 works for me. See you then!' },
  { fromName: 'Bob', fromAddress: 'bob@example.com', subject: 'Design doc draft', body: 'Putting together a draft for the auth refactor. Will share by EOD.' },
  { fromName: 'LinkedIn', fromAddress: 'jobs@linkedin.com', subject: 'New jobs that match your search', body: '5 new Software Engineer roles in your area.' },
  { fromName: 'Carol', fromAddress: 'carol@example.com', subject: 'Vacation photos', body: 'Finally got around to uploading. Check them out!' },
  { fromName: 'Apple', fromAddress: 'no_reply@email.apple.com', subject: 'Your subscription renews soon', body: 'iCloud+ (50 GB) will renew on June 4 for $0.99.' },
];

async function seed() {
  if (await Account.count() > 0) return;
  await Account.create(ME);

  const now = Date.now();
  await Message.bulkCreate(SAMPLES.map((m, i) => ({
    accountId: ME.id,
    folder: 'inbox',
    fromName: m.fromName,
    fromAddress: m.fromAddress,
    toAddress: ME.email,
    subject: m.subject,
    body: m.body,
    priority: classify(m),
    threadKey: threadKeyFor(m.subject),
    read: i > 4,
    receivedAt: new Date(now - i * 3600 * 1000),
  })));
}

module.exports = seed;
