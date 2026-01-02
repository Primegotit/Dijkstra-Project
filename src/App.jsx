import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {

  return (
    <div id='page1'>

      <nav>
        <h3> <img src="/trackway2.png" id='name-img' alt="" />TrackWay</h3>
        <ul>
          <li><a href="#">Home</a></li>
          <li><a href="#">Services</a></li>
          <li><a href="#">About</a></li>
          <li><a href="#">Contact us</a></li>

        </ul>

        <img id='menu-img' src='/menu burger-icon.png'></img>

      </nav>

      <main>
        <section id='hero'>
          <div id='image-container'>
            <img src="/trackway.png" alt="" />
          </div>
          <h1>Welcome to TrackWay</h1>
          <h5>Where <span >algorithms</span> meet the road.</h5>
          <p>Plan, optimize, and track your deliveries in seconds. With real-time maps and intelligent route calculation, TrackWay gets you from point A to point B the fastest way possible.</p>
          <button>Get Started</button>
        </section>
      </main>
    </div>
  )
}

export default App
