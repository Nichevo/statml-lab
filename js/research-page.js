// "Research" tab: recent studies and posts in the site's areas, with plain-English summaries.
// The list itself lives in js/research.js (Lab.research), refreshed by hand or by the weekly task.
Lab.researchPage = (main) => {
  document.title = "Research · StatML Lab";
  const R = Lab.research || { updated: "", items: [] };
  const items = R.items.slice();
  const topics = [...new Set(items.flatMap((x) => x.topics))].sort();
  const count = (t) => items.filter((x) => x.topics.includes(t)).length;
  const fmtDate = (d) => { const [y, m, day] = d.split("-").map(Number); return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }); };
  const imp = (x) => (x.score ? x.score.reduce((a, b) => a + b, 0) / x.score.length : 0);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let saved = {}; try { saved = JSON.parse(localStorage.getItem("statml-research") || "{}"); } catch (e) { saved = {}; }
  const S = { q: "", topics: new Set((saved.topics || []).filter((t) => topics.includes(t))), type: saved.type || "all", sort: saved.sort || "new", since: saved.since || "all", min: saved.min || "0" };
  const save = () => { try { localStorage.setItem("statml-research", JSON.stringify({ topics: [...S.topics], type: S.type, sort: S.sort, since: S.since, min: S.min })); } catch (e) { /* storage unavailable */ } };

  main.innerHTML = `
    <div class="wrap">
      <header class="ex-head">
        <div class="eyebrow">Reference</div>
        <h1>Research</h1>
        <p>Recent studies and posts on forecasting, supply chain, statistics and machine learning, each with a plain-English summary and links to the explainers that cover the idea. ${R.updated ? `Last updated ${fmtDate(R.updated)}.` : ""}</p>
      </header>
      <div class="rs-bar">
        <input id="rq" type="search" placeholder="Search titles and summaries" aria-label="Search research">
        <div class="seg" id="rType" role="group" aria-label="Type">
          <button type="button" data-v="all">All</button><button type="button" data-v="paper">Papers</button><button type="button" data-v="post">Posts</button>
        </div>
        <label class="rs-sel">Show <select id="rSince" aria-label="Date range">
          <option value="all">any date</option><option value="3">last 3 months</option><option value="6">last 6 months</option><option value="12">last 12 months</option>
        </select></label>
        <label class="rs-sel">Sort <select id="rSort" aria-label="Sort order">
          <option value="new">newest first</option><option value="old">oldest first</option><option value="imp">most important first</option>
        </select></label>
        <label class="rs-sel">Importance <select id="rMin" aria-label="Minimum importance">
          <option value="0">any</option><option value="3.5">3.5 and up</option><option value="4">4 and up</option>
        </select></label>
      </div>
      <details class="rs-how"><summary>How importance is scored</summary>
        <p>Each item gets three scores from 1 to 5, and importance is their average.</p>
        <ul>
          <li><b>Relevance</b>: 5 if it is directly about demand planning, inventory or supply decisions; 3 for general forecasting or ML a planner would use; lower for niche topics.</li>
          <li><b>Evidence</b>: 5 for a real company deployment or a large real-data study that has been peer reviewed; 4 for many datasets or careful theory; 3 for a solid benchmark or simulation; 2 for claims with few numbers; 1 for opinion only.</li>
          <li><b>Practicality</b>: 5 if you can use it now (a tool, rule of thumb or baseline); 3 if it changes how you evaluate or choose methods; 1 if it is research only.</li>
        </ul>
        <p>The scores are a judgement made when the item is added, to help you choose what to read first. They are not a measure of the authors' quality.</p>
      </details>
      <div class="rs-topics" id="rTopics" role="group" aria-label="Topics"></div>
      <p class="hint" id="rCount" aria-live="polite"></p>
      <div id="rList" class="rs-list"></div>
      <p class="hint rs-foot">Summaries are written for this site from each paper's abstract or the post itself; follow the link for the full detail. Preprints (arXiv) have not yet been through peer review.</p>
    </div>`;
  const $ = (s) => main.querySelector(s);
  $("#rSince").value = S.since; $("#rSort").value = S.sort; $("#rMin").value = S.min;

  const renderTopics = () => {
    $("#rTopics").innerHTML = `<button type="button" class="rs-chip" data-t="" aria-pressed="${S.topics.size === 0}">All topics</button>` +
      topics.map((t) => `<button type="button" class="rs-chip" data-t="${esc(t)}" aria-pressed="${S.topics.has(t)}">${esc(t)} <span>${count(t)}</span></button>`).join("");
    main.querySelectorAll("#rType button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === S.type)));
  };
  const render = () => {
    const q = S.q.trim().toLowerCase();
    let cut = "";
    if (S.since !== "all" && R.updated) { const [y, m, d] = R.updated.split("-").map(Number); const c = new Date(Date.UTC(y, m - 1 - Number(S.since), d)); cut = c.toISOString().slice(0, 10); }
    const list = items
      .filter((x) => S.type === "all" || x.type === S.type)
      .filter((x) => !S.topics.size || x.topics.some((t) => S.topics.has(t)))
      .filter((x) => !cut || x.date >= cut)
      .filter((x) => imp(x) >= Number(S.min) - 1e-9)
      .filter((x) => !q || [x.title, x.summary, x.why || "", x.authors, x.source, x.topics.join(" ")].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (S.sort === "imp" ? imp(b) - imp(a) || b.date.localeCompare(a.date) : S.sort === "new" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
    $("#rCount").textContent = `${list.length} of ${items.length} ${items.length === 1 ? "item" : "items"}`;
    $("#rList").innerHTML = list.length ? list.map((x) => `
      <article class="rs-card">
        <div class="rs-meta"><time datetime="${x.date}">${fmtDate(x.date)}</time><span class="pill ${x.type === "post" ? "warn" : "ok"}">${x.type === "post" ? "Post" : "Paper"}</span>${x.topics.map((t) => `<span class="rs-tag">${esc(t)}</span>`).join("")}</div>
        ${x.score ? `<div class="rs-imp" title="Relevance ${x.score[0]}/5 · Evidence ${x.score[1]}/5 · Practicality ${x.score[2]}/5"><span class="rs-bar5" aria-hidden="true"><i style="width:${(imp(x) / 5) * 100}%"></i></span><b>Importance ${imp(x).toFixed(1)}</b><span>relevance ${x.score[0]} · evidence ${x.score[1]} · practicality ${x.score[2]}</span></div>` : ""}
        <h3><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a></h3>
        <p class="rs-by">${esc(x.authors)} · ${esc(x.source)}</p>
        <p>${esc(x.summary)}</p>
        ${x.why ? `<p class="rs-why"><b>Why it matters:</b> ${esc(x.why)}</p>` : ""}
        ${x.related && x.related.length ? `<p class="rs-rel">On this site: ${x.related.filter((id) => Lab.titleOf(id)).map((id) => `<a href="#${id}">${esc(Lab.titleOf(id))}</a>`).join(" · ")}</p>` : ""}
      </article>`).join("") : `<p class="hint">Nothing matches these filters.</p>`;
  };
  $("#rq").addEventListener("input", (e) => { S.q = e.target.value; render(); });
  $("#rTopics").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; const t = b.dataset.t; if (!t) S.topics.clear(); else if (S.topics.has(t)) S.topics.delete(t); else S.topics.add(t); save(); renderTopics(); render(); });
  $("#rType").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; S.type = b.dataset.v; save(); renderTopics(); render(); });
  $("#rSince").addEventListener("change", (e) => { S.since = e.target.value; save(); render(); });
  $("#rSort").addEventListener("change", (e) => { S.sort = e.target.value; save(); render(); });
  $("#rMin").addEventListener("change", (e) => { S.min = e.target.value; save(); render(); });
  renderTopics(); render();
};
