/// <reference types="react-scripts" />

declare module 'html2canvas' {
  interface Options {
    scale?: number;
    useCORS?: boolean;
    backgroundColor?: string;
  }
  function html2canvas(
    element: HTMLElement,
    options?: Options
  ): Promise<HTMLCanvasElement>;
  export default html2canvas;
}
