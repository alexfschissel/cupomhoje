/**
 * GET /anuncio-laranja
 * Gera dinamicamente a imagem do anúncio (PNG 1080x1350)
 * Para usar no Meta Ads como image_url
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FF5A1F",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "150px",
              height: "150px",
              background: "white",
              color: "#FF5A1F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "100px",
              fontWeight: 900,
              borderRadius: "20px",
              marginRight: "30px",
            }}
          >
            %
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "90px", fontWeight: 900, lineHeight: 1 }}>CUPOM</div>
            <div style={{ fontSize: "50px", fontWeight: 400, letterSpacing: "15px", lineHeight: 1 }}>HOJE</div>
            <div style={{ fontSize: "70px", fontWeight: 900, lineHeight: 1 }}>OFICIAL</div>
          </div>
        </div>

        {/* Subtítulo */}
        <div
          style={{
            fontSize: "48px",
            fontWeight: 800,
            textAlign: "center",
            marginBottom: "50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div>Cupons e Descontos</div>
          <div>GRÁTIS no Telegram</div>
        </div>

        {/* Grid de lojas */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            marginBottom: "50px",
          }}
        >
          <div style={{ display: "flex", gap: "20px" }}>
            <div
              style={{
                width: "350px",
                height: "150px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
              }}
            >
              <div style={{ fontSize: "44px", fontWeight: 900 }}>amazon</div>
              <div style={{ fontSize: "40px", fontWeight: 800 }}>-60% OFF</div>
            </div>
            <div
              style={{
                width: "350px",
                height: "150px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
              }}
            >
              <div style={{ fontSize: "44px", fontWeight: 900 }}>AliExpress</div>
              <div style={{ fontSize: "40px", fontWeight: 800 }}>-80% OFF</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <div
              style={{
                width: "350px",
                height: "150px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
              }}
            >
              <div style={{ fontSize: "44px", fontWeight: 900 }}>Shopee</div>
              <div style={{ fontSize: "40px", fontWeight: 800 }}>-50% OFF</div>
            </div>
            <div
              style={{
                width: "350px",
                height: "150px",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "20px",
              }}
            >
              <div style={{ fontSize: "44px", fontWeight: 900 }}>LG</div>
              <div style={{ fontSize: "40px", fontWeight: 800 }}>-37% OFF</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            marginBottom: "20px",
            display: "flex",
          }}
        >
          Nova oferta a cada 15min
        </div>
        <div
          style={{
            fontSize: "44px",
            fontWeight: 900,
            marginBottom: "50px",
            display: "flex",
          }}
        >
          100% GRATIS
        </div>

        {/* CTA */}
        <div
          style={{
            background: "#229ED9",
            color: "white",
            padding: "30px 80px",
            fontSize: "48px",
            fontWeight: 900,
            borderRadius: "100px",
            display: "flex",
          }}
        >
          ENTRE NO CANAL
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  );
}
