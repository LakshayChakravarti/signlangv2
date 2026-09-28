/**
 * start-dev.js
 * Starts all three services for local development.
 * Run with: node start-dev.js
 *
 * Services:
 *   [AI  ] FastAPI  → http://localhost:8000
 *   [SRV ] Express  → http://localhost:5000
 *   [WEB ] Next.js  → http://localhost:3000
 */
const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const children = [];

function run(label, cmd, args, cwd, color) {
  const proc = spawn(cmd, args, { cwd, shell: true, stdio: 'pipe' });
  children.push(proc);
  proc.stdout.on('data', d => process.stdout.write(`\x1b[${color}m[${label}]\x1b[0m ${d}`));
  proc.stderr.on('data', d => process.stderr.write(`\x1b[${color}m[${label}]\x1b[0m ${d}`));
  proc.on('exit', code => {
    if (code !== null) console.log(`\x1b[${color}m[${label}]\x1b[0m exited with code ${code}`);
  });
  return proc;
}

function shutdown() {
  console.log('\n\x1b[36mShutting down all services...\x1b[0m');
  children.forEach(p => {
    try { p.kill('SIGTERM'); } catch (_) {}
  });
  // Give processes 2s to exit gracefully, then force-kill
  setTimeout(() => {
    children.forEach(p => {
      try { p.kill('SIGKILL'); } catch (_) {}
    });
    process.exit(0);
  }, 2000).unref();
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

console.log('\x1b[36m╔══════════════════════════════════╗\x1b[0m');
console.log('\x1b[36m║    Signa Dev Launcher  v2.0      ║\x1b[0m');
console.log('\x1b[36m╚══════════════════════════════════╝\x1b[0m');
console.log('  AI Service  → http://localhost:8000');
console.log('  API Server  → http://localhost:5000');
console.log('  Web Client  → http://localhost:3000');
console.log('  Press Ctrl+C to stop all services.\n');

// 1. AI Service — Python FastAPI (start first, model load takes time)
run('AI  ', 'python', ['-m', 'uvicorn', 'api:app', '--port', '8000', '--reload'],
  path.join(root, 'ai-service'), 33);

// 2. Node API Server — give AI service 2s head-start
setTimeout(() => {
  run('SRV ', 'npm', ['run', 'dev'],
    path.join(root, 'server'), 32);
}, 2000);

// 3. Next.js Client — start after server is likely ready
setTimeout(() => {
  run('WEB ', 'npm', ['run', 'dev'],
    path.join(root, 'client'), 35);
}, 4000);
