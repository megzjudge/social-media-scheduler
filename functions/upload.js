export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!env.MEDIA_BUCKET) return json({ error: "R2 binding MEDIA_BUCKET not configured" }, 500);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Missing file" }, 400);

  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "bin";
  const key = `uploads/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;

  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  if (!env.PUBLIC_BASE_URL) {
    return json({ error: "Set PUBLIC_BASE_URL to your R2 public domain" }, 500);
  }
  const url = `${env.PUBLIC_BASE_URL.replace(/\\/$/, "")}/${key}`;
  return json({ url });
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