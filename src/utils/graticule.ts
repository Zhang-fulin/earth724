export const generateGraticule = () => {
  const features = [];
  for (let lng = -180; lng <= 180; lng += 15) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[lng, -80], [lng, 80]] }
    });
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [[-180, lat], [180, lat]] }
    });
  }
  return { type: 'FeatureCollection', features };
};
