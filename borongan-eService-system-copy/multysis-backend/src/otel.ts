/**
 * OpenTelemetry bootstrap — must run BEFORE any instrumented module is imported
 * (express, prisma, ioredis, http). `src/index.ts` imports this file as its
 * very first line so the auto-instrumentation can patch `require` in time.
 *
 * No-op when `OTEL_EXPORTER_OTLP_ENDPOINT` is unset, so local/test runs stay
 * free of APM overhead. In production, set the endpoint (Tempo, Honeycomb,
 * Datadog, etc.) and this exports traces over OTLP/HTTP.
 */

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (!endpoint) {
  // Explicit log keeps the silent-default visible in startup output.
  console.log('ℹ️  OpenTelemetry disabled (OTEL_EXPORTER_OTLP_ENDPOINT not set)');
} else {
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const {
    getNodeAutoInstrumentations,
  } = require('@opentelemetry/auto-instrumentations-node');
  const {
    OTLPTraceExporter,
  } = require('@opentelemetry/exporter-trace-otlp-http');
  const { resourceFromAttributes } = require('@opentelemetry/resources');
  const {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
  } = require('@opentelemetry/semantic-conventions');

  const serviceName = process.env.OTEL_SERVICE_NAME || 'multysis-backend';
  const serviceVersion = process.env.OTEL_SERVICE_VERSION || '2.0.0';

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
      'deployment.environment': process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({
      url: endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs is far too noisy at 80k-user scale — one span per file open.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    console.log(`📊 OpenTelemetry started — exporting to ${endpoint} (service=${serviceName})`);
  } catch (err) {
    // Never block startup on APM failure.
    console.warn('⚠️  OpenTelemetry failed to start:', (err as Error).message);
  }

  const shutdown = (): void => {
    sdk
      .shutdown()
      .then(() => console.log('📊 OpenTelemetry shut down'))
      .catch((err: Error) => console.warn('⚠️  OpenTelemetry shutdown error:', err.message));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

export {};
