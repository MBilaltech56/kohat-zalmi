// Kohat Zalmi Cricket Dashboard — Supabase powered
const SUPABASE_URL = "https://szojybwguxkydkdombqo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_yKCdQBSPvkisSWncHbGmBg_-6u9DEyP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const THEME_KEY = "kzTheme";
let state = { players: [], matches: [] };
let pendingPhoto = "";

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const avg = p => Number(p.dismissals) ? Number(p.runs || 0) / Number(p.dismissals) : 0;
const sr = p => Number(p.balls) ? Number(p.runs || 0) / Number(p.balls) * 100 : 0;
const eco = p => Number(p.overs) ? Number(p.conceded || 0) / Number(p.overs) : 0;
const fmt = n => Number(n || 0).toFixed(2);
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[m]));

function uid() {
  return Date.now() + Math.floor(Math.random() * 10000);
}

function avatar(p, cls = "") {
  return p.photo
    ? `<div class="avatar photo ${cls}"><img src="${p.photo}" alt="${esc(p.name)}"></div>`
    : `<div class="avatar ${cls}">${esc((p.name || "?")[0].toUpperCase())}</div>`;
}

function go(page) {
  $$(".page").forEach(x => x.classList.toggle("active", x.id === page));
  $$(".nav").forEach(x => x.classList.toggle("active", x.dataset.page === page));

  const titles = {
    dashboard:"Team Dashboard",
    players:"Players",
    matches:"Matches",
    rankings:"Rankings",
    analytics:"Analytics",
    venues:"Venues",
    add:"Add Performance",
    addPlayer:"Add Player"
  };

  if ($("#pageTitle")) $("#pageTitle").textContent = titles[page] || "Kohat Zalmi";
  if ($("#pageSub")) {
    $("#pageSub").textContent =
      page === "dashboard"
        ? "Kohat Zalmi performance center"
        : "Kohat Zalmi • online team data";
  }

  render();
}

