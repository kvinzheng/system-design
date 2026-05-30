// One-shot script: create Kafka topics needed by the pipeline.
// Idempotent — safe to run on every boot.
//
//   notif.events            — global firehose, partitioned by userId
//   notif.inbox             — durable per-user inbox (compacted, long retention)
//   notif.gateway.<id>      — per-gateway delivery topics (created on demand)

const { admin } = require('../shared/kafka');

const GATEWAY_IDS = (process.env.GATEWAY_IDS || 'g1,g2').split(',');

(async () => {
  const a = admin();
  await a.connect();
  const existing = new Set(await a.listTopics());

  const want = [
    {
      topic: 'notif.events',
      numPartitions: 12,           // bump to 1000+ in prod
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: String(7 * 24 * 3600 * 1000) }],
    },
    {
      topic: 'notif.inbox',
      numPartitions: 12,
      replicationFactor: 1,
      configEntries: [
        { name: 'cleanup.policy', value: 'compact' },  // keep latest per key
        { name: 'retention.ms', value: String(30 * 24 * 3600 * 1000) },
      ],
    },
    ...GATEWAY_IDS.map((id) => ({
      topic: `notif.gateway.${id}`,
      numPartitions: 4,
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: String(60 * 1000) }], // ephemeral
    })),
  ].filter((t) => !existing.has(t.topic));

  if (want.length === 0) { console.log('[topics] all present'); }
  else {
    await a.createTopics({ topics: want });
    console.log('[topics] created:', want.map((t) => t.topic).join(', '));
  }
  await a.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
