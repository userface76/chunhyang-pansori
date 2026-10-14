// Copy public website files only. Never expose Worker source, SQL, or config files.
import { readdir, mkdir, copyFile, cp, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';
const root=process.cwd(),out=join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const publicExt=new Set(['.html','.css','.js','.png','.jpg','.jpeg','.webp','.gif','.svg','.ico','.webmanifest','.txt']);
for(const ent of await readdir(root,{withFileTypes:true})){
  if(ent.isFile()&&publicExt.has(extname(ent.name).toLowerCase()))await copyFile(join(root,ent.name),join(out,ent.name));
}
await cp(join(root,'assets'),join(out,'assets'),{recursive:true});
console.log('Prepared static website files in dist/');