$$(".nav").forEach(b => b.onclick = () => go(b.dataset.page));
$$("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));

function resultStats() {
  const ms = state.matches;
  return {
    wins: ms.filter(m => m.result === "Won").length,
    losses: ms.filter(m => m.result === "Lost").length,
    ties: ms.filter(m => m.result === "Tied").length,
    nr: ms.filter(m => m.result === "No Result").length
  };
}

function render() {
  const ps = state.players || [];
  const ms = state.matches || [];
  const runs = ps.reduce((a,p) => a + Number(p.runs || 0), 0);
  const wk = ps.reduce((a,p) => a + Number(p.wickets || 0), 0);
  const rs = resultStats();
  const winPct = ms.length ? rs.wins / ms.length * 100 : 0;

  if ($("#summaryCards")) {
    $("#summaryCards").innerHTML = [
      ["Players",ps.length,"Team squad"],
      ["Matches",ms.length,"Recorded matches"],
      ["Total Runs",runs,"All players"],
      ["Total Wickets",wk,"All bowlers"]
    ].map(x =>
      `<div class="stat"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="sub">${x[2]}</div></div>`
    ).join("");
  }

  if ($("#wins")) $("#wins").textContent = rs.wins;
  if ($("#losses")) $("#losses").textContent = rs.losses;
  if ($("#ties")) $("#ties").textContent = rs.ties;
  if ($("#nr")) $("#nr").textContent = rs.nr;
  if ($("#winPct")) $("#winPct").textContent = fmt(winPct) + "%";

  if ($("#winCircle")) {
    $("#winCircle").style.background =
      `conic-gradient(#0b8275 0 ${winPct}%,#dbe5e4 ${winPct}% 100%)`;
  }

  const top = [...ps]
    .sort((a,b) => Number(b.runs||0) - Number(a.runs||0))
    .slice(0,5);

  if ($("#topPerformers")) {
    $("#topPerformers").innerHTML = top.length
      ? top.map(p =>
        `<div class="performer">${avatar(p)}
          <div class="grow">
            <b>${esc(p.name)}</b>
            <div class="muted">${esc(p.role)} • #${esc(p.jersey)} • ${p.matches||0} matches</div>
          </div>
          <b>${p.runs||0} runs</b>
        </div>`
      ).join("")
      : '<div class="empty">No players yet. Add your first player.</div>';
  }

  if ($("#recentMatches")) {
    $("#recentMatches").innerHTML = ms.length
      ? ms.slice()
        .sort((a,b) => String(b.date).localeCompare(String(a.date)))
        .slice(0,5)
        .map(m =>
          `<div class="performer">
            <div class="grow">
              <b>${esc(m.opponent)}</b>
              <div class="muted">${esc(m.date)} • ${esc(m.venue)}</div>
            </div>
            <span class="${m.result==="Won"?"win":m.result==="Lost"?"loss":""}">${esc(m.result)}</span>
          </div>`
        ).join("")
      : '<div class="empty">No matches recorded yet.</div>';
  }

  if ($("#snapshotBars")) {
    $("#snapshotBars").innerHTML =
      bar("Win rate",winPct,"") +
      bar("Matches played",Math.min(ms.length*10,100),ms.length) +
      bar("Squad active",ps.length?100:0,ps.length+" players");
  }

  renderPlayers();
  renderMatches();
  renderRankings();
  renderVenues();
  renderAnalytics();
  fillPlayerSelect();
}

function bar(label,pct,value,cls="") {
  return `<div class="bar-row">
    <div class="bar-top"><span>${label}</span><b>${value!==""?value:fmt(pct)+"%"}</b></div>
    <div class="bar-track"><div class="bar-fill ${cls}" style="width:${Math.max(0,Math.min(100,pct))}%"></div></div>
  </div>`;
}

function renderPlayers() {
  const q = ($("#playerSearch")?.value || "").toLowerCase();
  const role = $("#roleFilter")?.value || "all";

  const ps = state.players.filter(p =>
    String(p.name || "").toLowerCase().includes(q) &&
    (role === "all" || p.role === role)
  );

  if (!$("#playersGrid")) return;

  $("#playersGrid").innerHTML = ps.map(p =>
    `<div class="player-card" onclick="showPlayer('${String(p.id)}')">
      <div class="player-top">
        ${avatar(p)}
        <div class="grow">
          <h3>${esc(p.name)}</h3>
          <div class="role">${esc(p.role)} • Jersey #${esc(p.jersey)}</div>
        </div>
      </div>

      <div class="mini-stats">
        <div><b>${p.runs||0}</b><span>Runs</span></div>
        <div><b>${fmt(sr(p))}</b><span>SR</span></div>
        <div><b>${p.wickets||0}</b><span>Wkts</span></div>
      </div>

      <div class="card-actions">
        <button class="action-btn" onclick="event.stopPropagation();editPlayer('${String(p.id)}')">Edit</button>
        <button class="action-btn delete-player" onclick="event.stopPropagation();deletePlayer('${String(p.id)}')">Delete</button>
      </div>
    </div>`
  ).join("") || '<div class="empty">No players found.</div>';
}

async function deletePlayer(id) {
  const p = state.players.find(x => String(x.id) === String(id));
  if (!p) return;

  if (!confirm(`Delete ${p.name}? This will remove the player and their stored statistics.`)) return;

  const { error } = await supabaseClient
    .from("kohat zalmi")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Could not delete player: " + error.message);
    return;
  }

  state.players = state.players.filter(x => String(x.id) !== String(id));
  render();
  alert("Player deleted.");
}

function showPlayer(id) {
  const p = state.players.find(x => String(x.id) === String(id));
  if (!p || !$("#playerDetail") || !$("#playerModal")) return;

  $("#playerDetail").innerHTML = `
    <div class="player-detail">
      ${avatar(p,"large")}
      <h2>${esc(p.name)}</h2>
      <div class="muted">${esc(p.role)} • Jersey #${esc(p.jersey)}</div>

      <div class="detail-grid">
        <div><b>${p.matches||0}</b><span>Matches</span></div>
        <div><b>${p.runs||0}</b><span>Runs</span></div>
        <div><b>${p.wickets||0}</b><span>Wickets</span></div>
        <div><b>${fmt(avg(p))}</b><span>Average</span></div>
        <div><b>${fmt(sr(p))}</b><span>Strike Rate</span></div>
        <div><b>${fmt(eco(p))}</b><span>Economy</span></div>
      </div>

      <div class="detail-actions">
        <button class="action-btn" onclick="editPlayer('${String(p.id)}')">Edit Player</button>
        <button class="action-btn delete-player" onclick="deletePlayer('${String(p.id)}');closeModal()">Delete Player</button>
      </div>
    </div>
  `;

  $("#playerModal").classList.add("show");
}

