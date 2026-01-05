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
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    // Load Leaflet CSS if not already loaded
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (mapContainerRef.current && !mapInstanceRef.current) {
        try {
          mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([51.505, -0.09], 13);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(mapInstanceRef.current);
          
          // Mark map as loaded
          mapInstanceRef.current.whenReady(() => {
            setMapLoaded(true);
          });
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    };

    // Load Leaflet JS if not already loaded
    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
      script.onload = () => {
        initMap();
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet script');
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapLoaded(false);
    };
  }, []);

  // Handle map clicks
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const handleMapClick = (e) => {
      if (!mode) return;

      const { lat, lng } = e.latlng;
      if (isNaN(lat) || isNaN(lng)) return;

      const newPoint = {
        id: Date.now(),
        lat,
        lng,
        type: mode
      };

      setPoints(prev => [...prev, newPoint]);

      // Create custom marker icon
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${mode === 'start' ? 'green' : 'red'}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = window.L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
      const label = mode === 'start' ? 'START' : 'END';
      marker.bindPopup(label).openPopup();
      markersRef.current.push(marker);

      setMode(null);
    };

    // Remove any existing click handlers and add new one
    mapInstanceRef.current.off('click', handleMapClick);
    mapInstanceRef.current.on('click', handleMapClick);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('click', handleMapClick);
      }
    };
  }, [mode, mapLoaded]);

  // Calculate route using OSRM API
  const calculateRoute = async () => {
    const startPoint = points.find(p => p.type === 'start');
    const endPoint = points.find(p => p.type === 'end');

    if (!startPoint || !endPoint) {
      alert('Please add both start and end points');
      return;
    }

    // Check if map is ready
    if (!mapInstanceRef.current || !mapLoaded) {
      alert('Map is not ready yet. Please wait a moment.');
      return;
    }

    // Use OSRM API for road-following routes
    const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const geometry = route.geometry.coordinates;
        
        // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
        const routeCoords = geometry.map(coord => [coord[1], coord[0]]);

        // Clear existing route
        if (routeLineRef.current) {
          mapInstanceRef.current.removeLayer(routeLineRef.current);
          routeLineRef.current = null;
        }

        // Create new route line
        routeLineRef.current = window.L.polyline(routeCoords, {
          color: '#2196F3',
          weight: 5,
          opacity: 0.8,
          lineJoin: 'round'
        }).addTo(mapInstanceRef.current);

        // Extract distance and duration
        const distance = route.distance / 1000; // meters to km
        const duration = route.duration / 60; // seconds to minutes

        setTotalDistance(parseFloat(distance.toFixed(2)));
        setEstimatedTime(Math.round(duration));

        // Fit map to show the entire route
        if (routeLineRef.current) {
          const bounds = routeLineRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
        
        // Close sidebar on mobile after calculation
        if (isMobile) {
          setSidebarOpen(false);
        }
      } else {
        alert('No route found between the selected points');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      
      // Fallback: Calculate straight-line distance
      const fallbackDistance = calculateDistance(
        startPoint.lat, 
        startPoint.lng,
        endPoint.lat, 
        endPoint.lng
      );
      setTotalDistance(parseFloat(fallbackDistance.toFixed(2)));
      setEstimatedTime(Math.round((fallbackDistance / 50) * 60)); // Estimate at 50 km/h
      
      alert('Routing service temporarily unavailable. Using straight-line distance estimate.');
    }
  };

  // Reset everything
  const reset = () => {
    // Remove markers
    markersRef.current.forEach(marker => {
      if (marker && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];
    
    // Remove route line
    if (routeLineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    
    // Reset state
    setPoints([]);
    setTotalDistance(0);
    setEstimatedTime(0);
    setMode(null);
    
    // Close sidebar on mobile after reset
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // CSS for the component - Now with responsive design
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden',
      position: 'relative'
    },
    sidebar: {
      width: sidebarOpen ? (isMobile ? '100%' : '350px') : '0',
      padding: sidebarOpen ? '20px' : '0',
      background: 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
      overflowY: 'auto',
      boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      position: isMobile && sidebarOpen ? 'fixed' : 'relative',
      height: isMobile && sidebarOpen ? '100%' : 'auto',
      left: 0,
      top: 0
    },
    title: {
      marginTop: 0,
      marginBottom: '25px',
      color: '#2c3e50',
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: '600',
      textAlign: 'center'
    },
    inputGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#495057',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #ced4da',
      background: '#ffffff',
      fontSize: '14px',
      color: '#495057',
      boxSizing: 'border-box'
    },
    sectionTitle: {
      marginTop: '25px',
      marginBottom: '15px',
      color: '#2c3e50',
      fontSize: '18px',
      fontWeight: '600',
      borderBottom: '2px solid #dee2e6',
      paddingBottom: '8px'
    },
    button: {
      width: '100%',
      padding: '12px',
      marginBottom: '12px',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box'
    },
    startButton: {
      background: mode === 'start' ? '#2ecc71' : points.some(p => p.type === 'start') ? '#95a5a6' : '#ffffff',
      color: mode === 'start' || points.some(p => p.type === 'start') ? '#ffffff' : '#2c3e50',
      border: '2px solid #2ecc71',
      cursor: points.some(p => p.type === 'start') ? 'not-allowed' : 'pointer'
    },
    endButton: {
      background: mode === 'end' ? '#e74c3c' : points.some(p => p.type === 'end') ? '#95a5a6' : '#ffffff',
      color: mode === 'end' || points.some(p => p.type === 'end') ? '#ffffff' : '#2c3e50',
      border: '2px solid #e74c3c',
      cursor: points.some(p => p.type === 'end') ? 'not-allowed' : 'pointer'
    },
    calculateButton: {
      background: '#9b59b6',
      color: '#ffffff',
      marginTop: '10px'
    },
    resetButton: {
      background: '#7f8c8d',
      color: '#ffffff'
    },
    instructions: {
      marginTop: '25px',
      padding: '15px',
      background: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #dee2e6'
    },
    instructionsTitle: {
      marginTop: 0,
      marginBottom: '10px',
      color: '#2c3e50',
      fontSize: '16px',
      fontWeight: '600'
    },
    instructionsList: {
      paddingLeft: '20px',
      margin: '10px 0',
      fontSize: isMobile ? '12px' : '13px',
      color: '#6c757d',
      lineHeight: '1.5'
    },
    note: {
      fontSize: '12px',
      color: '#95a5a6',
      marginTop: '15px',
      fontStyle: 'italic',
      textAlign: 'center'
    },
    mapContainer: {
      flex: 1,
      position: 'relative',
      minHeight: '400px',
      transition: 'all 0.3s ease',
      marginLeft: !isMobile && sidebarOpen ? '0' : '0'
    },
    map: {
      display : "flex",
      justifySelf: "center",
      alignSelf: "center",
      width: '90%',
      height: '90%'
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255,255,255,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontSize: '16px',
      color: '#6c757d'
    },
    toggleButton: {
      position: 'absolute',
      top: '15px',
      left: isMobile || !sidebarOpen ? '15px' : 'calc(350px + 15px)',
      zIndex: 1001,
      background: '#2c3e50',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '50px',
      height: '50px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      transition: 'all 0.3s ease'
    },
    closeButton: {
      display: isMobile && sidebarOpen ? 'block' : 'none',
      position: 'absolute',
      top: '15px',
      right: '15px',
      background: '#e74c3c',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      fontSize: '20px',
      zIndex: 1002
    },
    mobileHeader: {
      display: isMobile && sidebarOpen ? 'flex' : 'none',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '15px',
      borderBottom: '2px solid #dee2e6'
    },
    overlay: {
      display: isMobile && sidebarOpen ? 'block' : 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 999,
      transition: 'all 0.3s ease'
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar Toggle Button */}
      <button 
        onClick={toggleSidebar}
        style={styles.toggleButton}
        title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay for mobile when sidebar is open */}
      {isMobile && sidebarOpen && (
        <div 
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={styles.sidebar}>
        {/* Close button for mobile */}
        {isMobile && sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(false)}
            style={styles.closeButton}
            title="Close"
          >
            ✕
          </button>
        )}

        {/* Mobile header */}
        {isMobile && sidebarOpen && (
          <div style={styles.mobileHeader}>
            <h2 style={{...styles.title, margin: 0, fontSize: '18px'}}>🗺️ Route Planner</h2>
          </div>
        )}

        {/* Desktop title */}
        {!isMobile && (
          <h2 style={styles.title}>🗺️ Route Planner</h2>
        )}
        
        {/* Distance Display */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Total Distance</label>
          <input 
            type="text" 
            value={totalDistance ? `${totalDistance} km` : '--'}
            readOnly
            style={styles.input}
          />
        </div>

        {/* Time Display */}
        <div style={styles.inputGroup}>
          <label style={styles.label}>Estimated Time</label>
          <input 
            type="text" 
            value={estimatedTime ? `${estimatedTime} min` : '--'}
            readOnly
            style={styles.input}
          />
        </div>

        {/* Add Points Section */}
        <h3 style={styles.sectionTitle}>Add Points</h3>
        <button 
          onClick={() => setMode('start')}
          disabled={points.some(p => p.type === 'start')}
          style={{ ...styles.button, ...styles.startButton }}
          onMouseEnter={(e) => {
            if (!points.some(p => p.type === 'start')) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {mode === 'start' ? 'Click map to add start point' : 
           points.some(p => p.type === 'start') ? '✓ Start Point Added' : 
           '📍 Add Start Point'}
        </button>
        
        <button 
          onClick={() => setMode('end')}
          disabled={points.some(p => p.type === 'end')}
          style={{ ...styles.button, ...styles.endButton }}
          onMouseEnter={(e) => {
            if (!points.some(p => p.type === 'end')) {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          {mode === 'end' ? 'Click map to add end point' : 
           points.some(p => p.type === 'end') ? '✓ End Point Added' : 
           '📍 Add End Point'}
        </button>

        {/* Actions Section */}
        <h3 style={styles.sectionTitle}>Actions</h3>
        <button 
          onClick={calculateRoute}
          style={{ ...styles.button, ...styles.calculateButton }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🚗 Calculate Route
        </button>
        
        <button 
          onClick={reset}
          style={{ ...styles.button, ...styles.resetButton }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          🔄 Reset All
        </button>

        {/* Instructions */}
        <div style={styles.instructions}>
          <h4 style={styles.instructionsTitle}>📋 Instructions</h4>
          <ol style={styles.instructionsList}>
            <li>Click "Add Start Point" then click on the map</li>
            <li>Click "Add End Point" then click on the map</li>
            <li>Click "Calculate Route" to find the shortest path</li>
            {isMobile && <li>Tap ☰ to open/close sidebar</li>}
          </ol>
          <p style={styles.note}>
            ℹ️ Uses OSRM routing service with Dijkstra's algorithm
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div style={styles.mapContainer}>
        {!mapLoaded && (
          <div style={styles.loadingOverlay}>
            Loading map...
          </div>
        )}
        <div 
          ref={mapContainerRef} 
          style={styles.map}
        />
      </div>
    </div>
  );
}

export default RouteplannerApp;