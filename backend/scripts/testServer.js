/**
 * Quick Sanity Check for Express Server and Health Check Route
 */

const http = require('http');
const { app } = require('../server');

const TEST_PORT = 5002;
const server = http.createServer(app);

server.listen(TEST_PORT, () => {
  console.log(`[Test Server] Express server listening on test port ${TEST_PORT}`);

  http.get(`http://127.0.0.1:${TEST_PORT}/api/health`, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`[Test Server] Received response status: ${res.statusCode}`);
      console.log(`[Test Server] Body: ${data}`);

      server.close(() => {
        console.log('[Test Server] Server closed cleanly. Express configuration verified!');
        process.exit(res.statusCode === 200 ? 0 : 1);
      });
    });
  }).on('error', (err) => {
    console.error(`[Test Server] Request failed: ${err.message}`);
    server.close(() => process.exit(1));
  });
});

