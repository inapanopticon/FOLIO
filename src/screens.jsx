// Locus — small pieces shared by every screen

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Space for the phone's own status bar / notch (the real one shows through).
function StatusBar() {
  return <div className="status-bar"/>;
}

// The old starry background is gone; kept as a no-op so older screens still render.
function BgStars() { return null; }

function Toast({ message, action, onAction, onDone }) {
  useEffect(()=>{ const t = setTimeout(onDone, 3200); return ()=>clearTimeout(t); },[onDone, message]);
  if (!message) return null;
  return (
    <div className="toast-host">
      <div className="toast">
        <span>{message}</span>
        {action && <button onClick={onAction}>{action}</button>}
      </div>
    </div>
  );
}

window.LocusScreens = { StatusBar, BgStars, Toast };
