import MapComponent from "./MapComponent"
import ControlPanel from "./ControlPanel"

function Page2(){

    return(
        <div id="page2">
            <div id="maps">
                <MapComponent/>
                
            </div>

            <div id="control-panel">
                <ControlPanel></ControlPanel>
            </div>
        </div>
    )


}


export default Page2