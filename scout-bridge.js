'use strict';
/**
 * scout-bridge.js — SE-OS Demo Cockpit ↔ Microsoft Scout (ClawPilot) sidecar.
 *
 * Scout/ClawPilot runs a local sidecar HTTP server on localhost:19823 that accepts
 * JSON commands ({ action:'send', prompt:'…' }) and executes desktop automation
 * (clicks/keystrokes via its Playwright/RDA engine). Used today by
 * se-os/signal-router/workiq-poller.js.
 *
 * Because this runs in Electron's MAIN process (Node), there is NO CORS limit — we
 * do a clean POST and read the response (unlike a browser tab, which must use no-cors).
 *
 * Usage (from main.js):
 *   const scout = require('./scout-bridge');
 *   ipcMain.handle('scout:probe', () => scout.probe());
 *   ipcMain.handle('scout:run',  (_e, step) => scout.run(step));
 */
const http = require('http');

const SIDECAR_HOST = '127.0.0.1';
const SIDECAR_PORT = 19823;

function _request(method, pathname, body, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: SIDECAR_HOST, port: SIDECAR_PORT, path: pathname, method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => resolve({ ok: res.statusCode < 400, status: res.statusCode, body: buf }));
      }
    );
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ ok: false, status: 0, error: 'timeout' }); });
    if (data) req.write(data);
    req.end();
  });
}

/** Is the Scout sidecar reachable? (any HTTP response = up) */
async function probe() {
  const r = await _request('GET', '/', null, 2500);
  return { live: r.status !== 0, status: r.status, error: r.error || null };
}

/**
 * Run one cockpit step on the live app via Scout.
 * step = { what, say, do, fallback_clip } from the storyboard.
 * Translates the action descriptor into a natural-language Scout instruction.
 */
async function run(step) {
  const prompt = step.prompt
    || `${step.what}${step.do ? ` (action: ${step.do})` : ''}`;
  const r = await _request('POST', '/', { action: 'send', prompt }, 12000);
  return {
    ok: r.ok,
    status: r.status,
    sent: prompt,
    fallback: r.ok ? null : (step.fallback_clip || step.fb || null),
    error: r.error || null,
  };
}

module.exports = { probe, run, SIDECAR_HOST, SIDECAR_PORT };