const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
async function hmac(secret,input){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(await crypto.subtle.sign("HMAC",key,enc.encode(input)));}
function cookies(req){return Object.fromEntries((req.headers.get("cookie")||"").split(";").map(s=>s.trim().split("=")).filter(a=>a.length===2));}
async function authorized(req,env){const raw=cookies(req).cp_session;if(!raw||!env.SESSION_SECRET)return false;const [expires,mac]=raw.split(".");if(!/^\d{10,14}$/.test(expires)||Number(expires)<Date.now())return false;return mac===(await hmac(env.SESSION_SECRET,expires));}
function cookie(value,maxAge){return "cp_session="+value+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age="+maxAge;}
const validId=x=>/^[a-f0-9]{32}$/i.test(x||"");
async function getSites(env){return await env.CLOUDPULSE_KV.get("sites","json")||[];}
function publicSites(list){return list.map(({id,name,zone,accountId,siteTag})=>({id,name,zone,accountId,siteTag}));}
async function getData(site){
const today=new Date(), end=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()+1)).toISOString(),start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-6)).toISOString();
const rum=!!site.accountId;
const query=rum
?`query($account:String!,$site:String!,$start:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$account}){rumPageloadEventsAdaptiveGroups(limit:10,orderBy:[date_ASC],filter:{siteTag:$site,datetime_geq:$start,datetime_lt:$end}){dimensions{date}count sum{visits}}}}}`
:`query($zone:String!,$start:Date!,$end:Date!){viewer{zones(filter:{zoneTag:$zone}){httpRequests1dGroups(limit:9,orderBy:[date_ASC],filter:{date_geq:$start,date_leq:$end}){dimensions{date}sum{pageViews}uniq{uniques}}}}}`;
const variables=rum?{account:site.accountId,site:site.siteTag,start,end}:{zone:site.zone,start:start.slice(0,10),end:today.toISOString().slice(0,10)};
const response=await fetch("https://api.cloudflare.com/client/v4/graphql",{method:"POST",headers:{"authorization":"Bearer "+site.token,"content-type":"application/json"},body:JSON.stringify({query,variables})});
const raw=await response.json();
if(!response.ok||raw.errors?.length)throw Error(raw.errors?.[0]?.message||"Cloudflare API error "+response.status);
const scope=rum?raw.data?.viewer?.accounts:raw.data?.viewer?.zones;
if(!scope?.length)throw Error("Token nemá prístup k analytike. Skontroluj Account ID / Site Tag a Account Analytics: Read.");
const rows=(rum?scope[0].rumPageloadEventsAdaptiveGroups:scope[0].httpRequests1dGroups)||[];
const days=[];
for(let i=6;i>=0;i--){const date=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-i)).toISOString().slice(0,10);const entry=rows.find(x=>x.dimensions?.date===date);days.push({date,visitors:rum?(entry?.sum?.visits||0):(entry?.uniq?.uniques||0),views:rum?(entry?.count||0):(entry?.sum?.pageViews||0)});}
return {metric:rum?"visits":"unique",days,today:days.at(-1),week:{visitors:days.reduce((n,d)=>n+d.visitors,0),views:days.reduce((n,d)=>n+d.views,0)}};
}
export async function onRequest({request,env,params}){
if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET||!env.CLOUDPULSE_KV)return json({error:"Chýba konfigurácia ADMIN_PASSWORD, SESSION_SECRET alebo CLOUDPULSE_KV."},503);
const action=params.action,method=request.method;
try{
if(action==="login"&&method==="POST"){const input=await request.json();if(typeof input.password!=="string"||input.password!==env.ADMIN_PASSWORD)return json({error:"Nesprávne heslo."},401);const expiry=String(Date.now()+7*86400000);const signature=await hmac(env.SESSION_SECRET,expiry);const res=json({ok:true});res.headers.set("set-cookie",cookie(expiry+"."+signature,604800));return res;}
if(action==="logout"&&method==="POST"){const res=json({ok:true});res.headers.set("set-cookie",cookie("",0));return res;}
if(!await authorized(request,env))return json({error:"Neprihlásený prístup."},401);
if(action==="sites"&&method==="GET")return json({sites:publicSites(await getSites(env))});
if(action==="sites"&&method==="POST"){const input=await request.json();const name=String(input.name||"").trim().slice(0,80),accountId=String(input.accountId||"").trim(),siteTag=String(input.siteTag||"").trim(),token=String(input.token||"").trim();if(!name||!validId(accountId)||!validId(siteTag)||!token||token.length>512)return json({error:"Vyplň názov, platné Account ID, Site Tag a API token."},400);const sites=await getSites(env);if(sites.length>=40)return json({error:"Maximum 40 webov."},400);if(sites.some(s=>s.accountId===accountId&&s.siteTag===siteTag))return json({error:"Táto stránka už existuje."},409);const next=[...sites,{id:crypto.randomUUID(),name,accountId,siteTag,token}];await env.CLOUDPULSE_KV.put("sites",JSON.stringify(next));return json({sites:publicSites(next)});}
if(action==="sites"&&method==="DELETE"){const input=await request.json();const sites=await getSites(env);await env.CLOUDPULSE_KV.put("sites",JSON.stringify(sites.filter(s=>s.id!==input.id)));return json({ok:true});}
if(action==="stats"&&method==="GET"){const sites=await getSites(env);const results=await Promise.all(sites.map(async s=>{try{return {id:s.id,name:s.name,...await getData(s)};}catch(e){return {id:s.id,name:s.name,error:String(e.message||e).slice(0,250)};}}));return json({sites:results,updated:new Date().toISOString()});}
return json({error:"Neznáma požiadavka."},404);
}catch(e){return json({error:"Požiadavka zlyhala: "+String(e.message||e).slice(0,180)},500);}
}
