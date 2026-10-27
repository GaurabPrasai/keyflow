/** Run a DOM mutation inside a View Transitions cross-fade when supported. */
export function withViewTransition(mutate) {
  if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      const transition = document.startViewTransition(async () => {
        mutate();
        // Yield to the task queue so React can commit before the "new"
        // snapshot is taken. Never await requestAnimationFrame in here: the
        // frame is blocked until this callback resolves, so animation frames
        // cannot fire and Chrome aborts the transition ("DOM update timed
        // out"), freezing the page for seconds before the theme lands.
        await new Promise((resolve) => setTimeout(resolve, 16));
      });
      // A second transition (rapid theme switching) skips the first one.
      transition.ready.catch(() => {});
      transition.finished.catch(() => {});
      return;
    }
  }
  mutate();
}
