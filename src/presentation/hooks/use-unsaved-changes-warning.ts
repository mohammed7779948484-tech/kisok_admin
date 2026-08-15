import { useEffect } from "react";
import { useWarnAboutChange } from "@refinedev/core";

export function useUnsavedChangesWarning(enabled: boolean) {
  const { setWarnWhen } = useWarnAboutChange();

  useEffect(() => {
    setWarnWhen(enabled);
    return () => setWarnWhen(false);
  }, [enabled, setWarnWhen]);
}
