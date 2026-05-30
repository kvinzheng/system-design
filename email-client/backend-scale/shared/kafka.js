// Shared Kafka client. One Kafka instance per process, producers/consumers
// created lazily. KafkaJS handles reconnect + rebalance internally.

const { Kafka, logLevel } = require('kafkajs');

const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'email-client',
  brokers: BROKERS,
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 300, retries: 8 },
});

let _producer = null;
async function getProducer() {
  if (_producer) return _producer;
  _producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,         // exactly-once-on-broker (within a session)
    maxInFlightRequests: 5,
    transactionTimeout: 30_000,
  });
  await _producer.connect();
  return _producer;
}

function makeConsumer(groupId) {
  return kafka.consumer({
    groupId,
    sessionTimeout: 30_000,
    heartbeatInterval: 3_000,
    rebalanceTimeout: 60_000,
  });
}

function admin() { return kafka.admin(); }

module.exports = { kafka, getProducer, makeConsumer, admin };
