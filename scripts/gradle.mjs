// Runs a Gradle wrapper task in an Android project folder on any OS (KAN-71):
//   node scripts/gradle.mjs android-panel/android assembleDebug
// Uses an absolute wrapper path, so it works even where cmd.exe does not search the current folder.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const [dir, ...tasks] = process.argv.slice(2);
if (!dir || tasks.length === 0) {
  console.error('usage: node scripts/gradle.mjs <android project dir> <task…>');
  process.exit(2);
}
const cwd = path.resolve(dir);
const win = process.platform === 'win32';
const wrapper = path.join(cwd, win ? 'gradlew.bat' : 'gradlew');
const r = spawnSync(win ? `"${wrapper}"` : wrapper, tasks, { cwd, stdio: 'inherit', shell: win });
process.exit(r.status ?? 1);
