// Run from the document head, independently of the lazy visitor map.
(() => {
  const apiBase = document.currentScript?.dataset.apiBase?.trim().replace(/\/+$/, "");
  if (!apiBase || window.__cjVisitorCollection) return;

  window.__cjVisitorCollection = (async () => {
    const storageKey = "cj-site-visitor-collected";
    try {
      if (sessionStorage.getItem(storageKey) === "1") return;
    } catch {
      // Storage restrictions must not prevent this page's visit from being sent.
    }

    try {
      const response = await fetch(`${apiBase}/collect`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        keepalive: true
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.collected !== true) return;
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // The in-memory promise still prevents repeat collection on this page.
      }
    } catch {
      // Leave failed visits unmarked so a subsequent page can retry.
    }
  })();
})();
