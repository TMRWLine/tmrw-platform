import L from 'leaflet';

export function addCartoTiles(map: L.Map, theme: 'light_all' | 'dark_all' = 'light_all') {
  const linkStyle = 'color:#080808;text-decoration:underline';
  map.attributionControl.setPrefix(false);
  const tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${theme}/{z}/{x}/{y}{r}.png`, {
    attribution: `&copy; <a style="${linkStyle}" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a style="${linkStyle}" href="https://carto.com/attributions">CARTO</a>`,
    subdomains: 'abcd',
    maxZoom: 19,
    errorTileUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23F7F7F6"/></svg>',
  }).addTo(map);
  const attribution = map.attributionControl.getContainer();
  if (attribution) Object.assign(attribution.style, {
    background: '#F7F7F6', color: '#080808', fontSize: '9px', padding: '2px 5px', opacity: '0.9',
  });
  let notice: L.Control | undefined;
  tiles.on('tileerror', () => {
    if (notice) return;
    notice = new L.Control({ position: 'bottomleft' });
    notice.onAdd = () => {
      const element = L.DomUtil.create('div');
      element.setAttribute('role', 'status');
      element.textContent = 'Some map tiles are unavailable · catchment markers remain visible';
      Object.assign(element.style, { background: '#F7F7F6', color: '#080808', fontSize: '10px', padding: '4px 8px' });
      return element;
    };
    notice.addTo(map);
  });
  return tiles;
}
