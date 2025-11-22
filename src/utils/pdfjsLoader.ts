// Lazy load PDF.js to improve initial load time
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export const getPdfjsLib = async () => {
  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be used in the browser");
  }

  if (window.pdfjsLib) {
    return window.pdfjsLib;
  }

  // Load PDF.js from CDN
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.min.js";
  script.integrity =
    "sha512-0XW0Hl4+Z6Bxoq5ggG3A/9L1qhBL5Oc3UQ7FzF3YwvTr0X+FxH5l5fLJ5V0Q3x5U9f0QZG1OLfWLNPB9CqEw==";
  script.crossOrigin = "anonymous";

  // Wait for the script to load
  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PDF.js"));
    document.head.appendChild(script);
  });

  // Configure PDF.js worker
  window.pdfjsLib = window.pdfjsLib || {};
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js";

  return window.pdfjsLib;
};
