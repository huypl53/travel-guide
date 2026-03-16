import type {
  RoutingProvider,
  LatLon,
  DistanceMatrixEntry,
  RouteResult,
} from "../types";

export class GoogleRoutingProvider implements RoutingProvider {
  name = "google";

  async getDistanceMatrix(
    _sources: LatLon[],
    _destinations: LatLon[]
  ): Promise<(DistanceMatrixEntry | null)[][]> {
    throw new Error("Not implemented yet");
  }

  async getRoute(
    _origin: LatLon,
    _destination: LatLon
  ): Promise<RouteResult | null> {
    throw new Error("Not implemented yet");
  }
}
