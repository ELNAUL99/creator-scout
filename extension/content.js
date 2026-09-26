(function () {
  const isTikTok = location.hostname.includes("tiktok");
  const isIg = location.hostname.includes("instagram");
  if (isIg && !/^\/[A-Za-z0-9._]+\/?$/.test(location.pathname)) return;
  if (isTikTok && !location.pathname.startsWith("/@")) return;

  function parseCount(raw) {
    if (!raw) return 0;
    const t = String(raw).replace(/,/g, "").replace(/\s/g, "").trim();
    const m = t.match(/^([\d.]+)\s*([KMB])?/i);
    if (!m) return 0;
    const n = Number(m[1]);
    const u = (m[2] || "").toUpperCase();
    if (u === "K") return Math.round(n * 1e3);
    if (u === "M") return Math.round(n * 1e6);
    if (u === "B") return Math.round(n * 1e9);
    return Math.round(n);
  }

  function textCountNear(label) {
    const re = new RegExp("([\\d.,]+\\s*[KMB]?)\\s*" + label, "i");
    const m = document.body.innerText.match(re);
    return parseCount(m?.[1]);
  }

  const followersEl =
    document.querySelector('[data-e2e="followers-count"]') ||
    document.querySelector('header li a[href$="/followers/"] span span') ||
    document.querySelector("header section ul li span");
  const likesEl = document.querySelector("[data-e2e='likes-count']");

  const name =
    document.querySelector('[data-e2e="user-title"]')?.textContent?.trim() ||
    document.querySelector("header h2, header h1")?.textContent?.trim() ||
    document.querySelector("h1, h2")?.textContent?.trim() ||
    document.title;
  const bio =
    document.querySelector('[data-e2e="user-bio"]')?.textContent?.trim() ||
    document.querySelector("header h1")?.parentElement?.innerText ||
    document.querySelector("header")?.innerText ||
    document.body.innerText.slice(0, 600);
  const captions = [...document.querySelectorAll('[data-e2e="user-post-item"] img, article img')]
    .map((el) => el.getAttribute("alt") || "")
    .filter(Boolean)
    .slice(0, 8);
  const followers = parseCount(followersEl?.textContent) || textCountNear("followers") || textCountNear("Follower");
  const likes = parseCount(likesEl?.textContent) || textCountNear("likes") || textCountNear("Likes");
  const comments = textCountNear("comments") || textCountNear("Comments");
  const handleMatch = location.pathname.match(/@?([A-Za-z0-9._]+)/);
  const handle = handleMatch?.[1] || name;

  fetch("http://localhost:3000/api/score-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      handle,
      url: location.href,
      platform: isTikTok ? "tiktok" : "instagram",
      bio,
      captions: captions.length ? captions : [document.title],
      followers,
      likes,
      comments,
      views: Math.max(likes * 12, 1),
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      document.getElementById("creator-scout-lens")?.remove();
      const el = document.createElement("div");
      el.id = "creator-scout-lens";
      el.style.cssText =
        "position:fixed;z-index:2147483647;bottom:16px;right:16px;background:#0b0f0c;color:#e8eee9;padding:14px 16px;border:1px solid #34d399;border-radius:12px;font:13px/1.4 system-ui;max-width:320px;box-shadow:0 12px 40px #0008";
      const comps = data.components || {};
      const title = document.createElement("div");
      title.style.cssText = "font-weight:600;margin-bottom:6px";
      title.textContent = `Scout Lens · ${data.fit} fit${data.hiddenGem ? " · hidden gem" : ""}`;
      const meta = document.createElement("div");
      meta.style.cssText = "color:#a1a1aa;font-size:12px";
      meta.textContent = `${data.tier || ""} · ${(data.followers || 0).toLocaleString()} followers`;
      const grid = document.createElement("div");
      grid.style.cssText = "margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;color:#d4d4d8";
      ["Niche " + (comps.nicheRelevance ?? "—"), "Audience " + (comps.audienceMatch ?? "—"), "Engage " + (comps.engagementQuality ?? "—"), "Brand " + (comps.brandFit ?? "—")].forEach(
        (t) => {
          const s = document.createElement("span");
          s.textContent = t;
          grid.appendChild(s);
        },
      );
      const why = document.createElement("p");
      why.style.cssText = "margin:8px 0 0;font-size:11px;color:#bbf7d0";
      why.textContent = (data.reasons || []).join(" ");
      const foot = document.createElement("p");
      foot.style.cssText = "margin:8px 0 0;font-size:10px;color:#71717a";
      foot.textContent = "Your session, one profile. Not sent. Production scores the same way.";
      el.append(title, meta, grid, why, foot);
      document.body.appendChild(el);
    })
    .catch(() => {});
})();
