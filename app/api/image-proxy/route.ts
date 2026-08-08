/**
 * GET /api/image-proxy?url=IMAGE_URL
 * Proxy pra imagens que bloqueiam hotlink (ex: AliExpress CDN).
 * Usado no sendPhoto do Telegram pra imagens que o Telegram não consegue baixar direto.
 */

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "ae-pic-a1.aliexpress-media.com",
  "ae01.alicdn.com",
  "ae02.alicdn.com",
  "ae03.alicdn.com",
  "ae04.alicdn.com",
  "ae-pic.aliexpress-media.com",
  "img.alicdn.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Segurança: só permite hosts conhecidos que bloqueiam hotlink
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    return NextResponse.json({ error: "host not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://pt.aliexpress.com/",
        "Accept": "image/webp,image/*,*/*",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `upstream ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
