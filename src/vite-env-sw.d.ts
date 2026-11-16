/// <reference lib="webworker" />
/** Manifest dei file da mettere in cache, iniettato da vite-plugin-pwa (injectManifest). */
declare interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[]
}
