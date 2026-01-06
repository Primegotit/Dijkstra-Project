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

// Dijkstra's Algorithm Implementation
class Dijkstra {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addNode(id, lat, lng) {
    this.nodes.set(id, { id, lat, lng, edges: [] });
  }

  addEdge(from, to, weight) {
    if (!this.edges.has(from)) this.edges.set(from, []);
    if (!this.edges.has(to)) this.edges.set(to, []);
    
    this.edges.get(from).push({ to, weight });
    this.edges.get(to).push({ to: from, weight }); // For undirected graph
    
    // Also add to nodes for easy access
    this.nodes.get(from).edges.push({ to, weight });
    this.nodes.get(to).edges.push({ to: from, weight });
  }

  findShortestPath(startId, endId) {
    // Initialize distances
    const distances = new Map();
    const previous = new Map();
    const visited = new Set();
    const unvisited = new Set();

    // Set all distances to Infinity initially
    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }
    
    // Start node distance is 0
    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      let current = null;
      let minDistance = Infinity;
      
      for (const nodeId of unvisited) {
        const distance = distances.get(nodeId);
        if (distance < minDistance) {
          minDistance = distance;
          current = nodeId;
        }
      }

      if (current === null || distances.get(current) === Infinity) {
        break; // No path exists
      }

      // If we reached the end node
      if (current === endId) {
        break;
      }

      unvisited.delete(current);
      visited.add(current);

      // Update distances to neighbors
      const edges = this.edges.get(current) || [];
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          const alt = distances.get(current) + edge.weight;
          if (alt < distances.get(edge.to)) {
            distances.set(edge.to, alt);
            previous.set(edge.to, current);
          }
        }
      }
    }

    // Reconstruct path
    const path = [];
    let current = endId;
    
    while (current !== null) {
      path.unshift(this.nodes.get(current));
      current = previous.get(current);
    }

    // Check if path exists
    if (path.length === 0 || path[0].id !== startId) {
      return null; // No path found
    }

    return {
      path,
      distance: distances.get(endId)
    };
  }
}

// Create a grid graph for demonstration
function createGridGraph(centerLat, centerLng, gridSize = 10, cellSize = 0.01) {
  const dijkstra = new Dijkstra();
  const nodes = [];
  
  // Create grid nodes
  let nodeId = 0;
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = centerLat + (i - gridSize/2) * cellSize;
      const lng = centerLng + (j - gridSize/2) * cellSize;
      dijkstra.addNode(nodeId, lat, lng);
      nodes.push({ id: nodeId, lat, lng, i, j });
      nodeId++;
    }
  }

  // Add edges (4-connected grid)
  for (const node of nodes) {
    const { i, j, id } = node;
    
    // Connect to right neighbor
    if (j < gridSize - 1) {
      const rightId = id + 1;
      const weight = calculateDistance(node.lat, node.lng, nodes[rightId].lat, nodes[rightId].lng);
      dijkstra.addEdge(id, rightId, weight);
    }
    
    // Connect to bottom neighbor
    if (i < gridSize - 1) {
      const bottomId = id + gridSize;
      const weight = calculateDistance(node.lat, node.lng, nodes[bottomId].lat, nodes[bottomId].lng);
      dijkstra.addEdge(id, bottomId, weight);
    }
  }

  return { dijkstra, nodes };
}

