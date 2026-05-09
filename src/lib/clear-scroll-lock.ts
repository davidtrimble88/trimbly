export const clearScrollLock = () => {
  const targets = [document.body, document.documentElement];

  targets.forEach((target) => {
    target.style.pointerEvents = "";
    target.style.overflow = "";
    target.style.removeProperty("padding-right");
    target.removeAttribute("data-scroll-locked");
    target.removeAttribute("data-scroll-lock");
  });
};