function closeModal() {
  $("#playerModal")?.classList.remove("show");
}

$("#closePlayerModal")?.addEventListener("click", closeModal);

$("#playerModal")?.addEventListener("click", e => {
  if (e.target.id === "playerModal") closeModal();
});
async function editPlayer(id) {
  const p = state.players.find(x => String(x.id) === String(id));
  if (!p) return;

  const name = prompt("Player name:", p.name || "");
  if (name === null) return;

  const jersey = prompt("Jersey number:", p.jersey || "");
  if (jersey === null) return;

  const role = prompt(
    "Role (Batsman, Bowler, All-rounder):",
    p.role || ""
  );
  if (role === null) return;

  const cleanName = name.trim();
  const cleanJersey = jersey.trim();
  const cleanRole = role.trim();

  if (!cleanName) {
    alert("Player name is required.");
    return;
  }

  const { data, error } = await supabaseClient
    .from("kohat zalmi")
    .update({
      name: cleanName,
      jersey: cleanJersey,
      role: cleanRole
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Edit player error:", error);
    alert("Could not update player: " + error.message);
    return;
  }

  const index = state.players.findIndex(
    x => String(x.id) === String(id)
  );

  if (index >= 0) {
    state.players[index] = data;
  }

  closeModal();
  render();
  alert("Player updated successfully.");
}

function renderMatches() {
  const season = $("#matchSeason")?.value || "all";

  const ms = state.matches
    .filter(m =>
      season === "all" ||
      String(m.date || "").startsWith(season)
    )
    .sort((a,b) =>
      String(b.date).localeCompare(String(a.date))
    );

  if (!$("#matchesTable")) return;

  $("#matchesTable").innerHTML = ms.length
    ? ms.map(m => {
        const bestB = [...state.players]
          .sort(
            (a,b) =>
              Number(b.runs || 0) -
              Number(a.runs || 0)
          )[0];

        const bestW = [...state.players]
          .sort(
            (a,b) =>
              Number(b.wickets || 0) -
              Number(a.wickets || 0)
          )[0];

        return `
          <tr>
            <td>${esc(m.date)}</td>
            <td>${esc(m.opponent)}</td>
            <td>${esc(m.venue)}</td>

            <td class="${
              m.result === "Won"
                ? "win"
                : m.result === "Lost"
                  ? "loss"
                  : ""
            }">
              ${esc(m.result)}
            </td>

            <td>${esc(m.score)}</td>

            <td>
              ${
                bestB
                  ? esc(bestB.name) +
                    " (" +
                    (bestB.runs || 0) +
                    ")"
                  : "—"
              }
            </td>

            <td>
              ${
                bestW
                  ? esc(bestW.name) +
                    " (" +
                    (bestW.wickets || 0) +
                    ")"
                  : "—"
              }
            </td>

            <td>
              <button
                class="action-btn"
                onclick="deleteMatch('${String(m.id)}')">
                Delete
              </button>
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="8" class="empty">
          No matches recorded yet.
        </td>
      </tr>
    `;
}

async function deleteMatch(id) {
  if (!confirm("Delete this match?")) return;

  const { error } = await supabaseClient
    .from("matches")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete match error:", error);
    alert("Could not delete match: " + error.message);
    return;
  }

  state.matches = state.matches.filter(
    m => String(m.id) !== String(id)
  );

  render();
  alert("Match deleted.");
}

function rankingRows(arr, value, label) {
  return arr.slice(0,3).map((p,i) =>
    `
      <div class="rank-row">

        <div class="rank-no">
          ${i + 1}
        </div>

        ${avatar(p)}

        <div class="grow">
          <b>${esc(p.name)}</b>
          <div class="muted">
            ${esc(p.role)} • #${esc(p.jersey)}
          </div>
        </div>

        <div class="rank-value">
          ${value(p)}
          <div class="muted">
            ${label}
          </div>
        </div>

      </div>
    `
  ).join("")
  ||
  `
    <div class="empty">
      No players yet.
    </div>
  `;
}

function renderRankings() {
  const bat = [...state.players]
    .sort(
      (a,b) =>
        Number(b.runs || 0) -
        Number(a.runs || 0)
    );

  const bowl = [...state.players]
    .sort(
      (a,b) =>
        Number(b.wickets || 0) -
        Number(a.wickets || 0)
    );

  const ar = [...state.players]
    .filter(
      p =>
        String(p.role || "")
          .toLowerCase()
          .replace(/[\s-]/g,"") === "allrounder"
    )
    .sort(
      (a,b) =>
        (
          Number(b.runs || 0) +
          Number(b.wickets || 0) * 20
        ) -
        (
          Number(a.runs || 0) +
          Number(a.wickets || 0) * 20
        )
    );

  if ($("#batRank")) {
    $("#batRank").innerHTML =
      rankingRows(
        bat,
        p => p.runs || 0,
        "runs"
      );
  }

  if ($("#bowlRank")) {
    $("#bowlRank").innerHTML =
      rankingRows(
        bowl,
        p => p.wickets || 0,
        "wickets"
      );
  }

  if ($("#arRank")) {
    $("#arRank").innerHTML =
      rankingRows(
        ar,
        p => `${p.runs || 0}/${p.wickets || 0}`,
        "runs/wkts"
      );
  }

  const all = [...state.players]
    .sort(
      (a,b) =>
        (
          Number(b.runs || 0) +
          Number(b.wickets || 0) * 20
        ) -
        (
          Number(a.runs || 0) +
          Number(a.wickets || 0) * 20
        )
    );

  if ($("#rankingTable")) {
    $("#rankingTable").innerHTML = all.length
      ? all.map((p,i) =>
          `
            <tr>
              <td>${i + 1}</td>

              <td>
                <div class="rank-player-cell">
                  ${avatar(p)}
                  <b>${esc(p.name)}</b>
                </div>
              </td>

              <td>${esc(p.role)}</td>
              <td>${p.runs || 0}</td>
              <td>${fmt(avg(p))}</td>
              <td>${fmt(sr(p))}</td>
              <td>${p.wickets || 0}</td>
              <td>${p.overs ? fmt(eco(p)) : "—"}</td>
              <td>${p.matches || 0}</td>
            </tr>
          `
        ).join("")
      : `
        <tr>
          <td colspan="9" class="empty">
            No players yet.
          </td>
        </tr>
      `;
  }
}

function renderAnalytics() {
  const r = resultStats();
  const ms = state.matches;

  const runs = state.players.reduce(
    (a,p) => a + Number(p.runs || 0),
    0
  );

  const wk = state.players.reduce(
    (a,p) => a + Number(p.wickets || 0),
    0
  );

  const bestSR = [...state.players]
    .sort((a,b) => sr(b) - sr(a))[0];

  const bestEco = [...state.players]
    .filter(p => Number(p.overs) > 0)
    .sort((a,b) => eco(a) - eco(b))[0];

  if ($("#analyticsCards")) {
    $("#analyticsCards").innerHTML = [
      [
        "Win Rate",
        ms.length
          ? fmt(r.wins / ms.length * 100) + "%"
          : "0%",
        "Overall"
      ],
      [
        "Wins",
        r.wins,
        "Matches won"
      ],
      [
        "Losses",
        r.losses,
        "Matches lost"
      ],
      [
        "Best SR",
        bestSR ? fmt(sr(bestSR)) : "—",
        bestSR?.name || ""
      ]
    ].map(x =>
      `
        <div class="stat">
          <div class="label">
            ${x[0]}
          </div>

          <div class="value">
            ${x[1]}
          </div>

          <div class="sub">
            ${esc(x[2])}
          </div>
        </div>
      `
    ).join("");
  }

  const total = Math.max(ms.length,1);

  if ($("#resultBars")) {
    $("#resultBars").innerHTML =
      bar(
        "Won",
        r.wins / total * 100,
        r.wins
      ) +

      bar(
        "Lost",
        r.losses / total * 100,
        r.losses,
        "red"
      ) +

      bar(
        "Tied",
        r.ties / total * 100,
        r.ties,
        "gold"
      ) +

      bar(
        "No Result",
        r.nr / total * 100,
        r.nr
      );
  }

  if ($("#performanceBars")) {
    $("#performanceBars").innerHTML =
      bar(
        "Total runs",
        Math.min(runs / 5,100),
        runs
      ) +

      bar(
        "Total wickets",
        Math.min(wk * 5,100),
        wk
      ) +

      bar(
        "Best bowling economy",
        bestEco
          ? Math.max(0,100 - eco(bestEco) * 10)
          : 0,
        bestEco
          ? fmt(eco(bestEco))
          : "—"
      );
  }

  const ps = [...state.players]
    .sort(
      (a,b) =>
        (
          Number(b.runs || 0) +
          Number(b.wickets || 0) * 15
        ) -
        (
          Number(a.runs || 0) +
          Number(a.wickets || 0) * 15
        )
    )
    .slice(0,8);

  if ($("#playerEfficiency")) {
    $("#playerEfficiency").innerHTML = ps.length
      ? ps.map(p =>
          bar(
            p.name,
            Math.min(
              100,
              Number(p.runs || 0) / 3 +
              Number(p.wickets || 0) * 3
            ),
            `${p.runs || 0} runs • ${p.wickets || 0} wkts`
          )
        ).join("")
      : `
        <div class="empty">
          No player data yet.
        </div>
      `;
  }
}

function renderVenues() {
  const map = {};

  state.matches.forEach(m => {
    const venue = m.venue || "Unknown";

    map[venue] ??= {
      matches: 0,
      wins: 0
    };

    map[venue].matches++;

    if (m.result === "Won") {
      map[venue].wins++;
    }
  });

  const a = Object.entries(map);

  if ($("#venueCards")) {
    $("#venueCards").innerHTML = a.length
      ? a.map(([v,x]) =>
          `
            <div class="stat">
              <div class="label">
                VENUE
              </div>

              <div class="value">
                ${esc(v)}
              </div>

              <div class="sub">
                ${x.matches} matches •
                ${fmt(x.wins / x.matches * 100)}% wins
              </div>
            </div>
          `
        ).join("")
      : `
        <div class="empty">
          No venue data yet.
        </div>
      `;
  }

  if ($("#venueTable")) {
    $("#venueTable").innerHTML = a.length
      ? a.map(([v,x]) =>
          `
            <tr>
              <td>${esc(v)}</td>
              <td>${x.matches}</td>
              <td>${x.wins}</td>
              <td>${fmt(x.wins / x.matches * 100)}%</td>
            </tr>
          `
        ).join("")
      : `
        <tr>
          <td colspan="4" class="empty">
            No venue data yet.
          </td>
        </tr>
      `;
  }
}

function fillPlayerSelect() {
  if (!$("#perfPlayer")) return;

  $("#perfPlayer").innerHTML =
    state.players.map(p =>
      `
        <option value="${esc(p.id)}">
          ${esc(p.name)} —
          ${esc(p.role)}
          (#${esc(p.jersey)})
        </option>
      `
    ).join("")
    ||
    `
      <option value="">
        No players — add a player first
      </option>
    `;
}

if ($("#playerSearch")) {
  $("#playerSearch").oninput = renderPlayers;
}

if ($("#roleFilter")) {
  $("#roleFilter").onchange = renderPlayers;
}

if ($("#matchSeason")) {
  $("#matchSeason").onchange = renderMatches;
}
function renderVenues() {
  const map = {};

  state.matches.forEach(m => {
    const venue = m.venue || "Unknown";

    map[venue] ??= {
      matches: 0,
      wins: 0
    };

    map[venue].matches++;

    if (m.result === "Won") {
      map[venue].wins++;
    }
  });

  const a = Object.entries(map);

  if ($("#venueCards")) {
    $("#venueCards").innerHTML = a.length
      ? a.map(([v,x]) =>
          `
            <div class="stat">
              <div class="label">
                VENUE
              </div>

              <div class="value">
                ${esc(v)}
              </div>

              <div class="sub">
                ${x.matches} matches •
                ${fmt(x.wins / x.matches * 100)}% wins
              </div>
            </div>
          `
        ).join("")
      : `
        <div class="empty">
          No venue data yet.
        </div>
      `;
  }

  if ($("#venueTable")) {
    $("#venueTable").innerHTML = a.length
      ? a.map(([v,x]) =>
          `
            <tr>
              <td>${esc(v)}</td>
              <td>${x.matches}</td>
              <td>${x.wins}</td>
              <td>${fmt(x.wins / x.matches * 100)}%</td>
            </tr>
          `
        ).join("")
      : `
        <tr>
          <td colspan="4" class="empty">
            No venue data yet.
          </td>
        </tr>
      `;
  }
}

function fillPlayerSelect() {
  if (!$("#perfPlayer")) return;

  $("#perfPlayer").innerHTML =
    state.players.map(p =>
      `
        <option value="${esc(p.id)}">
          ${esc(p.name)} —
          ${esc(p.role)}
          (#${esc(p.jersey)})
        </option>
      `
    ).join("")
    ||
    `
      <option value="">
        No players — add a player first
      </option>
    `;
}

if ($("#playerSearch")) {
  $("#playerSearch").oninput = renderPlayers;
}

if ($("#roleFilter")) {
  $("#roleFilter").onchange = renderPlayers;
}

if ($("#matchSeason")) {
  $("#matchSeason").onchange = renderMatches;
}

$("#matchForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const f = new FormData(e.target);

  const match = {
    date: f.get("date"),
    opponent: f.get("opponent"),
    venue: f.get("venue"),
    result: f.get("result"),
    score: f.get("score")
  };

  const { data, error } = await supabaseClient
    .from("matches")
    .insert([match])
    .select()
    .single();

  if (error) {
    console.error("Save match error:", error);
    alert("Could not save match: " + error.message);
    return;
  }

  state.matches.push(data);

  e.target.reset();

  alert("Match saved successfully.");

  go("matches");
});

$("#perfForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const f = new FormData(e.target);

  const p = state.players.find(
    x => String(x.id) === String(f.get("player"))
  );

  if (!p) {
    alert("Add a player first.");
    go("addPlayer");
    return;
  }

  const updates = {
    matches:
      Number(p.matches || 0) + 1,

    runs:
      Number(p.runs || 0) +
      Number(f.get("runs") || 0),

    balls:
      Number(p.balls || 0) +
      Number(f.get("balls") || 0),

    dismissals:
      Number(p.dismissals || 0) +
      Number(f.get("dismissed") || 0),

    overs:
      Number(p.overs || 0) +
      Number(f.get("overs") || 0),

    conceded:
      Number(p.conceded || 0) +
      Number(f.get("conceded") || 0),

    wickets:
      Number(p.wickets || 0) +
      Number(f.get("wickets") || 0)
  };

  const { data, error } = await supabaseClient
    .from("kohat zalmi")
    .update(updates)
    .eq("id", p.id)
    .select()
    .single();

  if (error) {
    console.error(
      "Save performance error:",
      error
    );

    alert(
      "Could not save performance: " +
      error.message
    );

    return;
  }

  Object.assign(p, data);

  e.target.reset();

  alert("Performance saved successfully.");

  go("players");
});

