import { useEffect, useState } from "react";
import { withViewTransition } from "./vt";

const ROUTE_EVENT = "keyflow:route";

export function currentPath() {
  if (typeof window === "undefined") return "/";
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export function navigate(to, { replace = false } = {}) {
  if (to === currentPath()) return;
  withViewTransition(() => {
    if (replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);
    window.dispatchEvent(new Event(ROUTE_EVENT));
    window.scrollTo(0, 0);
  });
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const sync = () => setPath(currentPath());
    window.addEventListener("popstate", sync);
    window.addEventListener(ROUTE_EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(ROUTE_EVENT, sync);
    };
  }, []);

  return path;
}
