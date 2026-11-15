// Photos and PDFs people send (payment slips). Loaded through the signed-in API as a Blob, shown
// as a thumbnail; a click opens the full image (or the PDF in a new tab).

import { useEffect, useState } from "react";
import { fetchMedia } from "./api";

export function MediaThumb({ mediaId, mime, saved, size = "md" }: {
  mediaId: string; mime: string | null; saved: boolean; size?: "sm" | "md";
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(!saved);
  const [open, setOpen] = useState(false);
  const isPdf = mime === "application/pdf";

  useEffect(() => {
    if (!saved) return;
    let objectUrl: string | null = null;
    let live = true;
    fetchMedia(mediaId)
      .then((blob) => { if (!live) return; objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [mediaId, saved]);

  if (failed) {
    return <div className={`media-thumb media-missing media-${size}`} title="Sent before slips were saved, or the download failed">{isPdf ? "PDF" : "Photo"} not saved</div>;
  }
  if (!url) return <div className={`media-thumb media-loading media-${size}`} aria-busy="true" />;

  const show = () => (isPdf ? window.open(url, "_blank", "noopener") : setOpen(true));
  return (
    <>
      <button type="button" className={`media-thumb media-${size}`} onClick={show} aria-label={isPdf ? "Open the PDF" : "View the photo full size"}>
        {isPdf ? <span className="media-pdf">PDF<small>Open</small></span> : <img src={url} alt="Photo sent on WhatsApp" />}
      </button>
      {open && (
        <div className="overlay media-viewer" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label="Photo">
          <img src={url} alt="Photo sent on WhatsApp, full size" />
          <button type="button" className="btn btn-sm media-close" onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