$("#playerForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  const f = new FormData(e.target);

  let photo = pendingPhoto;

  const file = f.get("photo");

  if (file && file.size) {
    photo = await fileToDataURL(file);
  }

  const name =
    String(f.get("name") || "").trim();

  if (!name) {
    alert("Enter a player name.");
    return;
  }

  const player = {
    name: name,

    jersey:
      String(f.get("jersey") || "").trim(),

    role:
      String(f.get("role") || "").trim(),

    photo:
      photo || "",

    matches: 0,
    runs: 0,
    balls: 0,
    dismissals: 0,
    overs: 0,
    conceded: 0,
    wickets: 0
  };

  const { data, error } =
    await supabaseClient
      .from("kohat zalmi")
      .insert([player])
      .select()
      .single();

  if (error) {
    console.error(
      "Add player error:",
      error
    );

    alert(
      "Could not add player: " +
      error.message
    );

    return;
  }

  state.players.push(data);

  e.target.reset();

  pendingPhoto = "";

  if ($("#photoPreview")) {
    $("#photoPreview").src = "";
    $("#photoPreview")
      .classList
      .remove("show");
  }

  if ($("#photoHint")) {
    $("#photoHint").textContent =
      "Optional • upload a player photo";
  }

  alert("Player added successfully.");

  go("players");
});

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();

    r.onload = () => resolve(r.result);

    r.onerror = reject;

    r.readAsDataURL(file);
  });
}
$("#playerForm [name=photo]")?.addEventListener(
  "change",
  async e => {

    const file = e.target.files[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(
        "Please choose a photo under 2 MB."
      );

      e.target.value = "";

      return;
    }

    pendingPhoto =
      await fileToDataURL(file);

    if ($("#photoPreview")) {
      $("#photoPreview").src =
        pendingPhoto;

      $("#photoPreview")
        .classList
        .add("show");
    }

    if ($("#photoHint")) {
      $("#photoHint").textContent =
        file.name;
    }
  }
);

