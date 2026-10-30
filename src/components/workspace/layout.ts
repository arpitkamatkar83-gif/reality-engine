/**
 * Shared workspace grid. Mobile: stage, assistant, controls, results, comparison (stacked),
 * so the simulation stays the first thing on screen. Large: assistant across the top, then
 * controls | stage, results under the stage. XL: controls | stage | results.
 * grid-cols-1 keeps a wide child (the comparison table) from widening the page on mobile.
 */
export const WORKSPACE_GRID = {
  root: "grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]",
  assistant: "order-2 lg:order-none lg:col-span-2 xl:col-span-3",
  controls: "order-3 lg:order-none lg:row-span-2 xl:row-span-1",
  stage: "order-1 lg:order-none",
  results: "order-4 lg:col-start-2 xl:col-start-auto",
  comparison: "order-5 lg:col-span-2 xl:col-span-3",
} as const;
