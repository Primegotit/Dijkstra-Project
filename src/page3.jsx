import MapComponent from "./MapComponent"

function Page3(){
    return(
        
        <div id="page3">
            <div id="page3-container">

        
                <div id="route-planner-container">
                <h3>Tour configuration</h3>

                <div id="route-settings">

                    <div className="route-box">
                        <section>
                            <label htmlFor="" className="labels">Tour Name</label>
                            <input type="text" className="textboxes" />
                        </section>
                        <section>
                            <label htmlFor="" className="labels">Number of stops</label>
                            <input type="text" className="textboxes" />

                        </section>
                    </div>


                    <div className="route-box">
                        <section>
                            <label htmlFor="" className="labels">Optimize Route</label>
                                <select name="" id="select-group" className="textboxes" >
                                <option value="">Shortest distance</option>
                                <option value="">Safest route</option>
                                <option value="">Bike</option>

                            </select>
                        </section>
                        <section>
                            <label htmlFor="" className="labels">Number of stops</label>
                        
                            <input type="text" className="textboxes" />

                        </section>
                    </div>

                     <div className="route-box">
                        <section>
                            <label htmlFor="" className="labels">Total Distance</label>
                            <input type="text" className="textboxes" />

                        </section>
                        <section>
                            <label htmlFor="" className="labels">Estimated Time</label>
                        
                            <input type="text" className="textboxes" />

                        </section>
                    </div>



                    <div className="button-box">
                        <section>
                            <button className="buttons"id="addStartBtn">Add Start Point</button>
                            <button id="addStopBtn"className="buttons">Add Stop</button>
                            <button id="addEndBtn" className="buttons">Add End Point</button>
                        </section>
                     
                        <section>
                            <button id="calcRouteBtn" className="buttons">Calculate Route</button>
                            <button id="optRouteBtn" className="buttons">Optimize Route</button>
                            <button id="resetBtn" className="buttons">Reset</button>
                        </section>
                        

                        
                    </div>

                </div>

                </div>

                <div id="map-container">
                    <MapComponent/>

                </div>

            </div>
        </div>
    
    )
}

export default Page3
