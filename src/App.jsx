import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Page2  from './page2'
import Page3 from './page3'
import RouteplannerApp from './RouteplannerApp'
import NetworkSimulator from './NetworkSimulator'



function App() {

  "use strict";
let more_btn = document.getElementById("more-button");
    let container = document.createElement("div");
    container.classList.toggle("active");

    let item_list = document.createElement("ul");
    let item1 = document.createElement("li");
    let item2 = document.createElement("li");
    let item3 = document.createElement("li");
    let item4 = document.createElement("li");
    item1.innerHTML = `<a href="#page1">Home</a>`;
    item4.innerHTML = `<a href="#page4">About us</a>`;
    item2.innerHTML = `<a href="#page2">Services</a>`;
    item3.innerHTML = `<a href="#page4">Contacts</a>`;

    item_list.appendChild(item1);
    item_list.appendChild(item2);
    item_list.appendChild(item3);
    item_list.appendChild(item4);
    container.appendChild(item_list);

    let autoCloseTimer;


let openSideNavbar = () => {
    container.classList.toggle("side-navbar-container");


     document.body.appendChild(container);
    

    clearTimeout(autoCloseTimer);
    autoCloseTimer = setTimeout(() => {
        container.classList.remove("side-navbar-container");
      container.classList.toggle("active");

    }, 11000); 

};


  return (
    <>
 
    <div id='page1'>

      <nav>
        <h3> <img src="/trackway2.png" id='name-img' alt="" />PacketSim</h3>
        <ul>
          <li><a href="#" className='hover-link'></a></li>
          <li><a href="#" className='hover-link'></a></li>
          <li><a href="#" className='hover-link'></a></li>
          <li><a href="#" className='hover-link'></a></li>

        </ul>

        <img id='menu-img'onClick={openSideNavbar} src='/menu burger-icon.png'></img>

      </nav>

      <main>
        <section id='hero'>
          <div id='image-container'>
            <img src="/trackway.png" alt="" />
          </div>
          <h1 className="glide-text">Welcome to PacketSim</h1>
          <h5>Shortest-Path Routing Using Dijkstra’s Algorithm</h5>
          <p>PacketSim is a lightweight network simulator that models packet routing using Dijkstra’s shortest-path algorithm, helping users easily understand network paths and routing behavior.</p>
          <button>Get Started</button>

          <div id='down-arrow'>
            <img src="/arrow-down2.png" alt="" />
          </div>
        </section>
      </main>
    </div> 

    {/* <Page2/>
    <Page3/>
    <RouteplannerApp/> */}
    <NetworkSimulator/>



    </>
  )
}

export default App
