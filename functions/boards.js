export async function onRequest({ env }) {
  const token = env.PINTEREST_ACCESS_TOKEN;
  if (!token) return json({ error: "Missing PINTEREST_ACCESS_TOKEN" }, 500);

  let r, text, data;
  try {
    r = await fetch("https://api.pinterest.com/v5/boards?page_size=50", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    text = await r.text();
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
  } catch (e) {
    return json({ error: `Network error calling Pinterest`, details: String(e) }, 502);
  }

  if (!r.ok) {
    return json({
      error: "Pinterest API error",
      status: r.status,
      details: data?.message || data?.error || data?.raw || data,
      hint: "Likely token missing scopes or expired. Needs boards:read.",
    }, r.status);
  }

  const items = Array.isArray(data.items) ? data.items : [];
  return json(items.map(b => ({ id: b.id, name: b.name })));
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
  });
}
