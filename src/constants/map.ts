import { generateGraticule } from '../utils/graticule'

export const ZOOM_BIG = 1;
export const ZOOM_SMALL = 12;
export const ZOOM_MEDIUM = 2;
export const FLY_DURATION = 2500;
export const SIDEBAR_WIDTH = 320;

const graticuleData = generateGraticule();

export const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    'world-satellite': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 18
    },
    'carto-labels': {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
    },
    'local-graticule': {
      type: 'geojson',
      data: graticuleData as any
    }
  },
  layers: [
    {
      id: 'background-fill',
      type: 'background',
      paint: { 'background-color': '#877c7cff' }
    },
    {
      id: 'graticule-line-layer',
      type: 'line',
      source: 'local-graticule',
      paint: {
        'line-color': '#7baaf0',
        'line-width': 0.7,
        'line-opacity': 0.5
      }
    },
    {
      id: 'satellite-layer',
      type: 'raster',
      source: 'world-satellite',
      paint: { 'raster-fade-duration': 800 }
    },
    {
      id: 'labels-layer',
      type: 'raster',
      source: 'carto-labels'
    }
  ]
}
