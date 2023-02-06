// Initial doc: https://github.com/mdn/learning-area/tree/main/javascript/oojs/bouncing-balls

/* = = = Initialisation sectoin = = = */

// setup HTML5 canvas
//const canvasSim = document.querySelector("canvasSimulation");
const canvasSim = document.getElementById("canvasSimulation");
const ctxSim = canvasSim.getContext('2d');

const widthAll = window.innerWidth;
const widthSim  = canvasSim.width = Math.floor(0.75*widthAll)-50;
const heightSim = canvasSim.height = window.innerHeight-80;
globalVars.worldWidth = canvasSim.width ;
globalVars.worldHeight = canvasSim.height ;

var widthSidebarMax = Math.floor( 0.5 * window.innerWidth);
var widthSidebarParentOpen   = Math.floor(0.25*widthAll);
const widthSidebarParentClosed = 10;
var widthSidebar = widthSidebarParentOpen - widthSidebarParentClosed;

const sizeZero     = "0px";
var strOpenTab = 'controls';

// Setup HTML5 GUI Sections. Use global variables to initialise all values rather than the HTML presets.
function update_slider_values( slider, args ) { slider.min = args.min; slider.max = args.max; slider.value = args.value; }

// Non-live-updating buttons.
const sliderLengthScale    = document.getElementById("sliderLengthScale");
const textFieldLengthScale = document.getElementById("textFieldLengthScale");
update_slider_values( sliderLengthScale, { value: globalVars.lengthScale, min: globalVars.lengthScaleMin, max: globalVars.lengthScaleMax });
textFieldLengthScale.innerHTML = sliderLengthScale.value;
sliderLengthScale.oninput = function() {
    globalVars.lengthScale       = this.value;
    textFieldLengthScale.innerHTML = this.value;
} 

const sliderNumMolecules = document.getElementById("sliderNumMolecules");
const textFieldNumMolecules = document.getElementById("textFieldNumMolecules");
update_slider_values( sliderNumMolecules, { value: globalVars.numMolecules, min: globalVars.numMoleculesMin, max: globalVars.numMoleculesMax });
textFieldNumMolecules.innerHTML = sliderNumMolecules.value;
sliderNumMolecules.oninput = function() {
    globalVars.numMolecules   = this.value;
    textFieldNumMolecules.innerHTML = this.value;    
} 

const togglePresetsOverwriteParams = document.getElementById("togglePresetsOverwriteParams");
togglePresetsOverwriteParams.checked = globalVars.bPresetsOverwriteParams;
//console.log( togglePresetsOverwriteAllParams.checked );
togglePresetsOverwriteParams.oninput = function () {
    globalVars.bPresetsOverwriteParams = togglePresetsOverwriteParams.checked;
}

// Live-updating buttons.
const sliderWorldTemperature = document.getElementById("sliderWorldTemperature");
const textFieldWorldTemperature = document.getElementById("textFieldWorldTemperature");
update_slider_values( sliderWorldTemperature, { value: globalVars.temperature, min: globalVars.temperatureMin, max: globalVars.temperatureMax });
textFieldWorldTemperature.innerHTML = sliderWorldTemperature.value;
sliderWorldTemperature.oninput = function() {
    textFieldWorldTemperature.innerHTML = this.value;
    globalVars.temperature = this.value;
    sim.set_world_temperature( this.value );
} 

const toggleDoHeatExchange = document.getElementById("toggleDoHeatExchange");
toggleDoHeatExchange.checked = globalVars.bHeatExchange;
//console.log( togglePresetsOverwriteAllParams.checked );
toggleDoHeatExchange.oninput = function () {
    globalVars.bHeatExchange = toggleDoHeatExchange.checked;
    sim.set_bool_heat_exchange( toggleDoHeatExchange.checked );
}

