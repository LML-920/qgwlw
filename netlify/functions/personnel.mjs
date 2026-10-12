import { getStore } from '@netlify/blobs';
import core from '../lib/personnel-core.cjs';
import access from './personnel-access.json' with {type:'json'};
export default async function(request) {
  try {
    const url = new URL(request.url);
    if (Number(request.headers.get('content-length')) > 5500000) return Response.json({error:'档案过大'},{status:413});
    const result = await core.handle({method:request.method,query:Object.fromEntries(url.searchParams),authorization:request.headers.get('authorization'),body:request.method==='POST'?await request.json():null},getStore({name:'mine-personnel-v1',consistency:'strong'}),access);
    const headers={'Cache-Control':'no-store'};
    if (result.status===304) return new Response(null,{status:304,headers});
    if (Buffer.isBuffer(result.body)) return new Response(result.body,{status:result.status,headers:{...headers,'Content-Type':'application/octet-stream'}});
    return Response.json(result.body,{status:result.status,headers});
  } catch { return Response.json({error:'档案服务暂不可用，请稍后重试'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
