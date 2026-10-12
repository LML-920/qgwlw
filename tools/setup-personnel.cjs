// Run once locally. Commit only token digests; never commit the private files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),privatePath=path.join(root,'config/personnel.private.json');
fs.mkdirSync(path.dirname(privatePath),{recursive:true});
const keys=fs.existsSync(privatePath)?JSON.parse(fs.readFileSync(privatePath)): {admin:crypto.randomBytes(32).toString('hex'),device:crypto.randomBytes(32).toString('hex'),url:'https://qgwlw.netlify.app/.netlify/functions/personnel'};
fs.writeFileSync(privatePath,JSON.stringify(keys,null,2)+'\n');
const hashes=Object.fromEntries(['admin','device'].map(role=>[role,crypto.createHash('sha256').update(keys[role]).digest('hex')]));
hashes.publicEditor=true;
fs.writeFileSync(path.join(root,'netlify/functions/personnel-access.json'),JSON.stringify(hashes,null,2)+'\n');
fs.writeFileSync(path.join(root,'../P4_OneNet/main/iot/personnel_sync.private.h'),`#pragma once\n#define PERSONNEL_URL "${keys.url}"\n#define PERSONNEL_TOKEN "${keys.device}"\n`);
console.log('本地管理口令与基站配置已保存；服务器仅保存校验摘要。');
