#!/usr/bin/env node
'use strict';

const http = require('http');
const path = require('path');
const { URL } = require('url');
const { AutonomySystem } = require('../core/autonomy/system_engine');

const PORT = Number(process.env.AUTONOMY_PORT || 4010);
const HOST = '127.0.0.1';
const system = new AutonomySystem({ baseDir: path.join(__dirname, '..') });
const boot = system.boot();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload, null, 2));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk.toString('utf8');
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);

  if (request.method === 'GET' && url.pathname === '/status') {
    sendJson(response, 200, system.status());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/task') {
    try {
      const body = await collectBody(request);
      const result = system.runTask(body);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/kill-switch') {
    try {
      const body = await collectBody(request);
      sendJson(response, 200, system.setKillSwitch(body.enabled));
    } catch (error) {
      sendJson(response, 400, {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname === '/self-tasks') {
    sendJson(response, 200, {
      success: true,
      tasks: system.generateSelfTasks(),
    });
    return;
  }

  sendJson(response, 404, {
    success: false,
    message: 'Route not found',
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[AUTONOMY] runtime started at http://${HOST}:${PORT}`);
  console.log(`[AUTONOMY] active agents: ${boot.agents.active}/${boot.agents.total}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
