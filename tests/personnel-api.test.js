const {handle,digest}=require('../netlify/lib/personnel-core.cjs');
const assert=require('node:assert/strict'),test=require('node:test');
function fixture(){const entries=new Map();let version=0;const store={async get(k){return entries.get(k)?.data||null;},async getWithMetadata(k){return entries.get(k)||null;},async getMetadata(k){return entries.has(k)?{}:null;},async set(k,data){entries.set(k,{data,etag:String(++version)});},async setJSON(k,data,options={}){const existing=entries.get(k);if(options.onlyIfNew&&existing||options.onlyIfMatch&&options.onlyIfMatch!==existing?.etag)return {modified:false};entries.set(k,{data:structuredClone(data),etag:String(++version)});return {modified:true};}};const access={admin:digest('admin'),device:digest('device')};return {store,call:(role,method,body,query={})=>handle({method,query,body,authorization:'Bearer '+role},store,access)};}
const worker={id:'EMP-001',name:'张三',role:'巡检员',team:'一班',device:'ESP32S3',avatar:'/static/workers/worker_1.png'};
test('passwordless editor supports CRUD while a device token is still required to ACK',async()=>{
  const f=fixture(),access={publicEditor:true,device:digest('device')};
  const call=(method,body,query={},authorization)=>handle({method,body,query,authorization},f.store,access);
  assert.equal((await call('GET')).status,200);
  assert.equal((await call('POST',{revision:0,employees:[worker]})).status,200);
  assert.equal((await call('POST',{revision:1,employees:[{...worker,name:'修改姓名'}]})).body.employees[0].name,'修改姓名');
  assert.equal((await call('POST',{revision:2,count:1},{action:'ack'})).status,403);
  assert.equal((await call('POST',{revision:2,count:1},{action:'ack'},'Bearer device')).status,200);
  assert.equal((await call('GET',null,{},'Bearer wrong')).status,401);
  assert.equal((await call('POST',{revision:2,employees:[]})).status,200);
  assert.equal((await call('GET')).body.employees.length,0);
});
test('private API refuses unknown tokens and device writes',async()=>{const f=fixture();assert.equal((await f.call('wrong','GET')).status,401);assert.equal((await f.call('device','POST',{revision:0,employees:[worker]})).status,403);});
test('profiles use revisions and retain monotonically increasing IDs after deletion',async()=>{const f=fixture();assert.equal((await f.call('admin','POST',{revision:0,employees:[{...worker,id:'EMP-017'}]})).status,200);assert.equal((await f.call('admin','POST',{revision:0,employees:[]})).status,409);const removed=await f.call('admin','POST',{revision:1,employees:[]});assert.equal(removed.body.nextId,18);assert.deepEqual(removed.body.employees,[]);});
test('reject duplicate identity and multiple physical bindings',async()=>{const f=fixture();for(const employees of [[worker,worker],[worker,{...worker,id:'EMP-002'}]])assert.equal((await f.call('admin','POST',{revision:0,employees})).status,400);});
test('P4 gets compact profiles and must acknowledge matching revision and count',async()=>{const f=fixture();await f.call('admin','POST',{revision:0,employees:[worker]});const compact=await f.call('device','GET');assert.equal(compact.body.employees[0].avatar,undefined);assert.equal((await f.call('device','GET',null,{since:'1'})).status,304);assert.equal((await f.call('device','POST',{revision:1,count:2},{action:'ack'})).status,409);assert.equal((await f.call('device','POST',{revision:1,count:1},{action:'ack'})).status,200);assert.equal((await f.call('admin','GET')).body.ack.revision,1);});
test('portrait upload enforces RGB565 size and uses content hash',async()=>{const f=fixture();assert.equal((await f.call('admin','POST',{rgb565:'AA=='},{action:'photo'})).status,400);const bytes=Buffer.alloc(32768,127),result=await f.call('admin','POST',{rgb565:bytes.toString('base64')},{action:'photo'});assert.equal(result.body.key,digest(bytes));assert.deepEqual((await f.call('device','GET',null,{asset:result.body.key})).body,bytes);});
test('binding timestamp changes only when physical identity assignment changes',async()=>{const f=fixture();const first=await f.call('admin','POST',{revision:0,employees:[worker]});const rename=await f.call('admin','POST',{revision:1,employees:[{...worker,name:'李四'}]});assert.equal(rename.body.bindingChangedAt,first.body.bindingChangedAt);});
