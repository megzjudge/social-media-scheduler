export async function onRequest({ request, env }) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  // ✅ Make sure the R2 binding exists
  if (!env.MEDIA_BUCKET || !env.MEDIA_BUCKET.put) {
    return json(
      { error: "R2 binding MEDIA_BUCKET not configured (Functions → R2 Bindings)" },
      500
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Invalid multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Missing file" }, 400);
  }

  // Build a key
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "bin";
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  // ✅ Use arrayBuffer() (works reliably on Pages Functions)
  const bytes = await file.arrayBuffer();

  try {
    await env.MEDIA_BUCKET.put(key, bytes, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
  } catch (err) {
    return json(
      { error: `R2 put failed: ${err?.message || String(err)}` },
      500
    );
  }

  // You need a **public HTTP URL** so Pinterest can fetch the image
  if (!env.PUBLIC_BASE_URL) {
    // Tell user exactly what to configure
    return json(
      {
        error:
          "Set PUBLIC_BASE_URL in Pages env to the public domain that serves your R2 bucket (e.g., https://media.example.com)",
      },
      500
    );
  }

  const url = `${env.PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  return json({ url });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  };
}
