// Painel direito da tela de login — fundo 100% CSS (hachura + faixas
// vermelhas + glow + mira central), sem imagem raster. Decorativo, então
// fica aria-hidden. Ver design_handoff_login_right_panel/README.md.
export function LoginHeroPanel() {
  return (
    <div aria-hidden="true" style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%', background: '#0E0E11' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 9px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '18%',
          width: '120%',
          height: '130%',
          transform: 'rotate(-4deg)',
          background:
            'linear-gradient(115deg, transparent 38%, rgba(255,70,85,0.16) 38%, rgba(255,70,85,0.16) 41%, transparent 41%, transparent 52%, rgba(255,70,85,0.07) 52%, rgba(255,70,85,0.07) 61%, transparent 61%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(70% 55% at 50% 45%, rgba(255,70,85,0.22) 0%, rgba(255,70,85,0.04) 45%, rgba(0,0,0,0) 75%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(11,11,13,0.9) 0%, rgba(11,11,13,0.2) 10%, rgba(11,11,13,0) 24%), linear-gradient(0deg, rgba(11,11,13,0.55) 0%, rgba(11,11,13,0) 30%)',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 48 }}>
        <div style={{ position: 'relative', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="login-hero-ring" style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,70,85,0.28)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', inset: 42, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', inset: 84, border: '3px solid rgba(255,255,255,0.85)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#FF4655', boxShadow: '0 0 28px rgba(255,70,85,0.8)' }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              width: 2,
              height: 66,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.7))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              width: 2,
              height: 66,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(0deg, transparent, rgba(255,255,255,0.7))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              width: 66,
              height: 2,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7))',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              width: 66,
              height: 2,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(270deg, transparent, rgba(255,255,255,0.7))',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#FF4655' }}>
            Dados, Estratégias, Simulação
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: '#E8E8ED', maxWidth: 380, lineHeight: 1.35 }}>
            Cada rodada vira registro.
          </div>
        </div>
      </div>
    </div>
  );
}
