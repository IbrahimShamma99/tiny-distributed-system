import { Counter, register, collectDefaultMetrics } from '@prometheus-io/client';
import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT: number = parseInt(process.env['PORT'] || '3000');
const app: Express = express();
const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public');

collectDefaultMetrics();

const rolldiceCounter = new Counter({
  name: 'rolldice_requests_total',
  help: 'Total number of /rolldice requests',
  labelNames: ['value'] as const,
});

app.use(express.json());
app.use(express.static(publicDir));

app.post('/rolldice', (req, res) => {
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

  rolldiceCounter.inc({ value: value.toString() });
  res.send(value.toString());
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