var sliderTimeDelta = document.getElementById("sliderTimeDelta");
var textFieldTimeDelta = document.getElementById("textFieldTimeDelta");
update_slider_values( sliderTimeDelta, { value: globalVars.timeDelta, min: globalVars.timeDeltaMin, max: globalVars.timeDeltaMax });
textFieldTimeDelta.innerHTML = sliderTimeDelta.value;
sliderTimeDelta.oninput = function() {
    textFieldTimeDelta.innerHTML = this.value;
    globalVars.timeDelta = this.value;
    sim.set_world_time_delta( this.value );
} 

const toggleUpdateSimWindow = document.getElementById("toggleUpdateSimWindow");
toggleUpdateSimWindow.checked = true;
//console.log( togglePresetsOverwriteAllParams.checked );
toggleUpdateSimWindow.oninput = function () {
   //globalVars.bHeatExchange = toggleDoHeatExchange.checked;
    sim.set_bool_draw_molecules( toggleUpdateSimWindow.checked );
}

/*
    Module dependent items.
*/
const divPhotonEmitterIntensity = document.getElementById("divPhotonEmitterIntensity");
divPhotonEmitterIntensity.style.border = `2px solid rgb(255,0,255)`;
const textFieldPhotonEmitterDescription = document.getElementById("textFieldPhotonEmitterDescription");
const sliderPhotonEmitterIntensity = document.getElementById("sliderPhotonEmitterIntensity");
const textFieldPhotonEmitterIntensity = document.getElementById("textFieldPhotonEmitterIntensity");
textFieldPhotonEmitterIntensity.innerHTML = sliderPhotonEmitterIntensity.value;
sliderPhotonEmitterIntensity.oninput = function() {
    const converted = ( this.value >= 0 ) ? 1e-5 * Math.pow( 10.0, this.value ) : 0.0 ;
    const strConverted = (converted * 1e3).toPrecision(2);
    textFieldPhotonEmitterIntensity.innerHTML = `${strConverted} photons pm⁻¹ ps⁻¹`;
    //mod.set_intensity( 0.0005 ); Start at 50. linear scale.   
    sim.set_module_variable( 'PhotonEmitter', 'intensity', converted );
}


/*
    Composition GUI buttons. Store as a linear array of objects that contain references to each HTML element for adjustments.
*/
const arrCompositionGUI = [];
for ( let i = 0; i < 6; i++ ) {
    const o = {} ;
    // GUI changes in the compositions tab for dynamically showing the number and type of components available for adjustment.
    o.div        = document.getElementById(`divInputComponent${i}`);
    o.colourBox  = document.getElementById(`colourBoxComponent${i}`);    
    o.textField  = document.getElementById(`textFieldComponent${i}`);  
    o.ratioField = document.getElementById(`textPercentageComponent${i}`);
    o.slider = document.getElementById(`sliderPercentageComponent${i}`);  
    //arrCompositionGUI[i].slider.ratioField = arrCompositionGUI[i].ratioField;
    o.slider.oninput = function () { o.ratioField.innerHTML = this.value; }
    //arrCompositionGUI[i].ratioField.innerHTML = arrCompositionGUI[i].slider.value;
    o.slider.onchange = function () {
        sim.gasComp.data[ this.name ] = this.value / 100.0;
        //sim.gasComp.normalise();
    }
    
    // GUI changes in the analysis tab for dynamically showing components that can be plotted.
    /*
    o.spanPlot   = document.getElementById(`spanPlotComponent${i}`);
    o.textFieldPlot = document.getElementById(`textFieldPlotComponent${i}`);    
    o.toggle     = document.getElementById(`togglePlotComponent${i}`);
    o.toggle.oninput = function () {}
    */        
    arrCompositionGUI.push( o ) ;
}

const canvasDoughnutGr = document.getElementById('canvasMolComposition');
const chartDoughnutGr  = new Chart( canvasDoughnutGr, { type: 'doughnut',
    data: {
        labels: [],
        datasets: [{
            label: "Count",
            data: [],
            backgroundColor: [],
            hoverOffset: 4,
            borderWidth: 1,
        }],
    }
});
chartDoughnutGr.options.datasets.doughnut.borderColor='#000';
chartDoughnutGr.options.plugins.title.display=true;
chartDoughnutGr.options.plugins.title.text='Current Composition';
//chartDoughnutGr.options.responsive = true;
chartDoughnutGr.options.maintainAspectRatio = false;
chartDoughnutGr.options.animation.duration = 600;

