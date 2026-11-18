// Token Radar, radar-2 entry point (Node 22, standard library only).
//
// What this program does, in order:
//   1. reads the sealed snapshot (a directory holding snapshot.json, or the
//      file itself) from /input, or from --input when run outside the grader;
//   2. scores every pre-token protocol with the radar-2 model in lib/model.ts;
//   3. refuses to write anything when the board would fail the gate, so a
//      broken model is caught here instead of in front of the judge;
//   4. writes board.json and the dashboard's data.js into the output dir;
//   5. copies this repository's dashboard/ and screenshots/ into it;
//   6. writes dossier.json last, with the vendored make.fun library, so the
//      dossier is built from exactly the files the scorer will read.
//
// The dashboard is a static page with no network: dashboard/index.html,
// dashboard/app.css and dashboard/app.js read data.js, which this program
// writes from the same board the judge grades. Screenshots and code agree
// because both come from the same run.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, categorySummary, dataScript, parseSnapshot, rankReason } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** Where this file lives, so dashboard/ and screenshots/ are found beside it. */
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

/** The gate's own caps: the text cap shapes the dossier, the rest refuse. */
const DOSSIER_TEXT_CAP = 65_536;
const SHOT_LIMIT = { max: 4, max_bytes: 524_288 };
const DASHBOARD_LIMIT = { max_files: 400, max_bytes: 4_194_304 };
const SHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const SHOT_SUFFIX = /\.(png|jpe?g)$/i;

/** Fail with a message on stderr and the given exit code. */
function fail(message: string, code: number): never {
  process.stderr.write(`token radar: ${message}\n`);
  process.exit(code);
}

/** The value of --name <value>, --name=<value>, or the fallback. */
function flag(name: string, fallback: string): string {
  const argv = process.argv;
  const at = argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < argv.length) return argv[at + 1]!;
  const joined = argv.find((a) => a.startsWith(`--${name}=`));
  return joined === undefined ? fallback : joined.slice(name.length + 3);
}

/** Copy one directory's regular files into `to`, skipping dotfiles, and name what it copied. */
function copyDir(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const source = join(from, name);
    if (!statSync(source).isFile()) continue;
    copyFileSync(source, join(to, name));
    copied.push(name);
  }
  return copied;
}

const inputArg = flag('input', '/input');
const snapshotPath = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(snapshotPath)) {
  fail(
    `no snapshot at ${snapshotPath}: pass --input <snapshot.json|directory> or mount the sealed /input`,
    2,
  );
}
const outDir = flag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(snapshotPath, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const problem = boardIssue(board, snapshot);
if (problem !== null) {
  fail(`the model wrote a board the gate refuses: ${problem}`, 1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(outDir, 'data.js'), dataScript(radar));

const dashboardFiles = copyDir(join(repoRoot, 'dashboard'), join(outDir, 'dashboard'));
const shots = copyDir(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'));
if (shots.length < 3) {
  fail(
    `screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view`,
    1,
  );
}
for (const name of shots) {
  if (!SHOT_NAME.test(name)) {
    fail(`screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters`, 1);
  }
  if (!SHOT_SUFFIX.test(name)) {
    fail(`screenshots/${name}: hand in PNG or JPEG images only`, 1);
  }
}

// The dossier is written last: the scorer rebuilds it from this output and compares bytes.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: SHOT_LIMIT,
    dashboard: DASHBOARD_LIMIT,
  }),
);

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ` +
    `${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(outDir, 'board.json')}, ${join(outDir, 'data.js')}, ` +
    `${join(outDir, 'dashboard')} (${dashboardFiles.length} files), ` +
    `${join(outDir, 'screenshots')} (${shots.length} images) and ${join(outDir, 'dossier.json')}\n`,
);
for (const row of board.slice(0, 3)) {
  process.stdout.write(`token radar: #${row.rank} ${row.name} — ${rankReason(row)}\n`);
}
for (const cat of categorySummary(board).slice(0, 5)) {
  process.stdout.write(
    `token radar: ${cat.category}: ${cat.rows} rows at ${cat.multiple}, best ${cat.best}\n`,
  );
}
