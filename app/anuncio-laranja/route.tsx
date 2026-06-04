/**
 * GET /anuncio-laranja
 * Gera dinamicamente a imagem do anúncio (PNG 1080x1350)
 * Para usar no Meta Ads como image_url
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          background: "linear-gradient(135deg, #FF5A1F 0%, #E04A0F 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Borda tracejada */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            left: "30px",
            right: "30px",
            bottom: "30px",
            border: "4px dashed rgba(255,255,255,0.7)",
            borderRadius: "20px",
          }}
        />

        {/* HEADER: TAG + CUPOM HOJE OFICIAL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "30px",
            marginBottom: "30px",
            marginTop: "30px",
          }}
        >
          {/* Tag de desconto */}
          <div
            style={{
              width: "180px",
              height: "180px",
              background: "white",
              borderRadius: "20px 20px 20px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FF5A1F",
              fontSize: "120px",
              fontWeight: "900",
              position: "relative",
              transform: "rotate(-5deg)",
            }}
          >
            %
            <div
              style={{
                position: "absolute",
                left: "20px",
                top: "20px",
                width: "30px",
                height: "30px",
                background: "#FF5A1F",
                borderRadius: "50%",
              }}
            />
          </div>

          {/* CUPOM HOJE OFICIAL */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <div style={{ fontSize: "100px", fontWeight: "900", lineHeight: 1 }}>
              CUPOM
            </div>
            <div style={{ fontSize: "60px", fontWeight: "400", letterSpacing: "12px", lineHeight: 1 }}>
              H O J E
            </div>
            <div style={{ fontSize: "80px", fontWeight: "900", lineHeight: 1 }}>
              OFICIAL
            </div>
          </div>
        </div>

        {/* Linha separadora com tesoura */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "80%",
            gap: "20px",
            margin: "30px 0",
          }}
        >
          <div style={{ flex: 1, height: "0", borderTop: "3px dashed rgba(255,255,255,0.6)" }} />
          <div style={{ fontSize: "60px" }}>✂</div>
          <div style={{ flex: 1, height: "0", borderTop: "3px dashed rgba(255,255,255,0.6)" }} />
        </div>

        {/* Subtítulo */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: "800",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "50px",
          }}
        >
          Cupons e Descontos
          <br />
          GRÁTIS no Telegram
        </div>

        {/* Cards das lojas */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "30px",
            marginBottom: "50px",
          }}
        >
          {[
            { name: "amazon", color: "#FFFFFF", text: "amazon", discount: "-60% OFF" },
            { name: "AliExpress", color: "#FFFFFF", text: "AliExpress", discount: "-80% OFF" },
            { name: "Shopee", color: "#FFFFFF", text: "Shopee", discount: "-50% OFF" },
            { name: "LG", color: "#FFFFFF", text: "LG", discount: "-37% OFF" },
          ].map((store) => (
            <div
              key={store.name}
              style={{
                width: "380px",
                height: "180px",
                background: "rgba(255,255,255,0.1)",
                border: "3px dashed rgba(255,255,255,0.5)",
                borderRadius: "15px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "50px", fontWeight: "900", color: store.color }}>
                {store.text}
              </div>
              <div style={{ fontSize: "44px", fontWeight: "800" }}>
                {store.discount}
              </div>
            </div>
          ))}
        </div>

        {/* Info rodapé */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "20px",
            fontSize: "36px",
          }}
        >
          <span style={{ fontSize: "44px" }}>⏰</span>
          <span>Nova oferta a cada 15min</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
            fontSize: "44px",
            fontWeight: "800",
          }}
        >
          <span>🎁</span>
          <span>100% GRÁTIS</span>
        </div>

        {/* CTA */}
        <div
          style={{
            background: "#229ED9",
            padding: "30px 80px",
            borderRadius: "100px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            fontSize: "52px",
            fontWeight: "900",
          }}
        >
          <span style={{ fontSize: "60px" }}>✈</span>
          <span>ENTRE NO CANAL</span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    }
  );
}