/*
    Line Graph GUI elements. Matches content on the rspective tab.
*/
function toggle_plot_temperature( bChecked ) {
    if ( bChecked ) {
        canvasLineGr1.style.display = 'block';
        chartLineGr1.bUpdate = true;        
        chartLineGr1.update();        
        //canvasLineGr.style.visibility = 'visible';
    } else {
        chartLineGr1.bUpdate = false;
        canvasLineGr1.style.display = 'none';
        //canvasLineGr.style.visibility = 'hidden';
    }
}
const canvasLineGr1 = document.getElementById('canvasLineGraph1');
const chartLineGr1  = new Chart( canvasLineGr1, { type: 'scatter', data: {} } );
chartLineGr1.options.scales.x.title.display=true;
chartLineGr1.options.scales.x.title.text='Time (ps)';
chartLineGr1.options.scales.x.type='linear';
chartLineGr1.options.scales.x.position='bottom';
chartLineGr1.options.scales.y.title.display=true;
chartLineGr1.options.scales.y.title.text='Temperature (K)';
chartLineGr1.options.scales.y.ticks.display=true;
chartLineGr1.options.animation.duration=0;
chartLineGr1.bUpdate = true;
//chartDoughnutGr.options.datasets.doughnut.borderColor='#000';
//chartLineGr.options.plugins.title.display=true;
//chartLineGr.options.plugins.title.text='Kinetic Energy';

function toggle_plot_composition( bChecked ) {
    if ( bChecked ) {
        canvasLineGr2.style.display = 'block';
        chartLineGr2.bUpdate = true;
        chartLineGr2.update();
        //canvasLineGr.style.visibility = 'visible';
    } else {
        chartLineGr2.bUpdate = false;
        canvasLineGr2.style.display = 'none';
        //canvasLineGr.style.visibility = 'hidden';
    }
}
const canvasLineGr2 = document.getElementById('canvasLineGraph2');
const chartLineGr2  = new Chart( canvasLineGr2, { type: 'scatter', data: {} } );
chartLineGr2.bUpdate = true;
chartLineGr2.options.scales.x.title.display=true;
chartLineGr2.options.scales.x.title.text='Time (ps)';
chartLineGr2.options.scales.y.title.display=true;
chartLineGr2.options.scales.y.title.text='Count';
chartLineGr2.options.animation.duration=0;
//const tmp = canvasLineGr2.getContext('2d');
//tmp.style.backgroundColor='white';
//chartLineGr2.options.scales.y.ticks.min=0;

const canvasBarGr = document.getElementById('canvasBarGraph');
const chartBarGr  = new Chart( canvasBarGr, { type: 'bar', data: {} } );
chartBarGr.options.animation.duration = 600;
chartBarGr.bUpdate = false;
//chartBarGr.options.scales.x.ticks.callback = (i) => (i.toExponential());
// Main software section.
let bRun = false;

/* Initial setup of simulations for plug and play. */
molLib = new MoleculeLibrary();
molLib.add_all_known_molecule_types();
sim = new Simulation();
sim.set_molecule_library( molLib );
sim.setup_graphical_context(ctxSim, globalVars.worldWidth, globalVars.worldHeight, globalVars.refreshAlpha); // In Pixels.
sim.update_values_from_globals();

// Hook in the chart variables.
sim.chartDoughnutGr = chartDoughnutGr;
sim.chartLineGr1 = chartLineGr1;
sim.chartLineGr2 = chartLineGr2;
sim.chartBarGr = chartBarGr;

