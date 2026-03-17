import type { GeocodingProvider, RoutingProvider } from "./types";

export const withFallback = {
  geocoding(
    primary: GeocodingProvider,
    fallback: GeocodingProvider
  ): GeocodingProvider {
    return {
      name: `${primary.name}+${fallback.name}`,
      async search(query, options) {
        try {
          return await primary.search(query, options);
        } catch (err) {
          console.warn(
            `[map-providers] ${primary.name} geocoding failed, falling back to ${fallback.name}:`,
            err
          );
          return fallback.search(query, options);
        }
      },
    };
  },

  routing(
    primary: RoutingProvider,
    fallback: RoutingProvider
  ): RoutingProvider {
    return {
      name: `${primary.name}+${fallback.name}`,
      async getDistanceMatrix(sources, destinations) {
        try {
          return await primary.getDistanceMatrix(sources, destinations);
        } catch (err) {
          console.warn(
            `[map-providers] ${primary.name} distance matrix failed, falling back to ${fallback.name}:`,
            err
          );
          return fallback.getDistanceMatrix(sources, destinations);
        }
      },
      async getRoute(origin, destination) {
        try {
          return await primary.getRoute(origin, destination);
        } catch (err) {
          console.warn(
            `[map-providers] ${primary.name} route failed, falling back to ${fallback.name}:`,
            err
          );
          return fallback.getRoute(origin, destination);
        }
      },
    };
  },
};
