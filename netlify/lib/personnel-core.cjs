const { createHash, timingSafeEqual } = require('node:crypto');
const digest = value => createHash('sha256').update(value).digest('hex');
const reply = (status, body) => ({ status, body });
function authenticate(header, access) {
  const hash = Buffer.from(digest(String(header || '').replace(/^Bearer /, '')));
  for (const role of ['admin', 'device']) {
    const expected = Buffer.from(access[role] || '');
    if (hash.length === expected.length && timingSafeEqual(hash, expected)) return role;
  }
  return null;
}
function validate(input, previous) {
  if (!Array.isArray(input) || input.length > 40) throw Error('最多支持 40 名员工');
  const seen = new Set(); let bound = 0;
  const employees = input.map(item => {
    if (!item || !/^EMP-\d{3,6}$/.test(item.id) || seen.has(item.id)) throw Error('员工工号无效或重复');
    seen.add(item.id);
    for (const [key, max] of [['name',16],['role',24],['team',24]]) if (typeof item[key] !== 'string' || !item[key].trim() || [...item[key]].length > max) throw Error('姓名、岗位或班组无效');
    if (!['', 'ESP32S3'].includes(item.device) || (item.device && ++bound > 1)) throw Error('同一套设备只能绑定一名员工');
    if (!/^\/static\/workers\/worker_[1-4]\.png$/.test(item.avatar) && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(item.avatar)) throw Error('照片格式无效');
    if (item.avatar.length > 100000) throw Error('照片过大，请重新上传');
    if (item.avatarKey && !/^[a-f0-9]{64}$/.test(item.avatarKey)) throw Error('照片标识无效');
    if (item.avatar.startsWith('data:') && !item.avatarKey) throw Error('请重新上传照片，生成基站照片数据');
    return { id:item.id, name:item.name.trim(), role:item.role.trim(), team:item.team.trim(), device:item.device, avatar:item.avatar, avatarKey:item.avatarKey || '' };
  });
  const oldBound = previous?.employees.find(item => item.device)?.id || '';
  const newBound = employees.find(item => item.device)?.id || '';
  return { employees, bindingChanged:oldBound !== newBound };
}
async function handle({ method, query = {}, authorization, body }, store, access, now = () => new Date().toISOString()) {
  // The competition workspace is deliberately editable without a login.
  // A supplied but invalid device token still fails, and only devices can ACK.
  const role = authenticate(authorization, access) || (!authorization && access.publicEditor === true ? 'admin' : null);
  if (!role) return reply(401, {error:'请输入正确的管理口令'});
  if (method === 'GET' && query.asset) {
    if (!/^[a-f0-9]{64}$/.test(query.asset)) return reply(400,{error:'无效照片'});
    const bytes = await store.get('photo/'+query.asset, {type:'arrayBuffer'});
    return bytes ? reply(200,Buffer.from(bytes)) : reply(404,{error:'照片不存在'});
  }
  const current = await store.getWithMetadata('registry', {type:'json'});
  const doc = current?.data || {revision:0,nextId:5,employees:[],bindingChangedAt:null};
  if (method === 'GET') {
    if (role === 'device') {
      if (String(doc.revision) === query.since) return reply(304,null);
      return reply(200,{...doc,employees:doc.employees.map(({avatar,...item}) => ({...item,avatarIndex:Math.max(0,Number(/worker_(\d)/.exec(avatar)?.[1] || 1)-1)}))});
    }
    return reply(200,{...doc,ack:await store.get('ack',{type:'json'})});
  }
  if (method !== 'POST') return reply(405,{error:'不支持的操作'});
  if (query.action === 'ack') {
    if (role !== 'device') return reply(403,{error:'仅基站可确认同步'});
    if (body.revision !== doc.revision || body.count !== doc.employees.length) return reply(409,{error:'档案版本已变化'});
    await store.setJSON('ack',{revision:body.revision,count:body.count,receivedAt:now(),device:'P4',status:'applied'});
    return reply(200,{ok:true});
  }
  if (role !== 'admin') return reply(403,{error:'基站不能修改员工档案'});
  if (query.action === 'photo') {
    const bytes = Buffer.from(body.rgb565 || '', 'base64');
    if (bytes.length !== 32768 || body.rgb565.length !== 43692) return reply(400,{error:'照片必须是 128×128 RGB565'});
    const key = digest(bytes); await store.set('photo/'+key,bytes);
    return reply(200,{key});
  }
  if (body.revision !== doc.revision) return reply(409,{error:'另一页面已修改档案，请刷新后重试'});
  let value;
  try {value=validate(body.employees,doc);} catch(error) {return reply(400,{error:error.message});}
  for (const item of value.employees) if (item.avatarKey && !(await store.getMetadata('photo/'+item.avatarKey))) return reply(400,{error:'照片未上传成功，请重试'});
  const nextId = Math.max(doc.nextId,...value.employees.map(item=>Number(item.id.slice(4))+1));
  const next = {revision:doc.revision+1,nextId,employees:value.employees,updatedAt:now(),bindingChangedAt:value.bindingChanged?now():doc.bindingChangedAt};
  const result = await store.setJSON('registry',next,current?{onlyIfMatch:current.etag}:{onlyIfNew:true});
  if (!result.modified) return reply(409,{error:'档案发生并发更新，请刷新后重试'});
  return reply(200,next);
}
module.exports = {handle,validate,authenticate,digest};