//Link up live-updating text fields
sim.link_current_stats_text_fields({
    numMolecules: document.getElementById("textFieldCurrentNumMolecules"),
    temperature: document.getElementById("textFieldCurrentTemperature"),
    volume: document.getElementById("textFieldCurrentVolume"),
})

/* Finalise initial setup. Hack to temporarily allow the HTML override values to be read and encoded. */
globalVars.bPresetsOverwriteParams = false;
initial_setup_with_html_vars( get_html_variables() );
generate_preset_simulation( globalVars.initialPreset );
globalVars.bPresetsOverwriteParams = true;

//Link up all graph data.
//sim.sync_all_graphs();

//document.getElementById("textFieldCurrentWorldTemperature").innerHTML = sim.textCurrentWorldTemperature;


function loop() {
    if (!bRun) { return; }
    sim.step();
    requestAnimationFrame(loop);
}

/* Functions linked-to by HTML5 buttons. Passthrough to simulations javascript as neceesary. */
function activate_run_pause_button() {
    if ( !bRun ) {
        start_simulation();        
    } else {
        stop_simulation();
    }
}

function activate_step_button() {
    if ( bRun ) {
        stop_simulation();
    } else {
        if (!sim.bSet) {
            sim.set_target_number_of_molecules(sliderNumMol.value);        
            regenerate_simulation();
        }        
        sim.step();
        //requestAnimationFrame();
    }
}

function start_simulation(){
    if (!bRun) {
        bRun = true;
        if (!sim.bSet) {
            sim.set_target_number_of_molecules(sliderNumMol.value);        
            regenerate_simulation();
        }
        loop();
    }
}

function stop_simulation(){
    bRun = false;
}

function restart_simulation() {
    bRun = false;
    //Store and retrive the current toggled state of the plot.
    const arrHidden = {};
    chartLineGr2.data.datasets.forEach((dataSet, i) => {
        arrHidden[i] = chartLineGr2.getDatasetMeta(i).hidden ;
    });
    sim.regenerate_simulation();        
    update_composition_GUI_from_gasComp();
    chartLineGr2.data.datasets.forEach((dataSet, i) => {
        chartLineGr2.getDatasetMeta(i).hidden = arrHidden[i];
    });
    chartLineGr2.update();
}

function regenerate_simulation(){
    bRun = false;    
    sim.regenerate_simulation();        
    update_composition_GUI_from_gasComp();
}

/* Functions to control the dimensions of each side panel. */
var x = 0, y = 0;
var w = 0, h = 0;

const elementMainWindow      = document.getElementById("mainWindow");
const elementSidebarParent   = document.getElementById('sidebarParent');
const elementSidebarHandle   = document.getElementById('sidebarHandle');
const elementSidebars = {};
elementSidebars['presets'] = document.getElementById("sidebarPresets");
elementSidebars['controls'] = document.getElementById("sidebarControls");
elementSidebars['composition'] = document.getElementById("sidebarComposition");
elementSidebars['analysisLine'] = document.getElementById("sidebarAnalysis0");
elementSidebars['analysisBar'] = document.getElementById("sidebarAnalysis1");

const mouseDownHandlerSidebarResize = function (e) {
    // Get the current mouse position
    x = e.clientX;
    y = e.clientY;
    
    // Calculate the dimension of element
    const styles = window.getComputedStyle(elementSidebarParent);
    w = parseInt(styles.width, 10);
    h = parseInt(styles.height, 10);
    //console.log(w, h);

    // Attach the listeners to `document`
    document.addEventListener('mousemove', mouseMoveHandlerSidebarResize);
    document.addEventListener('mouseup', mouseUpHandlerSidebarResize);
};

const mouseMoveHandlerSidebarResize = function (e) {
    // How far the mouse has been moved
    const dx = x - e.clientX;
    //const dy = e.clientY - y;

    // Adjust the dimension of element
    const temp = w + dx;
    //elementSidebarParent.style.width = `${temp}px`;
    widthSidebarParentOpen = Math.min(temp, widthSidebarMax);    
    widthSidebar = widthSidebarParentOpen - widthSidebarParentClosed;
    update_sidebar_dimensions(strOpenTab);
    //ele.style.height = `${h + dy}px`;
};

