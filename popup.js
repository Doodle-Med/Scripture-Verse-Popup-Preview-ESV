document.getElementById("go").onclick = async () => {
  const ref = document.getElementById("ref").value.trim();
  if (!ref) return;
  const out = document.getElementById("out");
  out.textContent = "Fetching…";
  try {
    const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
    const j = await r.json();
    out.textContent = `${ref}\n\n${(j.text || "Verse not found.").trim()}`;
  } catch { out.textContent = "Error."; }
};
