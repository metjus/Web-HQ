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
function siteInput(input,existing){
const name=String(input.name||"").trim().slice(0,80),accountId=String(input.accountId||"").trim().toLowerCase(),siteTag=String(input.siteTag||"").trim().toLowerCase();
const token=String(input.token||"").trim()||existing?.token;
if(!name)throw Error("Chýba názov / doména.");
if(!validId(accountId))throw Error("Account ID musí mať 32 znakov (0-9, a-f).");
if(!validId(siteTag))throw Error("Site Tag musí mať 32 znakov. Použi siteTag z URL štatistík, nie token z JS snippetu.");
if(!token||token.length>512||/\s/.test(token))throw Error("Vlož samotný API token bez medzier alebo príkazu.");
return {name,accountId,siteTag,token};
}
async function verifySite(site){
const checkedAt=new Date().toISOString();
let stats;
try{stats=await getData(site);}catch(e){return {state:"error",checkedAt,message:"Analytiku sa nepodarilo načítať: "+String(e.message).slice(0,200)};}
let info=null;
try{
const response=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(site.accountId)}/rum/site_info/${encodeURIComponent(site.siteTag)}`,{headers:{authorization:"Bearer "+site.token},signal:AbortSignal.timeout(15000)});
const body=await response.json();
if(response.ok&&body.success&&body.result?.site_tag?.toLowerCase()===site.siteTag.toLowerCase())info=body.result;
}catch{}
const hasData=stats.week.views>0||stats.week.visitors>0;
if(info){
const hosts=[...new Set([info.ruleset?.zone_name,...(info.rules||[]).filter(r=>r.inclusive&&!r.is_paused).map(r=>r.host)].filter(Boolean))];
return {state:hasData?"verified":"empty",checkedAt,hosts,message:hasData?"Site Tag aj prístup k analytike sú overené.":"Site Tag je overený. Za posledných 7 dní po vylúčení botov nie sú zaznamenané návštevy. Skontroluj merací skript, ak návštevy očakávaš."};
}
return {state:hasData?"data":"unverified",checkedAt,message:hasData?"Analytika vracia dáta pre tento Site Tag. Priradenie k doméne nebolo overené.":"API odpovedá, ale nevracia dáta. Nulová návštevnosť nepotvrdzuje správny Site Tag. Skontroluj siteTag v URL Cloudflare. Na overenie existencie webu môže token potrebovať Account Settings: Read."};
}
async function getData(site, asOf=new Date()){
if(!site.accountId)throw Error("Starý záznam Zone Analytics: pridaj web cez Account ID a Web Analytics Site Tag pre porovnateľné štatistiky.");
const end=asOf.toISOString(), start24=new Date(asOf.getTime()-86400000).toISOString(), start7=new Date(asOf.getTime()-7*86400000).toISOString();
const query=`query($account:String!,$site:String!,$start24:Time!,$start7:Time!,$end:Time!){viewer{accounts(filter:{accountTag:$account}){
last24h:rumPageloadEventsAdaptiveGroups(limit:1,filter:{siteTag:$site,datetime_geq:$start24,datetime_lt:$end,bot:0}){count sum{visits}}
week:rumPageloadEventsAdaptiveGroups(limit:1,filter:{siteTag:$site,datetime_geq:$start7,datetime_lt:$end,bot:0}){count sum{visits}}
series:rumPageloadEventsAdaptiveGroups(limit:8,orderBy:[date_ASC],filter:{siteTag:$site,datetime_geq:$start7,datetime_lt:$end,bot:0}){dimensions{date}count sum{visits}}
}}}`;
const response=await fetch("https://api.cloudflare.com/client/v4/graphql",{method:"POST",headers:{"authorization":"Bearer "+site.token,"content-type":"application/json"},signal:AbortSignal.timeout(20000),body:JSON.stringify({query,variables:{account:site.accountId,site:site.siteTag,start24,start7,end}})});
const raw=await response.json();
if(!response.ok||raw.errors?.length)throw Error(raw.errors?.[0]?.message||"Cloudflare API error "+response.status);
const account=raw.data?.viewer?.accounts?.[0];
if(!account)throw Error("Token nemá prístup k analytike. Skontroluj Account ID a Account Analytics: Read.");
for(const key of ["last24h","week","series"])if(!Array.isArray(account[key]))throw Error("Cloudflare vrátil neúplnú odpoveď analytiky.");
const metrics=row=>({visitors:row?.sum?.visits??0,views:row?.count??0});
const days=[];
for(let time=Date.parse(start7.slice(0,10)+"T00:00:00Z");time<asOf.getTime();time+=86400000){
const date=new Date(time).toISOString().slice(0,10);
days.push({date,...metrics(account.series.find(row=>row.dimensions?.date===date))});
}
return {metric:"visits",excludeBots:true,period:{start24,start7,end},last24h:metrics(account.last24h[0]),week:metrics(account.week[0]),days};
}
export async function onRequest({request,env,params}){
if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET||!env.CLOUDPULSE_KV)return json({error:"Chýba konfigurácia ADMIN_PASSWORD, SESSION_SECRET alebo CLOUDPULSE_KV."},503);
const action=params.action,method=request.method;
try{
if(action==="login"&&method==="POST"){const input=await request.json();if(typeof input.password!=="string"||input.password!==env.ADMIN_PASSWORD)return json({error:"Nesprávne heslo."},401);const expiry=String(Date.now()+7*86400000);const signature=await hmac(env.SESSION_SECRET,expiry);const res=json({ok:true});res.headers.set("set-cookie",cookie(expiry+"."+signature,604800));return res;}
if(action==="logout"&&method==="POST"){const res=json({ok:true});res.headers.set("set-cookie",cookie("",0));return res;}
if(!await authorized(request,env))return json({error:"Neprihlásený prístup."},401);
if(action==="sites"&&method==="GET")return json({sites:publicSites(await getSites(env))});
if(action==="sites"&&(method==="POST"||method==="PATCH")){
const input=await request.json(),sites=await getSites(env),editing=method==="PATCH";
const existing=editing?sites.find(s=>s.id===input.id):null;
if(editing&&!existing)return json({error:"Web už neexistuje. Obnov zoznam."},404);
let candidate;try{candidate=siteInput(input,existing);}catch(e){return json({error:e.message},400);}
if(!editing&&sites.length>=40)return json({error:"Maximum 40 webov."},400);
if(sites.some(s=>s.id!==existing?.id&&s.accountId?.toLowerCase()===candidate.accountId&&s.siteTag?.toLowerCase()===candidate.siteTag))return json({error:"Táto stránka už existuje."},409);
const saved={...existing,...candidate,id:existing?.id||crypto.randomUUID()};
const next=editing?sites.map(s=>s.id===saved.id?saved:s):[...sites,saved];
await env.CLOUDPULSE_KV.put("sites",JSON.stringify(next));return json({sites:publicSites(next)});
}
if(action==="verify"&&method==="POST"){
const input=await request.json(),sites=await getSites(env);
const existing=input.id?sites.find(s=>s.id===input.id):null;
if(input.id&&!existing)return json({error:"Web už neexistuje."},404);
let candidate;try{candidate=input.saved===true&&existing?existing:siteInput(input,existing);}catch(e){return json({error:e.message},400);}
return json(await verifySite(candidate));
}
if(action==="sites"&&method==="DELETE"){const input=await request.json();const sites=await getSites(env);await env.CLOUDPULSE_KV.put("sites",JSON.stringify(sites.filter(s=>s.id!==input.id)));return json({ok:true});}
if(action==="stats"&&method==="GET"){const sites=await getSites(env),asOf=new Date();const results=await Promise.all(sites.map(async s=>{try{return {id:s.id,name:s.name,...await getData(s,asOf)};}catch(e){return {id:s.id,name:s.name,error:String(e.message||e).slice(0,250)};}}));return json({sites:results,updated:asOf.toISOString()});}
return json({error:"Neznáma požiadavka."},404);
}catch(e){return json({error:"Požiadavka zlyhala: "+String(e.message||e).slice(0,180)},500);}
}