const mouseUpHandlerSidebarResize = function () {
    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener('mousemove', mouseMoveHandlerSidebarResize);
    document.removeEventListener('mouseup', mouseUpHandlerSidebarResize);
    update_sidebar_dimensions(strOpenTab);
};

function update_sidebar_dimensions(s) {
    if ( s != 'none' ) {
        elementMainWindow.style.marginRight = `${widthSidebarParentOpen}px`;            
        elementSidebarParent.style.width    = `${widthSidebarParentOpen}px`;        
        for ( key in elementSidebars ) {
            if ( key == s ) { elementSidebars[key].style.width = `${widthSidebar}px`; } else { elementSidebars[key].style.width = sizeZero; }
        }
    } else {
        elementMainWindow.style.marginRight = `${widthSidebarParentClosed}px`;            
        elementSidebarParent.style.width    = `${widthSidebarParentClosed}px`;        
        for ( key in elementSidebars ) { elementSidebars[key].style.width = sizeZero; }
    }
    
    //Pause updating of some graphs when the sidebar is closed.
    if ( 'analysisBar' === s ) {
        chartBarGr.bUpdate = true; sim.inventory_bar_graph();
    } else {
        chartBarGr.bUpdate = false;
    }
}

function open_sidebar(x) { strOpenTab = x;  update_sidebar_dimensions(strOpenTab); }
function close_sidebars() { strOpenTab = 'none'; update_sidebar_dimensions(strOpenTab); }

// Initialise Sidebar settings.
elementSidebarHandle.addEventListener('mousedown', mouseDownHandlerSidebarResize);
update_sidebar_dimensions(strOpenTab);
// 

// Preset Button Functions.
function overwrite_global_values( strType ) {
    
    const p = globalVars.presets[strType];    
    sliderNumMolecules.value = p.numMolecules;
    sliderNumMolecules.oninput();
    sliderLengthScale.value = p.lengthScale;
    sliderLengthScale.oninput();
    sliderWorldTemperature.value = p.worldTemperature;
    sliderWorldTemperature.oninput();
    sliderTimeDelta.value = p.timeDelta;
    sliderTimeDelta.oninput();
    toggleDoHeatExchange.checked = p.bDoHeatExchange;
    toggleDoHeatExchange.oninput();
}

function generate_preset_simulation( strType ) {
    stop_simulation();
    
    if ( !(strType in globalVars.presets) ) {
        throw "ERROR: The preset type '${strType}' has not yet been defined in the globalVars presets object!";
    }
    const p = globalVars.presets[strType];
    
    // Overwrite parameters by altering the button values and then triggering their oninput calls.
    if( globalVars.bPresetsOverwriteParams ) {
        overwrite_global_values( strType );
    }
    
    // Create the gas composition here.
    const gc = new GasComposition('ratio');
    gc.add_components_via_array( p.componentIDs, p.componentRatios ) ;
    gc.normalise();
    sim.set_gas_composition(gc);       
    
    const gr = get_new_preset_gas_reactions( {type: strType, moleculeLibrary: molLib} );
    sim.set_gas_reactions(gr);
       
    sim.regenerate_simulation();    

    // Additional setup - ranging from gui modifiation to module loading.
    sync_composition_gui( p );
        
    //
    if ( undefined != p.componentHidePlot ) {
        chartLineGr2.data.datasets.forEach((dataSet, i) => {
            var meta = chartLineGr2.getDatasetMeta(i);
            meta.hidden = ( p.componentHidePlot.indexOf( meta.label ) > -1 );
        });
        chartLineGr2.update();
    }
    
    sim.reset_plugin_modules();
    // Load Photon emitter module for presets that require them.
    switch ( strType ) {
        case "ozone layer formation":
            var mod = new PhotonEmitterModule({
                model: "solar",
                minLambda: 100,
                maxLambda: 280,
                molNamesReaction: [ "O₂", "O₃" ],
                photonColour: 'rgb(255,0,255)', // Hot-pink magenta rays with width 1.
            });
            sim.add_plugin_module( mod );
            divPhotonEmitterIntensity.style.display = "block";
            textFieldPhotonEmitterDescription.innerHTML = "<strong>solar UV radiation model</strong></br>";
            sliderPhotonEmitterIntensity.value = 1.0;
            sliderPhotonEmitterIntensity.oninput();
            break;
        case "hydrogen iodide equilibrium":
           var mod = new PhotonEmitterModule({
                model: "single",
                avgLambda: 532.0,
                molNamesReaction: [ "I₂" ],
            });
            sim.add_plugin_module( mod );
            divPhotonEmitterIntensity.style.display = "block";
            textFieldPhotonEmitterDescription.innerHTML = "<strong>532 nm green laser</strong></br>";
            sliderPhotonEmitterIntensity.value = -0.1;
            sliderPhotonEmitterIntensity.oninput();
            break;
        default:   
            divPhotonEmitterIntensity.style.display = "none";
    }
}

