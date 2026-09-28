/**
 * Loads MapLibre only on map routes and centralises browser-safe map setup.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);

export * from "maplibre-gl";
