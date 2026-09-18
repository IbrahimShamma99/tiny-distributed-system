import { Consumer, jsonDeserializer, stringDeserializer } from '@platformatic/kafka';
import { Counter, register, collectDefaultMetrics } from '@prometheus-io/client';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

const rootEnvPath = path.resolve(import.meta.dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const PORT: number = parseInt(process.env['CONSUMER_PORT'] || '3001');
const topicName = process.env['topic-name-rolldice'];
const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] || 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

if (!topicName) {
  throw new Error('Missing required env var: topic-name-rolldice');
}

const TOPIC_NAME: string = topicName;

type RolldiceEvent = {
  event: string;
  value: number;
};

const app: Express = express();

const consumer = new Consumer({
  groupId: 'rolldice-consumer',
  clientId: 'rolldice-consumer',
  bootstrapBrokers: KAFKA_BROKERS,
  deserializers: {
    key: stringDeserializer,
    value: jsonDeserializer<RolldiceEvent>,
  },
});

collectDefaultMetrics();

const consumedCounter = new Counter({
  name: 'rolldice_events_consumed_total',
  help: 'Total number of rolldice events consumed from Kafka',
  labelNames: ['value'] as const,
});

app.get('/', (_req, res) => {
  res.send('ok');
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});

async function startConsumer(): Promise<void> {
  const stream = await consumer.consume({
    autocommit: true,
    topics: [TOPIC_NAME],
  });

  console.log(`Consuming topic: ${TOPIC_NAME}`);

  for await (const message of stream) {
    const event = message.value;
    if (!event) {
      console.warn('Received empty message value');
      continue;
    }

    console.log('Consumed rolldice event', event);
    consumedCounter.inc({ value: event.value.toString() });
  }
}

void startConsumer().catch((error) => {
  console.error('Kafka consumer failed', error);
  process.exit(1);
});

async function shutdown() {
  server.close();
  await consumer.close(true);
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
