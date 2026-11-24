// Registry + hash router. Each explainer file calls Lab.register({...}).
(function () {
  const explainers = [];
  const groups = ["Regression", "Machine learning", "Probability", "Statistical analysis", "Forecasting"];
  Lab.register = (ex) => explainers.push(ex);
  Lab.titleOf = (id) => (explainers.find((e) => e.id === id) || { title: id }).title;

  // Standard page layout for an explainer.
  Lab.page = (ex, { figure, panel, notes }) => `
    <div class="wrap">
      <header class="ex-head">
        <div class="eyebrow">${ex.group}</div>
        <h1>${ex.title}</h1>
        <p>${ex.lede}</p>
      </header>
      <div class="bench">
        <div class="figure">${figure}</div>
        <aside class="panel" aria-label="Controls">${panel}</aside>
      </div>
      <article class="notes">${notes}</article>
    </div>`;

  let cleanup = null;
  const main = () => document.getElementById("main");

  function home() {
    document.title = "StatML Lab";
    const shelves = groups.map((g) => {
      const items = explainers.filter((e) => e.group === g);
      if (!items.length) return "";
      return `<section><h2>${g}</h2><div class="cards">${items.map((e) => `
        <a class="card" href="#${e.id}">
          <div class="glyph" aria-hidden="true">${e.glyph}</div>
          <h3>${e.title}</h3>
          <p>${e.blurb}</p>
          <span class="go">Open explainer →</span>
        </a>`).join("")}</div></section>`;
    }).join("");
    main().innerHTML = `
      <div class="wrap">
        <header class="home-hero">
          <h1>Statistics and machine learning you can <em>poke at</em></h1>
          <p>Each page is one idea with a live picture. Drag the points, move the sliders, and watch the numbers respond. Then read the short notes underneath for the math that explains what you just saw.</p>
        </header>
        <div class="shelf">${shelves}
          <section><h2>Reference</h2><div class="cards"><a class="card" href="#glossary">
            <div class="glyph" aria-hidden="true"><svg viewBox="0 0 96 64" fill="none" stroke="currentColor" stroke-width="2"><rect x="18" y="6" width="44" height="54" rx="3"/><line x1="26" y1="18" x2="54" y2="18"/><line x1="26" y1="28" x2="50" y2="28" opacity=".5"/><line x1="26" y1="38" x2="54" y2="38" opacity=".5"/><line x1="26" y1="48" x2="44" y2="48" opacity=".5"/><circle cx="70" cy="40" r="9"/><line x1="76" y1="47" x2="86" y2="57"/></svg></div>
            <h3>Glossary</h3><p>${Lab.terms.length} terms in plain language, each linked to the explainer that shows it.</p><span class="go">Browse terms →</span></a></div></section>
        </div>
      </div>`;
  }

  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    const id = location.hash.replace(/^#/, "");
    if (id === "glossary") { Lab.glossaryPage(main()); window.scrollTo(0, 0); return; }
    const ex = explainers.find((e) => e.id === id);
    if (!ex) { home(); window.scrollTo(0, 0); return; }
    document.title = `${ex.title} · StatML Lab`;
    main().innerHTML = "";
    cleanup = ex.mount(main()) || null;
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", route);
  window.addEventListener("DOMContentLoaded", route);
})();
