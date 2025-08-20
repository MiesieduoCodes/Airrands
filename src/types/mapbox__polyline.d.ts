declare module '@mapbox/polyline' {
  export function decode(str: string): Array<[number, number]>;
  export function encode(coordinates: Array<[number, number]>): string;
  export function fromGeoJSON(geojson: any): string;
  export function toGeoJSON(str: string): any;
}
