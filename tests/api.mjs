import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../functions/api/[action].js',import.meta.url),'utf8');
const {onRequest}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const accountId='a'.repeat(32),siteTag='b'.repeat(32),token='private-test-token';
let sites=[{id:'one',name:'example.com',accountId,siteTag,token}];let writes=0;
const env={ADMIN_PASSWORD:'test',SESSION_SECRET:'test-secret',CLOUDPULSE_KV:{get:async()=>structuredClone(sites),put:async(k,v)=>{sites=JSON.parse(v);writes++;}}};
let cookie='';
async function call(action,method='GET',body){return onRequest({request:new Request('https://app.test/api/'+action,{method,headers:{cookie,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env,params:{action}});}
assert.equal((await call('sites','PATCH',{})).status,401);
assert.equal((await call('verify','POST',{})).status,401);
cookie=(await call('login','POST',{password:'test'})).headers.get('set-cookie').split(';')[0];
let res=await call('sites','PATCH',{id:'one',name:'renamed.com',accountId,siteTag,token:''});
assert.equal(res.status,200);assert.equal(sites[0].token,token);assert.equal(sites[0].id,'one');assert.equal((await res.text()).includes(token),false);
res=await call('sites','PATCH',{id:'one',name:'renamed.com',accountId,siteTag,token:'new-token'});assert.equal(res.status,200);assert.equal(sites[0].token,'new-token');
assert.equal((await call('sites','PATCH',{id:'missing'})).status,404);
const before=writes;assert.equal((await call('sites','PATCH',{id:'one',name:'bad',accountId:'bad',siteTag})).status,400);assert.equal(writes,before);
assert.equal((await call('sites','POST',{name:'duplicate',accountId,siteTag,token})).status,409);
let count=0,info=false,fail=false;
globalThis.fetch=async(url,opts)=>{if(url.includes('/graphql')){if(fail)return Response.json({errors:[{message:'Permission denied'}]});const q=JSON.parse(opts.body);assert.equal(q.query.match(/bot:0/g).length,3);assert.equal(Date.parse(q.variables.end)-Date.parse(q.variables.start24),86400000);return Response.json({data:{viewer:{accounts:[{last24h:[],week:count?[{count,sum:{visits:count}}]:[],series:[]}]}}});}return info?Response.json({success:true,result:{site_tag:siteTag,ruleset:{zone_name:'example.com'}}}):Response.json({success:false},{status:403});};
async function verify(){const r=await call('verify','POST',{id:'one',saved:true});assert.equal(r.status,200);return r.json();}
assert.equal((await verify()).state,'unverified');info=true;assert.equal((await verify()).state,'empty');count=5;assert.equal((await verify()).state,'verified');info=false;assert.equal((await verify()).state,'data');fail=true;assert.equal((await verify()).state,'error');assert.equal(writes,before);
assert.equal((await call('sites')).status,200);
console.log('API tests passed: authorization, edits, token preservation/secrecy, validation, duplicates and all verification states.');
