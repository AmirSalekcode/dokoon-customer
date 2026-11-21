// Capacitor needs an index.html entry in its webDir; the panel's shell is panel.html (D-91).
// Copies dist-panel/panel.html → dist-panel/index.html before `cap sync` (KAN-71). Web hosting is
// unaffected: the panel image serves panel.html and builds its own dist-panel.
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist-panel');
const shell = path.join(dist, 'panel.html');
if (!existsSync(shell)) {
  console.error('dist-panel/panel.html not found: run `npm run build:panel` (or build:panel:mock) first');
  process.exit(1);
}
copyFileSync(shell, path.join(dist, 'index.html'));
console.log('dist-panel/index.html ← panel.html');
