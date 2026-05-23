#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, '..', 'frontend');

const CYAN   = '\x1b[36m';
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

function run(label, cmd, cwd = ROOT) {
  const start = Date.now();
  process.stdout.write(`${CYAN}▶${RESET} ${label}... `);
  try {
    execSync(cmd, { cwd, stdio: 'pipe', env: { ...process.env, NODE_ENV: 'test' } });
    const ms = Date.now() - start;
    console.log(`${GREEN}✓${RESET} ${ms}ms`);
    return true;
  } catch (err) {
    const ms = Date.now() - start;
    console.log(`${RED}✗${RESET} ${ms}ms`);
    if (err.stdout) console.log(err.stdout.toString().slice(0, 1500));
    if (err.stderr) console.log(err.stderr.toString().slice(0, 800));
    return false;
  }
}

const results = [];

console.log(`\n${BOLD}╔══════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}║    AURORE — CI TEST RUNNER           ║${RESET}`);
console.log(`${BOLD}╚══════════════════════════════════════╝${RESET}\n`);

console.log(`${YELLOW}── Backend (Discord/) ──────────────────${RESET}`);
results.push(['Security unit tests',    run('Security unit tests',    'npx jest tests/unit/security.test.js  --runInBand --forceExit --silent')]);
results.push(['Cache unit tests',       run('Cache unit tests',       'npx jest tests/unit/cache.test.js     --runInBand --forceExit --silent')]);
results.push(['DB unit tests',          run('DB unit tests',          'npx jest tests/unit/db.test.js        --runInBand --forceExit --silent')]);
results.push(['API integration tests',  run('API integration tests',  'npx jest tests/integration/api.test.js --runInBand --forceExit --silent')]);

console.log(`\n${YELLOW}── Coverage ────────────────────────────${RESET}`);
results.push(['Coverage report',        run('Coverage report',        'npx jest --coverage --runInBand --forceExit --silent --coverageReporters=text-summary')]);

const passed = results.filter(([, ok]) => ok).length;
const failed = results.filter(([, ok]) => !ok).length;

console.log(`\n${BOLD}── Resultado ───────────────────────────${RESET}`);
for (const [label, ok] of results) {
  console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${RESET} ${label}`);
}
console.log(`\n  Total: ${GREEN}${passed} ok${RESET}  ${failed > 0 ? RED + failed + ' fallidos' + RESET : ''}`);
console.log('────────────────────────────────────────\n');

process.exit(failed > 0 ? 1 : 0);
