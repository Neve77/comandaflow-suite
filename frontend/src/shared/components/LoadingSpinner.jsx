export default function LoadingSpinner() {
  return (
    <div className="branded-spinner">
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="branded-spinner-ring" style={{ position: 'absolute', width: 68, height: 68, borderWidth: 3 }} />
        <div style={{ width: 48, height: 48, borderRadius: 13, overflow: 'hidden', boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
          <img
            src="/logo-icon.png"
            alt="ComandaFlow"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => {
              e.target.style.display = 'none';
              e.target.parentNode.innerHTML = '<div style="width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#fff;">CF</div>';
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: 2 }}>
          ComandaFlow
        </p>
        <p className="branded-spinner-text">Carregando sistema...</p>
      </div>
    </div>
  );
}
