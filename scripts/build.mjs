import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist';
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function copyDir(src, dst){
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })){
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir('public', dist);

await esbuild.build({
  entryPoints: {
    'background': 'src/background/main.ts',
    'content': 'src/content/main.ts',
    'popup': 'src/popup/main.ts'
  },
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  sourcemap: true,
  outdir: dist
});

console.log('✓ build: dist/ 生成完了');
