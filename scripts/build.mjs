import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';


const root = process.cwd();
const dist = path.join(root, 'dist');
await fsp.rm(dist, { recursive: true, force: true });
await fsp.mkdir(dist, { recursive: true });


// public 配下をそのままコピー
function copyDir(src, dst){
fs.mkdirSync(dst, { recursive: true });
for (const ent of fs.readdirSync(src, { withFileTypes: true })){
const s = path.join(src, ent.name);
const d = path.join(dst, ent.name);
if (ent.isDirectory()) copyDir(s, d);
else fs.copyFileSync(s, d);
}
}
copyDir(path.join(root, 'public'), dist);


// JS を dist 直下へ（パスは manifest.json と一致させる）
fs.copyFileSync(path.join(root, 'src/background/background.js'), path.join(dist, 'background.js'));
fs.copyFileSync(path.join(root, 'src/content/content.js'), path.join(dist, 'content.js'));


console.log('✓ build: dist/ 生成完了');
