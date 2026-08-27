// Kohat Zalmi Cricket Dashboard — no demo data. All data stays in this browser.
const SUPABASE_URL = "https://szojybwguxkydkdombqo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yKCdQBSPvkisSWncHbGmBg_-6u9DEyP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
const STORAGE_KEY="kzDataV3";
const THEME_KEY="kzTheme";

let state=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")||{players:[],matches:[]};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const avg=p=>p.dismissals?p.runs/p.dismissals:0;
const sr=p=>p.balls?p.runs/p.balls*100:0;
const eco=p=>p.overs?p.conceded/p.overs:0;
const fmt=n=>Number(n||0).toFixed(2);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function uid(){return Date.now()+Math.floor(Math.random()*10000)}
function avatar(p,cls=""){
  return p.photo?`<div class="avatar photo ${cls}"><img src="${p.photo}" alt="${esc(p.name)}"></div>`:`<div class="avatar ${cls}">${esc((p.name||"?")[0].toUpperCase())}</div>`;
}
function go(page){
  $$(".page").forEach(x=>x.classList.toggle("active",x.id===page));
  $$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const titles={dashboard:"Team Dashboard",players:"Players",matches:"Matches",rankings:"Rankings",analytics:"Analytics",venues:"Venues",add:"Add Performance",addPlayer:"Add Player"};
  $("#pageTitle").textContent=titles[page]||"Kohat Zalmi";
  $("#pageSub").textContent=page==="dashboard"?"Kohat Zalmi performance center":"Kohat Zalmi • private team data";
  render();
}
$$(".nav").forEach(b=>b.onclick=()=>go(b.dataset.page));
$$("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));

function resultStats(){
  let ms=state.matches;
  return {wins:ms.filter(m=>m.result==="Won").length,losses:ms.filter(m=>m.result==="Lost").length,ties:ms.filter(m=>m.result==="Tied").length,nr:ms.filter(m=>m.result==="No Result").length}
}
function render(){
  const ps=state.players,ms=state.matches,runs=ps.reduce((a,p)=>a+p.runs,0),wk=ps.reduce((a,p)=>a+p.wickets,0),rs=resultStats(),winPct=ms.length?rs.wins/ms.length*100:0;
  $("#summaryCards").innerHTML=[["Players",ps.length,"Team squad"],["Matches",ms.length,"Recorded matches"],["Total Runs",runs,"All players"],["Total Wickets",wk,"All bowlers"]].map(x=>`<div class="stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`).join("");
  $("#wins").textContent=rs.wins;$("#losses").textContent=rs.losses;$("#ties").textContent=rs.ties;$("#nr").textContent=rs.nr;$("#winPct").textContent=fmt(winPct)+"%";
  $("#winCircle").style.background=`conic-gradient(#0b8275 0 ${winPct}%,#dbe5e4 ${winPct}% 100%)`;
  const top=[...ps].sort((a,b)=>b.runs-a.runs).slice(0,5);
  $("#topPerformers").innerHTML=top.length?top.map(p=>`<div class="performer">${avatar(p)}<div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.role)} • #${esc(p.jersey)} • ${p.matches} matches</div></div><b>${p.runs} runs</b></div>`).join(""):'<div class="empty">No players yet. Add your first player.</div>';
  $("#recentMatches").innerHTML=ms.length?ms.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(m=>`<div class="performer"><div class="grow"><b>${esc(m.opponent)}</b><div class="muted">${esc(m.date)} • ${esc(m.venue)}</div></div><span class="${m.result==="Won"?"win":m.result==="Lost"?"loss":""}">${esc(m.result)}</span></div>`).join(""):'<div class="empty">No matches recorded yet.</div>';
  $("#snapshotBars").innerHTML=bar("Win rate",winPct,"") + bar("Matches played",Math.min(ms.length*10,100),ms.length) + bar("Squad active",ps.length?100:0,ps.length+" players");
  renderPlayers();renderMatches();renderRankings();renderVenues();renderAnalytics();fillPlayerSelect();
}
function bar(label,pct,value,cls=""){return `<div class="bar-row"><div class="bar-top"><span>${label}</span><b>${value!==""?value:fmt(pct)+"%"}</b></div><div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.max(0,Math.min(100,pct))}%"></div></div></div>`}

function renderPlayers(){
  let q=($("#playerSearch")?.value||"").toLowerCase(),role=$("#roleFilter")?.value||"all";
  let ps=state.players.filter(p=>p.name.toLowerCase().includes(q)&&(role==="all"||p.role===role));
  $("#playersGrid").innerHTML=ps.map(p=>`<div class="player-card" onclick="showPlayer(${p.id})">
    <button class="action-btn delete-player" title="Delete player" onclick="event.stopPropagation();deletePlayer(${p.id})">Delete</button>
    <div class="player-top">${avatar(p)}<div><h3>${esc(p.name)}</h3><div class="role">${esc(p.role)} • Jersey #${esc(p.jersey)}</div></div></div>
    <div class="mini-stats"><div><b>${p.runs}</b><span>Runs</span></div><div><b>${fmt(sr(p))}</b><span>SR</span></div><div><b>${p.wickets}</b><span>Wkts</span></div></div>
  </div>`).join("")||'<div class="empty">No players found.</div>';
}
function deletePlayer(id){
  const p=state.players.find(x=>x.id===id); if(!p)return;
  if(confirm(`Delete ${p.name}? This will remove the player and their stored statistics.`)){
    state.players=state.players.filter(x=>x.id!==id);save();render();
  }
}
function renderMatches(){
  let season=$("#matchSeason")?.value||"all";
  let ms=state.matches.filter(m=>season==="all"||m.date.startsWith(season)).sort((a,b)=>b.date.localeCompare(a.date));
  $("#matchesTable").innerHTML=ms.length?ms.map(m=>{
    let bestB=[...state.players].sort((a,b)=>b.runs-a.runs)[0],bestW=[...state.players].sort((a,b)=>b.wickets-a.wickets)[0];
    return `<tr><td>${esc(m.date)}</td><td>${esc(m.opponent)}</td><td>${esc(m.venue)}</td><td class="${m.result==="Won"?"win":m.result==="Lost"?"loss":""}">${esc(m.result)}</td><td>${esc(m.score)}</td><td>${bestB?esc(bestB.name)+" ("+bestB.runs+")":"—"}</td><td>${bestW?esc(bestW.name)+" ("+bestW.wickets+")":"—"}</td><td><button class="action-btn" onclick="deleteMatch(${m.id})">Delete</button></td></tr>`
  }).join(""):'<tr><td colspan="8" class="empty">No matches recorded yet.</td></tr>';
}
function deleteMatch(id){
  if(confirm("Delete this match?")){state.matches=state.matches.filter(m=>m.id!==id);save();renderMatches();render();}
}
function rankingRows(arr,value,label){
  return arr.slice(0,3).map((p,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div>${avatar(p)}<div class="grow"><b>${esc(p.name)}</b><div class="muted">${esc(p.role)} • #${esc(p.jersey)}</div></div><div class="rank-value">${value(p)}<div class="muted">${label}</div></div></div>`).join("") || '<div class="empty">No players yet.</div>';
}
function renderRankings(){
  let bat=[...state.players].sort((a,b)=>b.runs-a.runs),bowl=[...state.players].sort((a,b)=>b.wickets-a.wickets),ar=[...state.players].filter(p=>p.role==="All-rounder").sort((a,b)=>(b.runs+b.wickets*20)-(a.runs+a.wickets*20));
  $("#batRank").innerHTML=rankingRows(bat,p=>p.runs,"runs");
  $("#bowlRank").innerHTML=rankingRows(bowl,p=>p.wickets,"wickets");
  $("#arRank").innerHTML=rankingRows(ar,p=>`${p.runs}/${p.wickets}`,"runs/wkts");
  let all=[...state.players].sort((a,b)=>(b.runs+b.wickets*20)-(a.runs+a.wickets*20));
  $("#rankingTable").innerHTML=all.length?all.map((p,i)=>`<tr><td>${i+1}</td><td><div class="rank-player-cell">${avatar(p)}<b>${esc(p.name)}</b></div></td><td>${esc(p.role)}</td><td>${p.runs}</td><td>${fmt(avg(p))}</td><td>${fmt(sr(p))}</td><td>${p.wickets}</td><td>${p.overs?fmt(eco(p)):"—"}</td><td>${p.matches}</td></tr>`).join(""):'<tr><td colspan="9" class="empty">No players yet.</td></tr>';
}
function renderAnalytics(){
  let r=resultStats(),ms=state.matches,runs=state.players.reduce((a,p)=>a+p.runs,0),wk=state.players.reduce((a,p)=>a+p.wickets,0),bestSR=[...state.players].sort((a,b)=>sr(b)-sr(a))[0],bestEco=[...state.players].filter(p=>p.overs>0).sort((a,b)=>eco(a)-eco(b))[0];
  $("#analyticsCards").innerHTML=[["Win Rate",ms.length?fmt(r.wins/ms.length*100)+"%":"0%","Overall"],["Wins",r.wins,"Matches won"],["Losses",r.losses,"Matches lost"],["Best SR",bestSR?fmt(sr(bestSR)):"—",bestSR?.name||""]].map(x=>`<div class="stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${esc(x[2])}</div></div>`).join("");
  let total=Math.max(ms.length,1);
  $("#resultBars").innerHTML=bar("Won",r.wins/total*100,r.wins)+bar("Lost",r.losses/total*100,r.losses,"red")+bar("Tied",r.ties/total*100,r.ties,"gold")+bar("No Result",r.nr/total*100,r.nr);
  $("#performanceBars").innerHTML=bar("Total runs",Math.min(runs/5,100),runs)+bar("Total wickets",Math.min(wk*5,100),wk)+bar("Best bowling economy",bestEco?Math.max(0,100-eco(bestEco)*10):0,bestEco?fmt(eco(bestEco)):"—");
  let ps=[...state.players].sort((a,b)=>(b.runs+b.wickets*15)-(a.runs+a.wickets*15)).slice(0,8);
  $("#playerEfficiency").innerHTML=ps.length?ps.map(p=>bar(p.name,Math.min(100,(p.runs/3)+(p.wickets*3)),`${p.runs} runs • ${p.wickets} wkts`)).join(""):'<div class="empty">No player data yet.</div>';
}
function renderVenues(){
  let map={};state.matches.forEach(m=>{map[m.venue]??={matches:0,wins:0};map[m.venue].matches++;if(m.result==="Won")map[m.venue].wins++});
  let a=Object.entries(map);
  $("#venueCards").innerHTML=a.length?a.map(([v,x])=>`<div class="stat"><div class="label">VENUE</div><div class="value">${esc(v)}</div><div class="sub">${x.matches} matches • ${fmt(x.wins/x.matches*100)}% wins</div></div>`).join(""):'<div class="empty">No venue data yet.</div>';
  $("#venueTable").innerHTML=a.length?a.map(([v,x])=>`<tr><td>${esc(v)}</td><td>${x.matches}</td><td>${x.wins}</td><td>${fmt(x.wins/x.matches*100)}%</td></tr>`).join(""):'<tr><td colspan="4" class="empty">No venue data yet.</td></tr>';
}
function fillPlayerSelect(){
  $("#perfPlayer").innerHTML=state.players.map(p=>`<option value="${p.id}">${esc(p.name)} — ${esc(p.role)} (#${esc(p.jersey)})</option>`).join("")||'<option value="">No players — add a player first</option>';
}
function showPlayer(id){
  let p=state.players.find(x=>x.id===id);if(!p)return;
  $("#playerDetail").innerHTML=`<div class="detail-head">${avatar(p,"player-photo-lg")}<div><h2>${esc(p.name)}</h2><div class="role">${esc(p.role)} • Jersey #${esc(p.jersey)}</div></div></div><div class="detail-grid">${[["Matches",p.matches],["Runs",p.runs],["Average",fmt(avg(p))],["Strike Rate",fmt(sr(p))],["Wickets",p.wickets],["Economy",p.overs?fmt(eco(p)):"—"],["Balls",p.balls],["Overs",p.overs]].map(x=>`<div class="detail-stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join("")}</div>`;
  $("#playerModal").classList.add("show");
}
$("#closeModal").onclick=()=>$("#playerModal").classList.remove("show");
$("#playerModal").onclick=e=>{if(e.target.id==="playerModal")e.currentTarget.classList.remove("show")};
$("#playerSearch").oninput=renderPlayers;$("#roleFilter").onchange=renderPlayers;$("#matchSeason").onchange=renderMatches;

$("#matchForm").onsubmit=e=>{
  e.preventDefault();let f=new FormData(e.target);
  state.matches.push({id:uid(),date:f.get("date"),opponent:f.get("opponent"),venue:f.get("venue"),result:f.get("result"),score:f.get("score")});
  save();e.target.reset();alert("Match saved.");go("matches");
};
$("#perfForm").onsubmit=e=>{
  e.preventDefault();let f=new FormData(e.target),p=state.players.find(x=>x.id==f.get("player"));
  if(!p){alert("Add a player first.");go("addPlayer");return}
  p.matches+=1;p.runs+=+f.get("runs");p.balls+=+f.get("balls");p.dismissals+=+f.get("dismissed");p.overs+=+f.get("overs");p.conceded+=+f.get("conceded");p.wickets+=+f.get("wickets");
  save();e.target.reset();alert("Performance saved.");go("players");
};

let pendingPhoto="";
$("#playerForm").onsubmit=async e=>{
  e.preventDefault();let f=new FormData(e.target);
  let photo=pendingPhoto;
  const file=f.get("photo");
  if(file && file.size) photo=await fileToDataURL(file);
  const name=String(f.get("name")).trim();
  if(!name){alert("Enter a player name.");return}
  state.players.push({id:uid(),name,jersey:String(f.get("jersey")).trim(),role:f.get("role"),photo:photo||"",matches:0,runs:0,balls:0,dismissals:0,overs:0,conceded:0,wickets:0});
  save();e.target.reset();pendingPhoto="";$("#photoPreview").src="";$("#photoPreview").classList.remove("show");$("#photoHint").textContent="Optional • upload a player photo";alert("Player added.");go("players");
};
function fileToDataURL(file){return new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)})}
$("#playerForm [name=photo]").onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>2*1024*1024){alert("Please choose a photo under 2 MB.");e.target.value="";return}
  pendingPhoto=await fileToDataURL(file);$("#photoPreview").src=pendingPhoto;$("#photoPreview").classList.add("show");$("#photoHint").textContent=file.name;
};

$("#clearBtn").onclick=()=>{
  if(confirm("Clear ALL players, matches and statistics? This cannot be undone.")){
    state={players:[],matches:[]};save();render();go("dashboard");
  }
};
$("#exportBtn").onclick=()=>{
  let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="kohat-zalmi-data.json";a.click();URL.revokeObjectURL(a.href);
};

function setTheme(theme){
  document.body.classList.toggle("night",theme==="night");
  $("#themeBtn").textContent=theme==="night"?"☀️ Day":"🌙 Night";
  localStorage.setItem(THEME_KEY,theme);
}
const savedTheme=localStorage.getItem(THEME_KEY);
setTheme(savedTheme||((new Date()).getHours()>=18||(new Date()).getHours()<6?"night":"day"));
$("#themeBtn").onclick=()=>setTheme(document.body.classList.contains("night")?"day":"night");

render();
