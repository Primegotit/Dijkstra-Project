// MapComponent.jsx
import { useEffect, useRef } from 'react';
import './MapComponent.css';
function MapComponent() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS only once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }

    // Load Leaflet JS only once
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      script.onload = () => initializeMap();
      document.body.appendChild(script);
    } else {
      initializeMap();
    }

    // Initialize the map only once
    function initializeMap() {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([-20.1702, 28.5812], 13);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div id='map'
      ref={mapContainerRef}

    />
  );
}

export default MapComponent;
