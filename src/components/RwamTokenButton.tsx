"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

/**
 * Header $RWAM badge. Currently a placeholder — no token exists yet (see
 * CLAUDE.md roadmap), so clicking it just opens a small "coming soon" panel
 * instead of linking anywhere. Swap in the real contract address / launch
 * link once $RWAM actually exists.
 */
export default function RwamTokenButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMounted(true);
          setOpen(true);
        }}
        className="shrink-0 whitespace-nowrap rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
      >
        $RWAM
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-border bg-bg-secondary p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">$RWAM</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
              <p className="mt-3 text-sm text-text-secondary">
                $RWAM hasn&apos;t launched yet — no contract address, no
                trading link. This badge will turn into the real thing the
                moment it does.
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
