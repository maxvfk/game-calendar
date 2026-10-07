import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Ephemeral test-only TLS identity. Never a production/age key or committed key.
export function testCertificate(directory: string, hostname: string) {
  const key = join(directory, 'key.pem'), cert = join(directory, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', key, '-out', cert, '-days', '1', '-subj', `/CN=${hostname}`,
    '-addext', `subjectAltName=DNS:${hostname}`], { stdio: 'ignore' });
  return { key: readFileSync(key, 'utf8'), cert: readFileSync(cert, 'utf8') };
}

// Node hosts the mock peer: Bun 1.3.14's node:tls server-side socket upgrade
// is incomplete. The client under test is still the real native Bun.SQL.
// Only PostgreSQL SSLRequest/startup/authentication, no real DB or credentials.
const peer = String.raw`
const net = require('node:net'), tls = require('node:tls');
const sockets = new Set();
let startupMessages = 0, connections = 0, server;
const ready = Buffer.from([0x52, 0, 0, 0, 8, 0, 0, 0, 0, 0x5a, 0, 0, 0, 5, 0x49]);
process.on('message', message => {
  if (message === 'stats') { process.send({ startupMessages, connections }); return; }
  if (message === 'close') {
    for (const socket of sockets) socket.destroy();
    server.close(() => process.exit(0)); return;
  }
  const identity = message.identity;
  server = net.createServer(socket => {
    connections++; sockets.add(socket); socket.on('error', () => {});
    socket.once('data', request => {
      if (!request.equals(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47]))) {
        startupMessages++; socket.destroy(); return;
      }
      if (!identity) {
        socket.write('N');
        socket.once('data', () => { startupMessages++; socket.write(ready); });
        return;
      }
      socket.write('S', () => {
        const secure = new tls.TLSSocket(socket, { isServer: true, secureContext: tls.createSecureContext(identity) });
        sockets.add(secure); secure.on('error', () => {});
        secure.once('data', () => { startupMessages++; secure.write(ready); });
      });
    });
  });
  server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
});
`;
export async function tlsPostgresServer(identity: { key: string; cert: string } | null) {
  const child = spawn('node', ['-e', peer], { stdio: ['ignore', 'ignore', 'inherit', 'ipc'] });
  const receive = <T>() => new Promise<T>((resolve, reject) => {
    const error = (e: Error) => { child.off('message', message); reject(e); };
    const message = (m: unknown) => { child.off('error', error); resolve(m as T); };
    child.once('message', message); child.once('error', error);
  });
  const ready = receive<{ port: number }>();
  child.send({ identity });
  const { port } = await ready;
  return {
    port,
    async stats() {
      const stats = receive<{ startupMessages: number; connections: number }>();
      child.send('stats'); return await stats;
    },
    async close() {
      const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
      child.send('close'); await exited;
    },
  };
}
