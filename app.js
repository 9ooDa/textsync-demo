"use strict";

const $ = (sel, root) => (root || document).querySelector(sel);
const secs = (t) => (Math.floor(t * 10) / 10).toFixed(1) + "s";

async function main() {
  const mono = $("#cards-mono");
  const xling = $("#cards-xling");
  let data;
  try {
    const res = await fetch("samples.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = await res.json();
  } catch (err) {
    mono.innerHTML =
      '<p class="fine">Could not read <code>samples.json</code>. ' +
      "Run <code>build_samples.py</code> first.</p>";
    return;
  }
  mono.textContent = "";
  xling.textContent = "";
  let n = 0;
  [["en", mono, "mono"], ["es", xling, "xling"]].forEach(([lang, host, id]) => {
    const rows = data.samples.filter((s) => s.lang === lang);
    rows.forEach((s) => host.append(card(s, n++, data.deployed_key)));
    const label = $("#" + id + "-count");
    if (label) {
      label.textContent = rows.length
        ? rows.length + (rows.length === 1 ? " clip" : " clips")
        : "";
    }
    const block = $("#" + id);
    if (block) block.hidden = rows.length === 0;
  });
}

function card(s, index, deployedKey) {
  const el = document.createElement("article");
  el.className = "card";
  el.id = "s-" + s.id;
  el.tabIndex = 0;
  el.setAttribute("aria-label", "Sample " + (index + 1));

  const head = document.createElement("header");
  head.className = "cardhead";
  const quote = document.createElement("p");
  quote.className = "quote";
  quote.style.margin = "0";
  quote.textContent = s.source_text ? "“" + s.source_text + "”" : s.id;
  const badge = document.createElement("span");
  badge.className = "badge";
  const N = s.candidates.length;
  badge.textContent = s.lang === "es"
    ? "EN video → ES dubs" : "EN video → EN paraphrases";
  const meta = document.createElement("span");
  meta.className = "cardmeta";
  meta.textContent = [s.speaker, s.duration ? secs(s.duration) : null]
    .filter(Boolean).join(" · ");
  head.append(quote, badge, meta);

  const video = document.createElement("video");
  video.src = s.clips[0];
  video.width = 640;
  video.height = 360;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("aria-label", "Dubbed clip, candidate 1 of " + N);

  let live = 0;
  const revealed = true;

  let wantPlay = false;
  function start() {
    wantPlay = true;
    const p = video.play();
    if (p && p.catch) p.catch(() => {  });
  }
  video.addEventListener("canplay", () => {
    if (wantPlay && video.paused) video.play().catch(() => {});
  });
  video.addEventListener("pause", () => {
    if (!video.ended) wantPlay = false;
  });
  video.addEventListener("ended", () => { wantPlay = false; });

  function swap(k) {
    if (k === live) return;
    const running = !video.paused && !video.ended;
    live = k;
    video.src = s.clips[k];
    video.setAttribute("aria-label",
      "Dubbed clip, candidate " + (k + 1) + " of " + N);
    if (running) start();
    paint();
  }

  const transport = document.createElement("div");
  transport.className = "transport";
  const play = document.createElement("button");
  play.type = "button";
  play.className = "tbtn";
  play.textContent = "Play";
  play.addEventListener("click", () => {
    if (video.paused) start(); else video.pause();
  });
  const restart = document.createElement("button");
  restart.type = "button";
  restart.className = "tbtn";
  restart.textContent = "Restart";
  restart.addEventListener("click", () => {
    video.currentTime = 0;
    start();
  });
  const clock = document.createElement("span");
  clock.className = "clock";
  clock.textContent = "0.0s";
  transport.append(play, restart, clock);
  video.addEventListener("play", () => { play.textContent = "Pause"; });
  video.addEventListener("pause", () => { play.textContent = "Play"; });
  video.addEventListener("timeupdate", () => {
    clock.textContent = secs(video.currentTime) +
      (video.duration ? " / " + secs(video.duration) : "");
  });

  const list = document.createElement("ul");
  list.className = "opts";
  list.setAttribute("aria-label", "Candidate dub lines");
  const rows = s.candidates.map((text, k) => {
    const li = document.createElement("li");
    li.className = "opt";

    const listen = document.createElement("button");
    listen.type = "button";
    listen.className = "listen";
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = String(k + 1);
    const txt = document.createElement("span");
    txt.className = "txt";
    txt.textContent = text;
    const flag = document.createElement("span");
    flag.className = "flag";
    listen.append(n, txt, flag);
    listen.addEventListener("click", () => swap(k));

    li.append(listen);
    list.append(li);
    return { li, flag };
  });

  const reveal = document.createElement("div");
  reveal.className = "reveal";
  const verdict = document.createElement("p");
  verdict.className = "verdict";
  const table = document.createElement("table");
  table.className = "methods";
  reveal.append(verdict, table);
  const extra = s.extra_slots || [];
  if (extra.length) {
    const note = document.createElement("p");
    note.className = "fine extranote";
    note.textContent =
      "Line " + extra.map((k) => k + 1).join(", ") + " was written for this page: "
      + "the scored pool holds " + (N - extra.length) + " lines for this clip. It went "
      + "through the same scorer, which still puts the human dub first. The other "
      + "methods ran before it existed and never saw it.";
    reveal.append(note);
  }

  function paint() {
    rows.forEach(({ li, flag }, k) => {
      li.classList.toggle("live", k === live);
      li.classList.toggle("truth", revealed && k === s.truth_index);
      const tags = [];
      if (revealed && k === s.truth_index) tags.push("Human dub");
      if (revealed) {
        (s.methods || []).forEach((m) => {
          if (m.pick === k) tags.push(m.label.replace(/ \(.*\)/, ""));
        });
      }
      if (extra.indexOf(k) >= 0) tags.push("added for this demo");
      flag.textContent = tags.join(" · ");
    });
    if (!revealed) return;

    const n = s.truth_index + 1;
    const ts = (s.methods || []).find((m) => m.deployed);
    verdict.innerHTML = "The human dub was line <strong>" + n + "</strong>."
      + (ts && ts.hit >= 1
          ? ' <span class="hit">TextSync picked it.</span>'
          : "");

    table.textContent = "";
    const cap = document.createElement("caption");
    cap.textContent = "Did the model pick the human dub line?"
      + (typeof s.margin === "number"
          ? "  ·  TextSync led the runner-up by " + s.margin.toFixed(4)
          : "");
    table.append(cap);
    const methods = s.methods || [];
    if (!methods.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 3;
      td.className = "fine";
      td.textContent = "No scoring dump covers this trial.";
      tr.append(td);
      table.append(tr);
      return;
    }
    const hrow = document.createElement("tr");
    ["Method", "Picked", "Correct"].forEach((h, i) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      if (i) th.className = "v";
      hrow.append(th);
    });
    table.append(hrow);
    methods.forEach((m) => {
      const tr = document.createElement("tr");
      if (m.key === deployedKey) tr.className = "deployed";
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = m.label;
      const picked = document.createElement("td");
      picked.className = "v";
      picked.textContent = m.pick === null || m.pick === undefined
        ? "—" : "line " + (m.pick + 1);
      if (m.pick === null || m.pick === undefined) {
        picked.title = m.note || "no pick index in the dump";
      }
      const td = document.createElement("td");
      if (m.hit === null || m.hit === undefined) {
        td.className = "v";
        td.textContent = "n/a";
        td.title = m.note || "no score for this trial";
      } else {
        td.className = "v " + (m.hit >= 1 ? "hit" : "miss");
        td.textContent = m.hit >= 1 ? "Yes"
          : (m.hit > 0 ? "Tied · " + m.hit.toFixed(2) : "No");
      }
      tr.append(th, picked, td);
      table.append(tr);
    });
  }

  el.addEventListener("keydown", (e) => {
    const tag = e.target.tagName;
    if (e.key >= "1" && e.key <= String(Math.min(N, 9))) {
      swap(e.key.charCodeAt(0) - 49);
      e.preventDefault();
    } else if (e.key === " " && tag !== "BUTTON") {
      if (video.paused) start(); else video.pause();
      e.preventDefault();
    }
  });

  const figs = s.figures || [];
  const figWrap = document.createElement("div");
  figWrap.className = "cardfigs";
  if (figs.length) {
    const LABEL = {
      fit: "Best and worst candidate, mapped through the lip feature bank",
      contrast: "Where the two candidates differ",
      map: "Lip feature bank map",
    };
    figs.forEach((f) => {
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      img.src = f.src;
      img.width = f.width || 1400;
      img.height = f.height || 800;
      img.loading = "lazy";
      img.decoding = "async";
      img.alt = (LABEL[f.kind] || f.kind) + " for this clip.";
      const cap = document.createElement("figcaption");
      cap.textContent = LABEL[f.kind] || f.kind;
      fig.append(img, cap);
      figWrap.append(fig);
    });
  }

  const gen = document.createElement("p");
  gen.className = "gennote";
  gen.textContent = "AI-generated with LTX-2.3 (TalkVid A2V LoRA). "
    + "The person on screen is synthetic, not a real individual.";

  const body = document.createElement("div");
  body.className = "cardmain";
  body.append(video, gen, transport, list, reveal);
  el.append(head, body, figWrap);
  paint();
  return el;
}

main();
