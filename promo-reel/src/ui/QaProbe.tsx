import React, { useEffect, useState } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";

/**
 * QA only (inputProps.qa). After each frame paints, measures every element tagged with
 * data-qa and logs its on-screen box + effective opacity as one JSON line ("QA {...}").
 * scripts/qa-check.mjs collects these lines and checks safe area, overlaps and clipped text.
 */
export const QaProbe: React.FC = () => {
  const frame = useCurrentFrame();
  const [handle] = useState(() => delayRender("qa probe"));
  useEffect(() => {
    const h = delayRender(`qa ${frame}`);
    requestAnimationFrame(() => {
      const items = [...document.querySelectorAll<HTMLElement>("[data-qa]")].map((el) => {
        const r = el.getBoundingClientRect();
        let op = 1;
        for (let n: HTMLElement | null = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity || 1);
        const clipped = el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === "hidden";
        return {
          id: el.dataset.qa,
          x: Math.round(r.left),
          y: Math.round(r.top),
          r: Math.round(r.right),
          b: Math.round(r.bottom),
          op: Math.round(op * 100) / 100,
          clipped,
          text: (el.innerText || "").replace(/\s+/g, " ").slice(0, 60),
        };
      });
      console.log("QA " + JSON.stringify({ frame, items }));
      continueRender(h);
    });
  }, [frame]);
  useEffect(() => continueRender(handle), [handle]);
  return null;
};