function RouteplannerApp() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLineRef = useRef(null);
  const gridGraphRef = useRef(null);
  
  const [points, setPoints] = useState([]);
  const [mode, setMode] = useState(null);
  const [totalDistance, setTotalDistance] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [useDijkstra, setUseDijkstra] = useState(false);
  const [algorithmSteps, setAlgorithmSteps] = useState(0);

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
          mapInstanceRef.current = window.L.map(mapContainerRef.current).setView([-20.1500, 28.5833], 13);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
          }).addTo(mapInstanceRef.current);
          
          // Create grid graph for Dijkstra demonstration
          gridGraphRef.current = createGridGraph(-20.1500, 28.5833, 15, 0.005);
          
          // Mark map as loaded
          mapInstanceRef.current.whenReady(() => {
            setMapLoaded(true);
            
            // Draw grid for visualization (optional)
            // drawGrid();
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

  // Draw grid for visualization
  const drawGrid = () => {
    if (!mapInstanceRef.current || !gridGraphRef.current) return;
    
    const { nodes } = gridGraphRef.current;
    const gridSize = 15;
    
    // Draw grid lines
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize - 1; j++) {
        const node1 = nodes[i * gridSize + j];
        const node2 = nodes[i * gridSize + j + 1];
        
        window.L.polyline(
          [[node1.lat, node1.lng], [node2.lat, node2.lng]],
          { color: '#ccc', weight: 1, opacity: 0.3 }
        ).addTo(mapInstanceRef.current);
        
        if (i < gridSize - 1) {
          const node3 = nodes[(i + 1) * gridSize + j];
          window.L.polyline(
            [[node1.lat, node1.lng], [node3.lat, node3.lng]],
            { color: '#ccc', weight: 1, opacity: 0.3 }
          ).addTo(mapInstanceRef.current);
        }
      }
    }
  };

  // Find nearest grid node
  const findNearestNode = (lat, lng) => {
    if (!gridGraphRef.current) return null;
    
    const { nodes } = gridGraphRef.current;
    let nearestNode = null;
    let minDistance = Infinity;
    
    for (const node of nodes) {
      const distance = calculateDistance(lat, lng, node.lat, node.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
    
    return nearestNode;
  };

  // Handle map clicks
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;

    const handleMapClick = (e) => {
      if (!mode) return;

      const { lat, lng } = e.latlng;
      if (isNaN(lat) || isNaN(lng)) return;

      addPoint(lat, lng);
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

  const addPoint = (lat, lng) => {
    const newPoint = {
      id: Date.now(),
      lat,
      lng,
      type: mode
    };

    setPoints(prev => [...prev, newPoint]);

    // Create custom marker icon
    const icon = window.L.divIcon({
      html: `<div style="background-color: ${mode === 'start' ? '#4CAF50' : '#f44336'}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = window.L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current);
    const label = mode === 'start' ? 'START' : 'END';
    marker.bindPopup(`<b>${label} Point</b>`).openPopup();
    markersRef.current.push(marker);

    setMode(null);
  };

  // Calculate route using Dijkstra's algorithm
  const calculateRouteWithDijkstra = async () => {
    const startPoint = points.find(p => p.type === 'start');
    const endPoint = points.find(p => p.type === 'end');

    if (!startPoint || !endPoint) {
      alert('Please add both start and end points');
      return;
    }

    // Find nearest grid nodes
    const startNode = findNearestNode(startPoint.lat, startPoint.lng);
    const endNode = findNearestNode(endPoint.lat, endPoint.lng);

    if (!startNode || !endNode) {
      alert('Could not find path on the grid. Try using OSRM instead.');
      return;
    }

    console.log('Finding path with Dijkstra...');
    console.log('Start node:', startNode.id);
    console.log('End node:', endNode.id);

    // Time the algorithm
    const startTime = performance.now();
    
    // Run Dijkstra's algorithm
    const result = gridGraphRef.current.dijkstra.findShortestPath(startNode.id, endNode.id);
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime).toFixed(2);

    if (!result) {
      alert('No path found using Dijkstra algorithm. Try using OSRM.');
      return;
    }

    console.log('Dijkstra result:', result);
    console.log(`Execution time: ${executionTime}ms`);

    // Clear existing route
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    // Create route line from Dijkstra path
    const routeCoords = result.path.map(node => [node.lat, node.lng]);
    
    routeLineRef.current = window.L.polyline(routeCoords, {
      color: '#FF5722',
      weight: 5,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(mapInstanceRef.current);

    // Update distance
    setTotalDistance(parseFloat(result.distance.toFixed(2)));
    setEstimatedTime(Math.round((result.distance / 50) * 60)); // Estimate at 50 km/h
    
    // Show algorithm info
    setAlgorithmSteps(result.path.length);
    
    // Fit map to show the entire route
    if (routeLineRef.current) {
      const bounds = routeLineRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    alert(`Dijkstra's algorithm found path in ${executionTime}ms\nPath length: ${result.path.length} nodes\nDistance: ${result.distance.toFixed(2)} km`);
  };

  // Calculate route using OSRM API (which internally uses Dijkstra)
  const calculateRouteWithOSRM = async () => {
    const startPoint = points.find(p => p.type === 'start');
    const endPoint = points.find(p => p.type === 'end');

    if (!startPoint || !endPoint) {
      alert('Please add both start and end points');
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
          color: '#667eea',
          weight: 5,
          opacity: 0.8
        }).addTo(mapInstanceRef.current);

        // Extract distance and duration
        const distance = route.distance / 1000; // meters to km
        const duration = route.duration / 60; // seconds to minutes

        setTotalDistance(parseFloat(distance.toFixed(2)));
        setEstimatedTime(Math.round(duration));
        setAlgorithmSteps(geometry.length);

        // Fit map to show the entire route
        if (routeLineRef.current) {
          const bounds = routeLineRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
        
        alert(`OSRM (Dijkstra-based) found optimal route!\nDistance: ${distance.toFixed(2)} km\nDuration: ${duration} min`);
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

  // Main calculate route function
  const calculateRoute = async () => {
    if (useDijkstra) {
      await calculateRouteWithDijkstra();
    } else {
      await calculateRouteWithOSRM();
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
    setAlgorithmSteps(0);
    setMode(null);
  };

  // Search functionality
  const handleSearch = async (query) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Bulawayo, Zimbabwe')}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // CSS styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      overflow: 'hidden'
    },
    header: {
      background: '#1d1c1c',
      color: 'white',
      padding: '15px 20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      zIndex: 1000
    },
    headerContent: {
      maxWidth: '1400px',
      margin: '0 auto'
    },
    title: {
      fontSize: '24px',
      marginBottom: '15px',
      fontWeight: '600'
    },
    controls: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      alignItems: 'center'
    },
    searchBox: {
      flex: 1,
      minWidth: '200px',
      position: 'relative'
    },
    searchInput: {
      width: '100%',
      padding: '10px 15px',
      border: 'none',
      borderRadius: '25px',
      fontSize: '14px',
      outline: 'none'
    },
    searchResults: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      background: 'white',
      borderRadius: '8px',
      marginTop: '5px',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1001
    },
    searchResultItem: {
      padding: '10px 15px',
      cursor: 'pointer',
      color: '#333',
      borderBottom: '1px solid #eee',
      fontSize: '14px'
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '25px',
      background: '#00FF00',
      color: 'white',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontSize: '14px'
    },
    activeButton: {
      background: '#00CC00'
    },
    dijkstraButton: {
      background: useDijkstra ? '#FF5722' : '#00FF00',
      border: useDijkstra ? '2px solid #FF5722' : 'none'
    },
    infoPanel: {
      background: '#1d1c1c',
      padding: '10px 15px',
      borderRadius: '8px',
      display: 'flex',
      gap: '20px',
      flexWrap: 'wrap',
      fontSize: '14px',
      marginTop: '15px'
    },
    infoItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    infoLabel: {
      fontWeight: '600',
      color: '#00FF00'
    },
    algorithmInfo: {
      color: useDijkstra ? '#FF5722' : '#667eea',
      fontWeight: '600'
    },
    map: {
      flex: 1,
      width: '100%'
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Bulawayo Delivery Route Finder</h1>
          <div style={styles.controls}>
            <div style={styles.searchBox}>
              <input
                type="text"
                style={styles.searchInput}
                placeholder="Search for a location in Bulawayo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                onFocus={() => setShowResults(true)}
              />
              {showResults && searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map((result) => (
                    <div
                      key={result.place_id}
                      style={styles.searchResultItem}
                      onClick={() => {
                        const latlng = [parseFloat(result.lat), parseFloat(result.lon)];
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.setView(latlng, 16);
                          if (mode) {
                            addPoint(latlng[0], latlng[1]);
                          }
                        }
                        setSearchQuery('');
                        setShowResults(false);
                      }}
                    >
                      {result.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              style={{
                ...styles.button,
                ...(mode === 'start' ? styles.activeButton : {})
              }}
              onClick={() => setMode('start')}
            >
              Set Start Point
            </button>
            <button
              style={{
                ...styles.button,
                ...(mode === 'end' ? styles.activeButton : {})
              }}
              onClick={() => setMode('end')}
            >
              Set End Point
            </button>
            <button
              style={{ ...styles.button, ...styles.dijkstraButton }}
              onClick={() => setUseDijkstra(!useDijkstra)}
              title={useDijkstra ? "Using Dijkstra (Grid-based)" : "Using OSRM (Road Network)"}
            >
              {useDijkstra ? '⚡ Dijkstra' : '🛣️ OSRM'}
            </button>
            <button
              style={styles.button}
              onClick={calculateRoute}
            >
              Calculate Route
            </button>
            <button
              style={styles.button}
              onClick={reset}
            >
              Clear All
            </button>
          </div>
          <div style={styles.infoPanel}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Distance:</span>
              <span>{totalDistance ? `${totalDistance} km` : '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Duration:</span>
              <span>{estimatedTime ? `${estimatedTime} min` : '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Algorithm:</span>
              <span style={styles.algorithmInfo}>
                {useDijkstra ? 'Dijkstra (Grid)' : 'OSRM (Dijkstra on Roads)'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Steps:</span>
              <span>{algorithmSteps > 0 ? algorithmSteps : '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Status:</span>
              <span>
                {mode === 'start' ? 'Click on map to set START point' :
                 mode === 'end' ? 'Click on map to set END point' :
                 !points.some(p => p.type === 'start') ? 'Click "Set Start Point" to begin' :
                 !points.some(p => p.type === 'end') ? 'Now set end point' :
                 'Click "Calculate Route"'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div 
        ref={mapContainerRef} 
        style={styles.map}
      />
    </div>
  );
}

export default RouteplannerApp;