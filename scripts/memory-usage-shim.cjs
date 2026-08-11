'use strict';

const originalMemoryUsage = process.memoryUsage.bind(process);

try {
  originalMemoryUsage();
} catch (error) {
  if (!error || error.code !== 'ENOENT' || error.syscall !== 'uv_resident_set_memory') throw error;
  const fallback = () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 });
  fallback.rss = () => 0;
  Object.defineProperty(process, 'memoryUsage', { configurable: true, value: fallback });
}