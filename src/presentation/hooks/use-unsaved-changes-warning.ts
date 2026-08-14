import { useCallback, useEffect } from "react";
import { useBeforeUnload } from "react-router";

export function useUnsavedChangesWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const warnOnNavigation = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (!window.confirm("You have unsaved changes. Leave this page anyway?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", warnOnNavigation, true);
    return () => document.removeEventListener("click", warnOnNavigation, true);
  }, [enabled]);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!enabled) return;
        event.preventDefault();
      },
      [enabled],
    ),
  );
}
