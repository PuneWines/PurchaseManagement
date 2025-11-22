
// Point to your Apps Script Web App deployment. You can set APPS_SCRIPT_URL
// in your Vercel project environment variables for easy rotation.
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbxYJiNFW0EWEnOjqhph9gr8Wvmjgfvgo1ZxQ0E4FlJTj9Qxd3TFuARjR0Rz1DHvdbOc/exec';

export default async function handler(req: any, res: any) {
  try {
    const method = (req.method || 'GET').toUpperCase();

    // Build target URL by preserving incoming query params
    const target = new URL(APPS_SCRIPT_URL);
    const incomingUrl = new URL(req.url || '/', `http://${req.headers.host}`);
    for (const [k, v] of incomingUrl.searchParams.entries()) {
      if (!target.searchParams.has(k)) target.searchParams.set(k, v);
    }

    // Prepare headers to forward (content-type and authorization are usually enough)
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v !== 'string') continue;
      const key = k.toLowerCase();
      if (key.startsWith('content-') || key === 'authorization') {
        headers[k] = v;
      }
    }

    // Prepare body for non-GET/HEAD
    let body: BodyInit | undefined = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      const ct = req.headers['content-type'] || '';
      if (typeof ct === 'string' && ct.includes('application/json')) {
        // Vercel parses JSON into req.body when content-type is application/json
        body = JSON.stringify(req.body ?? {});
        headers['content-type'] = 'application/json';
      } else if (typeof ct === 'string' && ct.includes('application/x-www-form-urlencoded')) {
        // Forward urlencoded body as-is
        const chunks: Uint8Array[] = [];
        for await (const chunk of req) chunks.push(chunk as Uint8Array);
        body = Buffer.concat(chunks);
        headers['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      } else {
        // Generic passthrough (e.g., multipart/form-data)
        const chunks: Uint8Array[] = [];
        for await (const chunk of req) chunks.push(chunk as Uint8Array);
        body = Buffer.concat(chunks);
        if (typeof ct === 'string' && ct) headers['content-type'] = ct;
      }
    }

    const upstream = await fetch(target.toString(), {
      method,
      headers,
      body,
    });

    // Mirror status and content-type
    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    const respText = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    // Optional: expose specific headers if needed
    // res.setHeader('Access-Control-Expose-Headers', 'Content-Type');

    return res.send(respText);
  } catch (err: any) {
    res.status(500).json({ success: false, error: String(err?.message || err) });
  }
}
