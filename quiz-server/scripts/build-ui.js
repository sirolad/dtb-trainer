import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(root, 'public/quiz.template.html');
const outputPath = resolve(root, 'public/quiz.html');

const result = await build({
  entryPoints: [resolve(root, 'src/quiz-ui.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  write: false
});

const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const template = await readFile(templatePath, 'utf8');
await writeFile(outputPath, template.replace('<!-- APP_SCRIPT -->', () => script));
