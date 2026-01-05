import { useState, useEffect, useRef } from 'react';

// Calculate distance using Haversine formula (for fallback or estimates)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function RouteplannerApp() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([51.505, -0.09], 13); // Default to London
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
    };

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current._loaded) return; // Ensure map is fully loaded

    const handleMapClick = (e) => {
      if (!mode) return;

      const { lat, lng } = e.latlng;
      if (isNaN(lat) || isNaN(lng)) return; // Safety check for valid coords

      const newPoint = {
        id: Date.now(),
        lat,
        lng,
        type: mode
      };

      setPoints(prev => [...prev, newPoint]);

      // Use L.marker instead of L.circleMarker to avoid bounds errors
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${mode === 'start' ? 'green' : 'red'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = window.L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);

      const label = mode === 'start' ? 'START' : 'END';
      marker.bindPopup(label);
      markersRef.current.push(marker);

      setMode(null);
    };

    mapInstanceRef.current.off('click');
    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [mode, points]);

  const calculateRoute = async () => {
    const startPoint = points.find(p => p.type === 'start');
    const endPoint = points.find(p => p.type === 'end');

    if (!startPoint || !endPoint) {
      alert('Please add both start and end points');
      return;
    }

    // Use OSRM API for road-following routes (free, no key needed)
    const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry = route.geometry.coordinates;
        const routeCoords = geometry.map(coord => [coord[1], coord[0]]); // Swap to [lat, lng]

        if (routeLineRef.current) {
          mapInstanceRef.current.removeLayer(routeLineRef.current);
        }

        routeLineRef.current = window.L.polyline(routeCoords, {
          color: 'blue',
          weight: 4,
          opacity: 0.7
        }).addTo(mapInstanceRef.current);

        // Extract distance and duration from API response
        const distance = route.distance / 1000; // Convert to km
        const duration = route.duration / 60; // Convert to minutes

        setTotalDistance(distance.toFixed(2));
        setEstimatedTime(duration.toFixed(0));
        
        mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds());
      } else {
        alert('No route found');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      alert('Error calculating route. Check console for details.');
    }
  };

  const reset = () => {
    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
    }
    markersRef.current = [];
    routeLineRef.current = null;
    setPoints([]);
    setTotalDistance(0);
    setEstimatedTime(0);
    setMode(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ width: '300px', padding: '20px', background: '#f5f5f5', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0 }}>Route Planner</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Total Distance</label>
          <input 
            type="text" 
            value={totalDistance ? `${totalDistance} km` : ''}
            readOnly
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: '#e9e9e9' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Estimated Time</label>
          <input 
            type="text" 
            value={estimatedTime ? `${estimatedTime} min` : ''}
            readOnly
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', background: '#e9e9e9' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Add Points</h3>
          <button 
            onClick={() => setMode('start')}
            disabled={points.some(p => p.type === 'start')}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '10px', 
              background: mode === 'start' ? '#4CAF50' : points.some(p => p.type === 'start') ? '#ccc' : '#fff',
              color: mode === 'start' || points.some(p => p.type === 'start') ? '#fff' : '#000',
              border: '2px solid #4CAF50',
              borderRadius: '4px',
              cursor: points.some(p => p.type === 'start') ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {mode === 'start' ? 'Click map to add start' : points.some(p => p.type === 'start') ? 'Start Added ✓' : 'Add Start Point'}
          </button>
          <button 
            onClick={() => setMode('end')}
            disabled={points.some(p => p.type === 'end')}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '10px', 
              background: mode === 'end' ? '#f44336' : points.some(p => p.type === 'end') ? '#ccc' : '#fff',
              color: mode === 'end' || points.some(p => p.type === 'end') ? '#fff' : '#000',
              border: '2px solid #f44336',
              borderRadius: '4px',
              cursor: points.some(p => p.type === 'end') ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {mode === 'end' ? 'Click map to add end' : points.some(p => p.type === 'end') ? 'End Added ✓' : 'Add End Point'}
          </button>
        </div>

        <div>
          <h3>Actions</h3>
          <button 
            onClick={calculateRoute}
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '10px', 
              background: '#9C27B0',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Calculate Route (Dijkstra-based)
          </button>
          <button 
            onClick={reset}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: '#607D8B',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Reset
          </button>
        </div>

        <div style={{ marginTop: '20px', padding: '10px', background: '#fff', borderRadius: '4px' }}>
          <h4>Instructions:</h4>
          <ol style={{ paddingLeft: '20px', margin: '5px 0', fontSize: '14px' }}>
            <li>Click "Add Start Point" then click on map</li>
            <li>Click "Add End Point" then click on map</li>
            <li>Click "Calculate Route" for shortest path following roads</li>
          </ol>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            ℹ️ Uses OSRM API (Dijkstra's algorithm under the hood for routing)
          </p>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <div 
          ref={mapContainerRef} 
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}

export default RouteplannerApp;