//Synchronise the composition GUI for future user modification. Hook up the variable elements directly to the gas composition object.
function sync_composition_gui( obj ) {
    /*
    <div id="divInputComponent1" class="divDynamicBox">
        <p><span id="textFieldComponent1"></span>: <span id="textPercentageComponent1"></span>%</p>
        <input type="range" min="0" max="100" value="50" class="slider" id="sliderPercentageComponent1">
    </div>    
    */
    let name = undefined, color=undefined, o = undefined;  
    const n = arrCompositionGUI.length;   
    arrCompositionGUI.numShow = obj.numComponentsShow;
    
    for (let i = 0; i < n; i++ ) {
        o = arrCompositionGUI[i];
        if ( i < obj.numComponentsShow ) {
            name = obj.componentIDs[i];            
            color = molLib.get_molecule_color( name );
            o.slider.name = name ;
            o.div.style.display = "block";
            o.div.style.border = `2px solid ${color}`;
            //o.colourBox.style.color = `${color}`;
            o.colourBox.style.background = `${color}`;
            o.colourBox.style.border = `2px solid grey`;
            o.textField.innerHTML = name ;
            o.slider.value = sim.gasComp.data[ name ] * 100.0 ;
            o.ratioField.innerHTML = o.slider.value;
            //o.slider.oninput = function () { this.ratioField.innerHTML = this.value; }
            
            /*
                o.spanPlot.style.display = "inline";
                o.textFieldPlot.innerHTML = name;
                o.toggle.name = name;
            */

        } else {
            o.div.style.display = "none";
            //o.spanPlot.style.display = "none";
        }
    }    
}

// Define an update function to link Gas composition normalisation back to the GUI.
function update_composition_GUI_from_gasComp() {
    const n = arrCompositionGUI.numShow ;
    let name = undefined, val = undefined;
    for (let i = 0; i < n; i++ ) {
        name = arrCompositionGUI[i].textField.innerHTML ;
        val = sim.gasComp.data[ name ] * 100 ;
        val = val.toFixed(1);
        arrCompositionGUI[i].slider.value = val ;
        arrCompositionGUI[i].ratioField.innerHTML = val ;
    }
}

/* Webassembly import section */
let collision_check_wasm = null;

// const importObject = { imports: { imported_func: (arg) => console.log(arg) } };
// WebAssembly.instantiateStreaming(fetch("distCheck.wasm"), importObject).then(
  // obj => { collision_check_wasm = obj.exports.check_collision; }
// );

// fetch("distCheck.wasm")
    // .then(bytes=> bytes.arrayBuffer())
    // .then(mod=> WebAssembly.compile(mod))
    // .then(module=> {return new WebAssembly.Instance(module)})
    // .then( instance => {
        // collision_check_wasm = instance.exports.check_collision;
    // });
