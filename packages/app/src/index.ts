import { Producer, jsonSerializer, stringSerializer } from '@platformatic/kafka';
import { Counter, register, collectDefaultMetrics } from '@prometheus-io/client';
import express, { type Express } from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (existsSync(rootEnvPath)) {
  process.loadEnvFile(rootEnvPath);
}

const PORT: number = parseInt(process.env['PORT'] || '3000');
const TOPIC_NAME = process.env['topic-name-rolldice'];
const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] || 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

if (!TOPIC_NAME) {
  throw new Error('Missing required env var: topic-name-rolldice');
}

type RolldiceEvent = {
  event: string;
  value: number;
};

const app: Express = express();
const publicDir = path.join(__dirname, '../public');

const producer = new Producer({
  clientId: 'rolldice-app',
  bootstrapBrokers: KAFKA_BROKERS,
  autocreateTopic: true,
  serializers: {
    key: stringSerializer,
    value: jsonSerializer<RolldiceEvent>,
  },
});

collectDefaultMetrics();

const rolldiceCounter = new Counter({
  name: 'rolldice_requests_total',
  help: 'Total number of /rolldice requests',
  labelNames: ['value'] as const,
});

app.use(express.json());
app.use(express.static(publicDir));

app.post('/rolldice', async (req, res) => {
  const raw = req.body.value;
  if (!raw) {
    res.status(400).send('value is required');
    return;
  }
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    res.status(400).send('value must be a number');
    return;
  }

  try {
    await producer.send({
      messages: [
        {
          topic: TOPIC_NAME,
          value: {
            event: 'rolldice',
            value,
          },
        },
      ],
    });
  } catch (error) {
    console.error('Failed to publish rolldice event', error);
    res.status(502).send('failed to publish event');
    return;
  }

  rolldiceCounter.inc({ value: value.toString() });
  res.send(value.toString());
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});

async function shutdown() {
  server.close();
  await producer.close();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown();
});
process.on('SIGTERM', () => {
  void shutdown();
});
