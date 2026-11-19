(() => {
  "use strict";
  const init = () => {
    if (document.getElementById("snow-debug-widget")) return;
    const style = document.createElement("style");
    style.textContent = `
      #snow-debug-widget{position:fixed!important;right:14px!important;bottom:14px!important;z-index:99999!important;font:13px/1.45 Arial,sans-serif!important;color:#f4f7f4!important}
      #snow-debug-toggle{border:1px solid #9db7a5!important;border-radius:22px!important;background:#173d2c!important;color:white!important;padding:9px 14px!important;font-weight:700!important;box-shadow:0 3px 14px #0005!important;cursor:pointer!important}
      #snow-debug-panel{display:none;width:min(370px,calc(100vw - 28px));max-height:60vh;overflow:auto;margin-bottom:9px;padding:14px;border:1px solid #8da797;border-radius:10px;background:#10251cF2;box-shadow:0 8px 28px #0007}
      #snow-debug-panel.open{display:block}
      #snow-debug-panel h3{margin:0 0 8px;font-size:15px;color:#fff}
      #snow-debug-output{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 10px;font:12px/1.5 ui-monospace,monospace;color:#e0eee4}
      #snow-debug-actions{display:flex;gap:8px;flex-wrap:wrap}
      #snow-debug-actions button{border:1px solid #a8c4b1;border-radius:6px;padding:7px 10px;background:#315b43;color:white;cursor:pointer}
    `;
    document.head.appendChild(style);
    const widget = document.createElement("div");
    widget.id = "snow-debug-widget";
    widget.innerHTML = '<section id="snow-debug-panel" class="open"><h3>❄ Snowfall diagnostics</h3><pre id="snow-debug-output">Checking snowfall…</pre><div id="snow-debug-actions"><button type="button" id="snow-debug-test">Show test flake</button><button type="button" id="snow-debug-refresh">Refresh</button></div></section><button type="button" id="snow-debug-toggle">Snow Debug</button>';
    document.body.appendChild(widget);
    const panel = document.getElementById("snow-debug-panel");
    const output = document.getElementById("snow-debug-output");
    let spriteStatus = "Checking…";
    let spriteUrl = "";
    const checkSprite = () => {
      const layer = document.querySelector(".snow-layer");
      const flake = document.querySelector(".snowflake");
      const bg = flake ? getComputedStyle(flake).backgroundImage : "";
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      spriteUrl = match ? match[1] : new URL("assets/snowflake-1.png?v=1", document.baseURI).href;
      spriteStatus = "Checking…";
      const img = new Image();
      img.onload = () => { spriteStatus = "LOADED (" + img.naturalWidth + "×" + img.naturalHeight + ")"; update(); };
      img.onerror = () => { spriteStatus = "FAILED TO LOAD"; update(); };
      img.src = spriteUrl;
    };
    const update = () => {
      const layer = document.querySelector(".snow-layer");
      const flakes = [...document.querySelectorAll(".snowflake")];
      const first = flakes[0];
      const layerStyle = layer ? getComputedStyle(layer) : null;
      const flakeStyle = first ? getComputedStyle(first) : null;
      const rect = first ? first.getBoundingClientRect() : null;
      const errors = (window.__snowDebugErrors || []).slice(-5);
      const lines = [
        "Snow layer: " + (layer ? "FOUND" : "MISSING"),
        "Flake elements: " + flakes.length,
        "Sprite file: " + spriteStatus,
        "CSS animation: " + (flakeStyle ? flakeStyle.animationName + " / " + flakeStyle.animationPlayState : "NO FLAKE TO CHECK"),
        "Layer z-index: " + (layerStyle ? layerStyle.zIndex : "n/a"),
        "Layer display/visibility: " + (layerStyle ? layerStyle.display + " / " + layerStyle.visibility : "n/a"),
        "Layer size: " + (layer ? Math.round(layer.getBoundingClientRect().width) + "×" + Math.round(layer.getBoundingClientRect().height) : "n/a"),
        "First flake size: " + (rect ? Math.round(rect.width) + "×" + Math.round(rect.height) : "n/a"),
        "First flake position: " + (rect ? Math.round(rect.left) + ", " + Math.round(rect.top) : "n/a"),
        "Snow switched off: " + (layer ? layer.classList.contains("snow-off") : "n/a"),
        "Recent JS errors: " + (errors.length ? "\n  " + errors.join("\n  ") : "none recorded"),
        "Sprite URL: " + spriteUrl
      ];
      output.textContent = lines.join("\n");
    };
    document.getElementById("snow-debug-toggle").addEventListener("click", () => panel.classList.toggle("open"));
    document.getElementById("snow-debug-refresh").addEventListener("click", () => { checkSprite(); update(); });
    document.getElementById("snow-debug-test").addEventListener("click", () => {
      const test = document.createElement("div");
      test.id = "snow-debug-test-flake";
      test.setAttribute("aria-hidden", "true");
      test.style.cssText = 'position:fixed!important;left:50vw!important;top:42vh!important;transform:translate(-50%,-50%)!important;width:120px!important;height:120px!important;display:grid!important;place-items:center!important;z-index:2147483647!important;pointer-events:none!important;border:4px solid #ff00d4!important;background-color:#ff00d4!important;background-image:url("' + new URL("assets/snowflake-1.png?v=1", document.baseURI).href + '")!important;background-size:300% 300%!important;background-position:50% 50%!important;background-repeat:no-repeat!important;box-shadow:0 0 0 8px #00ffff,0 0 35px 18px #ff00d4!important;';
      test.textContent = "TEST";
      test.style.color = "#fff";
      test.style.font = "bold 16px Arial";
      test.style.textShadow = "0 1px 4px #000";
      document.body.appendChild(test);
      const testRect = test.getBoundingClientRect();
      output.textContent += "\nTest element: ADDED at " + Math.round(testRect.left) + ", " + Math.round(testRect.top) + " (" + Math.round(testRect.width) + "×" + Math.round(testRect.height) + ")";
      setTimeout(() => test.remove(), 10000);
      update();
    });
    checkSprite();
    update();
    setInterval(update, 1500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();