$("#clearBtn")?.addEventListener(
  "click",
  async () => {

    if (
      !confirm(
        "Clear ALL players and matches? This cannot be undone."
      )
    ) {
      return;
    }

    const {
      error: matchError
    } = await supabaseClient
      .from("matches")
      .delete()
      .neq("id", 0);

    if (matchError) {
      alert(
        "Could not clear matches: " +
        matchError.message
      );

      return;
    }

    const {
      error: playerError
    } = await supabaseClient
      .from("kohat zalmi")
      .delete()
      .neq("id", 0);

    if (playerError) {
      alert(
        "Could not clear players: " +
        playerError.message
      );

      return;
    }

    state = {
      players: [],
      matches: []
    };

    render();

    go("dashboard");
  }
);

$("#exportBtn")?.addEventListener(
  "click",
  () => {

    const blob = new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type: "application/json"
      }
    );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      "kohat-zalmi-data.json";

    a.click();

    URL.revokeObjectURL(
      a.href
    );
  }
);

function setTheme(theme) {

  document.body.classList.toggle(
    "night",
    theme === "night"
  );

  if ($("#themeBtn")) {

    $("#themeBtn").textContent =
      theme === "night"
        ? "☀️ Day"
        : "🌙 Night";
  }

  localStorage.setItem(
    THEME_KEY,
    theme
  );
}

