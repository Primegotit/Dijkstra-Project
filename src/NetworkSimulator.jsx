
import React, { useState, useEffect, useRef } from 'react';
import './NetworkSimulator.css';

const NetworkSimulator = () => {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [connectingNode, setConnectingNode] = useState(null);
  const [graph, setGraph] = useState({});
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [routingTables, setRoutingTables] = useState([]);

  useEffect(() => {
    const newGraph = {};
    nodes.forEach(n => newGraph[n.name] = {});
    edges.forEach(e => {
      newGraph[e.from][e.to] = e.cost;
      newGraph[e.to][e.from] = e.cost;
    });
    setGraph(newGraph);
  }, [nodes, edges]);

  const dijkstra = (startNode) => {
    const dist = {}, prev = {};
    const pq = [];
    nodes.forEach(n => { dist[n.name] = Infinity; prev[n.name] = null; });
    dist[startNode] = 0; pq.push([0, startNode]);

    while(pq.length){
      pq.sort((a,b) => a[0]-b[0]);
      const [currentDist, current] = pq.shift();
      for(let neighbor in graph[current] || {}){
        const alt = currentDist + graph[current][neighbor];
        if(alt < dist[neighbor]) { dist[neighbor] = alt; prev[neighbor] = current; pq.push([alt, neighbor]); }
      }
    }
    return { dist, prev };
  };

  const shortestPath = (startNode, endNode) => {
    const { dist, prev } = dijkstra(startNode);
    const path = [];
    let current = endNode;
    while(current){ path.unshift(current); current = prev[current]; }
    return { path, cost: dist[endNode] };
  };

  const generateRoutingTables = () => {
    const tables = nodes.map(n => {
      const { dist, prev } = dijkstra(n.name);
      const rows = Object.keys(dist).filter(d => d !== n.name).map(dest => {
        let nextHop = dest;
        while(prev[nextHop] && prev[nextHop] !== n.name) nextHop = prev[nextHop];
        nextHop = prev[nextHop] === n.name ? nextHop : prev[nextHop];
        return { destination: dest, nextHop: nextHop || '-', cost: dist[dest] };
      });
      return { router: n.name, rows };
    });
    setRoutingTables(tables);
  };

  const drawNetwork = (highlightPath = []) => {
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);

    edges.forEach(e => {
      const fromNode = nodes.find(n => n.name === e.from);
      const toNode = nodes.find(n => n.name === e.to);
      const isOnPath = highlightPath.includes(e.from) && highlightPath.includes(e.to) && (highlightPath.indexOf(e.to)-highlightPath.indexOf(e.from) === 1 || highlightPath.indexOf(e.from)-highlightPath.indexOf(e.to) === 1);
      ctx.beginPath(); ctx.moveTo(fromNode.x, fromNode.y); ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = isOnPath ? '#FF4136' : '#999';
      ctx.lineWidth = isOnPath ? 4 : 2; ctx.stroke();
      const midX = (fromNode.x+toNode.x)/2, midY = (fromNode.y+toNode.y)/2;
      ctx.fillStyle = 'black'; ctx.font = '14px Arial'; ctx.fillText(e.cost, midX, midY);
    });

    nodes.forEach((n,i) => {
      ctx.beginPath(); ctx.arc(n.x, n.y, 25, 0, 2*Math.PI);
      ctx.fillStyle = `hsl(${i*60 % 360}, 70%, 60%)`;
      ctx.fill(); ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle='black'; ctx.font='18px Arial';
      ctx.fillText('💻', n.x-12, n.y+8);
      ctx.fillText(n.name, n.x-10, n.y-35);
    });
  };

  const animatePacket = async (path) => {
    if(path.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    for(let i=0;i<path.length-1;i++){
      const fromNode = nodes.find(n => n.name === path[i]);
      const toNode = nodes.find(n => n.name === path[i+1]);
      for(let t=0;t<=1;t+=0.02){
        drawNetwork(path);
        const x = fromNode.x + t*(toNode.x-fromNode.x);
        const y = fromNode.y + t*(toNode.y-fromNode.y);
        ctx.beginPath(); ctx.arc(x,y,10,0,2*Math.PI); ctx.fillStyle='orange'; ctx.fill();
        await new Promise(r=>setTimeout(r, 20));
      }
    }
  };

  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let clickedNode = null;
    nodes.forEach(n => { if(Math.hypot(n.x-x,n.y-y) <= 25) clickedNode = n; });

    if(connectingNode){
      if(clickedNode && clickedNode !== connectingNode){
        const cost = parseInt(prompt('Enter link cost:',1));
        if(cost) setEdges([...edges,{from: connectingNode.name, to: clickedNode.name, cost}]);
      }
      setConnectingNode(null);
    } else if(clickedNode){
      setConnectingNode(clickedNode);
    } else {
      const name = prompt('Enter router name:');
      if(name && !nodes.find(n => n.name === name)) setNodes([...nodes,{name,x,y,icon:'💻'}]);
    }
  };

  const handleFindPath = async () => {
    if(!start || !end) return;
    const { path } = shortestPath(start, end);
    await animatePacket(path);
    drawNetwork(path);
    generateRoutingTables();
  };

  useEffect(()=>{
    drawNetwork();
    generateRoutingTables();
  }, [nodes, edges]);

  return (
    <div id='container'>
      <h1>Interactive Network Simulator</h1>
      <div className='controls'>
        <button onClick={handleFindPath}>Find Shortest Path</button>
        <label>From:</label>
        <select value={start} onChange={e=>setStart(e.target.value)}>{nodes.map(n=><option key={n.name} value={n.name}>{n.name}</option>)}</select>
        <label>To:</label>
        <select value={end} onChange={e=>setEnd(e.target.value)}>{nodes.map(n=><option key={n.name} value={n.name}>{n.name}</option>)}</select>
      </div>
      <canvas ref={canvasRef} width={900} height={600} onClick={handleCanvasClick}></canvas>
      <h2>Routing Tables</h2>
      <div id='routingTables'>
        {routingTables.map(table => (
          <div key={table.router} className='routing-table'>
            <h3 id='routingh3'>{`Routing Table for ${table.router}`}</h3>
            <table>
              <thead><tr><th>Destination</th><th>Next Hop</th><th>Cost</th></tr></thead>
              <tbody>
                {table.rows.map((row,i)=><tr key={i}><td>{row.destination}</td><td>{row.nextHop}</td><td>{row.cost}</td></tr>)}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkSimulator;