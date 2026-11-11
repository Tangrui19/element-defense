import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const moduleOrder = [
  'src/utils.js',
  'src/config.js',
  'src/path.js',
  'src/entities.js',
  'src/combat.js',
  'src/wave-manager.js',
  'src/game.js',
  'src/renderer.js',
  'src/ui.js',
  'src/main.js',
];

const sources = [];
for (const relativePath of moduleOrder) {
  let source = await readFile(resolve(root, relativePath), 'utf8');
  source = source.replace(/^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"];\s*$/gm, (_, specifiers) => {
    const aliases = specifiers.split(',')
      .map(specifier => specifier.trim())
      .map(specifier => specifier.split(/\s+as\s+/))
      .filter(([, alias]) => alias)
      .map(([original, alias]) => `const ${alias} = ${original};`);
    return aliases.join('\n');
  });
  source = source.replace(/\bexport\s+(?=(?:const|let|var|class|function)\b)/g, '');
  sources.push(`// ---- ${relativePath} ----\n${source.trim()}`);
}

let html = await readFile(resolve(root, 'index.html'), 'utf8');
const css = await readFile(resolve(root, 'style.css'), 'utf8');
const script = `(() => {\n  'use strict';\n\n${sources.join('\n\n')}\n})();`;

html = html.replace(
  '<link rel="stylesheet" href="style.css" />',
  `<style>\n${css}\n</style>`,
);
html = html.replace(
  '<script type="module" src="src/main.js"></script>',
  `<script>\n${script}\n</script>`,
);

if (html.includes('src="src/main.js"') || html.includes('href="style.css"')) {
  throw new Error('Standalone build still contains external local references.');
}

const outputPath = resolve(root, '元素塔防-双击即玩.html');
await writeFile(outputPath, html, 'utf8');
console.log(`Standalone build written to ${outputPath}`);