const savedTheme =
  localStorage.getItem(
    THEME_KEY
  );

setTheme(
  savedTheme ||
  (
    (new Date()).getHours() >= 18 ||
    (new Date()).getHours() < 6
  )
    ? "night"
    : "day"
);

if ($("#themeBtn")) {

  $("#themeBtn").onclick = () => {

    setTheme(
      document.body.classList.contains(
        "night"
      )
        ? "day"
        : "night"
    );
  };
}

async function loadDataFromSupabase() {

  const [
    playersResult,
    matchesResult
  ] = await Promise.all([

    supabaseClient
      .from("kohat zalmi")
      .select("*")
      .order(
        "id",
        {
          ascending: true
        }
      ),

    supabaseClient
      .from("matches")
      .select("*")
      .order(
        "date",
        {
          ascending: false
        }
      )
  ]);

  if (playersResult.error) {

    console.error(
      "Supabase player loading error:",
      playersResult.error
    );

    alert(
      "Players could not be loaded: " +
      playersResult.error.message
    );

  } else {

    state.players =
      playersResult.data || [];
  }

  if (matchesResult.error) {

    console.error(
      "Supabase match loading error:",
      matchesResult.error
    );

    state.matches = [];

  } else {

    state.matches =
      matchesResult.data || [];
  }

  render();
}

loadDataFromSupabase();
