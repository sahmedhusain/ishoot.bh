"use client";

import * as React from "react";

export function CodeBlock({ html, css, js, height, title, nonce }: { html: string; css: string; js: string; height: number; title: string; nonce?: string }) {
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
    frame.current?.contentWindow?.postMessage("measure", "*");
    return () => window.removeEventListener("message", onMessage);
  }, [height, token]);
  const nonceAttribute = nonce ? ` nonce="${nonce}"` : "";
  const resize = `<script${nonceAttribute}>(()=>{const post=()=>parent.postMessage({token:${JSON.stringify(token)},height:Math.ceil(document.body.getBoundingClientRect().height)},"*");new ResizeObserver(post).observe(document.body);addEventListener("load",post);addEventListener("message",(e)=>{if(e.source===parent&&e.data==="measure")post();});post();})();<\/script>`;
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style${nonceAttribute}>html,body{margin:0;overflow:hidden;background:transparent;}body{display:flow-root;color:inherit;font-family:system-ui,sans-serif}${css.replace(/<\/style/gi, "<\\/style")}</style></head><body>${html}<script${nonceAttribute}>${js.replace(/<\/script/gi, "<\\/script")}<\/script>${height ? "" : resize}</body></html>`;
  return (
    <section className="relative py-10">
      <div className="shell">
        <iframe ref={frame} onLoad={() => frame.current?.contentWindow?.postMessage("measure", "*")} title={title} srcDoc={srcDoc} sandbox="allow-scripts allow-popups allow-forms" referrerPolicy="no-referrer" loading="lazy" className="w-full border-0" style={{ height: size }} />
      </div>
    </section>
  );
}
