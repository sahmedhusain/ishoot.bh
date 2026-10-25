"use client";

import * as React from "react";

/**
 * Custom HTML, CSS and JS in a sandboxed iframe: scripts, forms and popups run, but never with the website's
 * origin (no allow-same-origin), so the code cannot read cookies, storage or the page. The frame reports its
 * height through postMessage and grows to fit; messages from anything but this frame are ignored.
 */
export function CodeBlock({ html, css, js, height, title }: { html: string; css: string; js: string; height: number; title: string }) {
  const frame = React.useRef<HTMLIFrameElement>(null);
  const [size, setSize] = React.useState(height || 200);
  const token = React.useId();
  React.useEffect(() => {
    if (height) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const data = event.data as { token?: string; height?: number };
      if (data?.token === token && typeof data.height === "number") setSize(Math.min(6000, Math.max(40, Math.ceil(data.height))));
    };
    window.addEventListener("message", onMessage);
    // The frame may have reported before this listener existed; ask it again.
    frame.current?.contentWindow?.postMessage("measure", "*");
    return () => window.removeEventListener("message", onMessage);
  }, [height, token]);
  // The token is not a secret (the frame cannot reach the page); it only tells this frame's messages apart.
  const resize = `<script>(()=>{const post=()=>parent.postMessage({token:${JSON.stringify(token)},height:Math.ceil(document.body.getBoundingClientRect().height)},"*");new ResizeObserver(post).observe(document.body);addEventListener("load",post);addEventListener("message",(e)=>{if(e.source===parent&&e.data==="measure")post();});post();})();<\/script>`;
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;overflow:hidden;background:transparent;}body{display:flow-root;color:inherit;font-family:system-ui,sans-serif}${css.replace(/<\/style/gi, "<\\/style")}</style></head><body>${html}<script>${js.replace(/<\/script/gi, "<\\/script")}<\/script>${height ? "" : resize}</body></html>`;
  return (
    <section className="relative py-10">
      <div className="shell">
        <iframe ref={frame} onLoad={() => frame.current?.contentWindow?.postMessage("measure", "*")} title={title} srcDoc={srcDoc} sandbox="allow-scripts allow-popups allow-forms" referrerPolicy="no-referrer" loading="lazy" className="w-full border-0" style={{ height: size }} />
      </div>
    </section>
  );
}
