/*
    Physical units within the simulation.
    Time     = fs  = 1e-15 s
    Position = pm  = 1e-12 m
    ...
    Velocity = pm fs^-1 
    Mass     = amu ~- 1   g/mol
    Energy   = 1 kJ/mol = 1 amu pm^2 fs^-2
    
    = = = = 
    For an oxygen molecules in 2D, this translates ~ 0.3 pm/fs ~ 1.5 kJ/mol
    
    = = Notes on performance: = =
    The majority of time is spent on drawing circles for each atom. So there is a practical limit to the total number of atoms that can be included, rather than the complexity of the simulation.
*/

var globalVars = {};

// Visual trails from older frames.
// Determines the length of shadows as the screen refreshes each frame.
globalVars.refreshAlpha = 0.4;
globalVars.invRefreshAlphaParams = { min: 1.0, max: 10.0, step: 0.5 }

// World temperature. Used to determine initial velocities and heat-exchange after collisons.
globalVars.temperature       =  300;
globalVars.temperatureParams = { min: 10, max: 1000, step: 10 }

// Thermal conductivity determines the speed at which the system equilibrates towards the outside temperature.
globalVars.wallThermalConductivity = 1.0 ;
globalVars.wallThermalConductivityParams = { min: 0.0, max: 1.0, step: 0.05 }
// A simulation internal parameter globalVars.bDoHeatExchange will cut out calculations if this is set to 0.0

// World Gravity determines the background acceleration in the +y direction (downwards), mimicking the action of centrifugal force.
// The Earth's gravitational constant 9.81 × 10⁻¹⁸ pm fs⁻² is clearly not visible in simulation time, but is coded here.
globalVars.gravitationalConstant = 9.81e-18 ; 
globalVars.worldGravityMultipler = -1;
globalVars.worldGravityMultiplerParams = { min: -1, max: 12, step: 1 }

// Define gravity to be 9.8 pm / ps^2 = 9.8 * 10^-6 pm / fs^2
// Hardcode gravity for now within defineSimulation.js and allow changes later.
// Gravity being 9.8 m/s^2 -> 9.8e-18 pm fs^-2. Clearly not visible in simulation time.



// Determines the scaling between the simulation and the default pixel size.
// Defaults to 1 pixel = 10 pm = 0.1 Angs.
globalVars.distScale     = 10;
globalVars.distScaleParams = { min: 10, max: 80, step: 10 }

globalVars.zoomScale      =  10; //This is updated on load according to window size.

// Converts the default units to pm per fs.
globalVars.timeFactor = 1e-3;
globalVars.timeDelta  =  10.0;
globalVars.timeDeltaParams = { min:  5.0, max: 200.0, step: 5.0 }

// molecules per nm^2
// Notes: an oxygen molecule has an area of ~0.1 nm^2
globalVars.densMolecules     =  0.75;
globalVars.densMoleculesParams = { min: 0.05, max: 2.00, step: 0.05 }

globalVars.statisticsUpdateInterval = 100;

// Defined by the device screen and the length scale variable
globalVars.worldWidth = undefined; 
globalVars.worldHeight = undefined;

globalVars.worldAreaPercentage = 100;
globalVars.worldAreaPercentageParams = { min: 20, max: 100, step: 1 }

globalVars.initialPreset = "nitrogen dioxide";
globalVars.bPresetsOverwriteParams = true; //Prevent the initial loading from overwriting HTML overrides.

//Tab.
globalVars.initialOpenTab='presets';

// Molecular colouring section. Superceded by Drawing style.
globalVars.molDrawStyle = 'molecule';
//globalVars.moleculeColourScheme = "molecule"; //Choices: 'atom' or 'molecule'

// Summons a map instance. Use map.get(X) as syntax.
function get_html_variables() {

    const address = window.location.search  
    // Returns a URLSearchParams object instance
    const parameterList = new URLSearchParams(address) 
    
    let mapUserHTMLVars = new Map();
    parameterList.forEach((value, key) => { mapUserHTMLVars.set(key, value); });
    return mapUserHTMLVars;
}

// Converts a subset of variables to html optional arguments to save ycustom parameters.
function print_html_variables() {
    var ret;
    //ret = window.location;
    ret = window.location.href.split('?')[0];
    ret += "?initialPreset="+globalVars.initialPreset;    
    // Hard-code saved options for now.
    ret += "&distScale="+globalVars.distScale;
    ret += "&densMolecules="+globalVars.densMolecules;
    ret += "&temperature="+globalVars.temperature;
    ret += "&componentIDs="+globalVars.componentIDs;
    ret += "&componentRatios="+globalVars.componentRatios;
    
    return ret;
}

function initial_setup_with_html_vars( mapUserHTMLVars ) {
    
    const p = mapUserHTMLVars.get( "initialPreset" );
    if ( undefined != p ) { globalVars.initialPreset = p };
    overwrite_global_values( globalVars.initialPreset );
    
    // Overwrite these values from user HTML given tags
    for (const key in globalVars) {
        let s = mapUserHTMLVars.get(key);
        if ( undefined != s ) {            
            switch (key) {
                case "componentIDs":
                    globalVars[key] = s.split(',');
                    break;                
                case "componentRatios":
                    globalVars[key] = s.split(',').map(Number);
                    break;
                default:
                    globalVars[key] = s;
                    // Need to also update slider values as well.
                    update_slider_value_by_param( key, s );
                    break;
            }
        }    
    }
}

// WIP to converting these prsents into classess. 
// This is the creation object, making sure values have a default.
/* function create_preset_default_parameters() {
    obj = {};
    obj.distScale = 10;
    obj.timeDelta = 10;
    obj.worldTemperature = 200;
    p.wallThermalConductivity = 1.0;
    p.worldGravityMultipler = -1 ;
    p.densMolecules = 1.00;
    p.numComponentsShow = 0;
    p.componentIDs    = [];
    p.componentRatios = [];
    return obj
} */

// == Available preset simulation variables go below this section. = =
globalVars.presets = {};

/*
    Notes:
        1. All reactants, products and expected intermediates should be defined prior to activation.
        2. Place all species that the user are allowed to add prior to the simulation at the beginning. In other words, short-lived intermediates go after the reactants, products, and other participating molecules.
        3. Component ratios don't need to be listed for intermediates. The undefined entries will just resolve to 0.0.
*/
// Noble Gas, i.e. hard spheres.
var temp = globalVars.presets[ "inert gases" ] = {};
temp.distScale = 20;
temp.timeDelta = 50;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 124;
temp.densMolecules = 1.00;
temp.numComponentsShow = 9;
temp.componentIDs    = [ "He", "Ne", "N₂", "Ar", "CO₂", "Kr", "CF₄", "Xe", "SF₆" ];
temp.componentRatios = [  250, 49.6, 35.7, 25.0,  22.7, 11.9,  11.3, 7.62, 6.85 ];

/*
    Note: one molecule of ideal gas occupies 11.9 nm^2  at SATP, or 41.2 nm^3 in 3D.
*/
temp = globalVars.presets[ "atmosphere" ] = {};
temp.distScale =  80;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.1;
temp.numComponentsShow = 4;
temp.componentIDs    = [ "N₂", "O₂", "Ar", "H₂O" ];
temp.componentRatios = [ 0.78, 0.21, 0.01, 0.02 ];

/*
    Notes: To show pressure effects of Le-Chatelier's, trying setting temperature up to >700K so that both collision rate is increased and there is only a small amount of N2O4. This gives more opportunity for N2O4 levels to increase as the chamber is comperessed by ~8x.
    When there's ~40% of N2O4 already present (~300K), the 2D collision dynamics mean that they effectively become a blocking gas which inhibit further formation of N2O4.
*/
temp = globalVars.presets[ "nitrogen dioxide" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 200;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 300;
temp.densMolecules = 0.5;
temp.numComponentsShow = 2;
temp.componentIDs    = [ "NO₂•", "N₂O₄" ];
temp.componentRatios = [ 0.6, 0.4 ];

temp = globalVars.presets[ "hydrogen iodide equilibrium" ] = {};
temp.distScale  = 20;
temp.timeDelta    = 20;
temp.worldTemperature = 600;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 300;
temp.densMolecules = 1.2;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "H₂", "I₂", "HI", "H•", "I•" ];
temp.componentRatios = [ 0.5, 0.5, 0.0 ];
temp.componentHidePlot = [ "H•", "I•" ];

temp = globalVars.presets[ "ClNO equilibrium (aqua regia)" ] = {};
temp.distScale  = 20;
temp.timeDelta    = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
temp.densMolecules = 1.0;
temp.numComponentsShow = 4;
temp.componentIDs    = [  "ClNO₂", "NO•", "ClNO", "NO₂•" ];
temp.componentRatios = [ 0.16, 0.16, 0.34, 0.34 ];
temp.componentHidePlot = [ "ClNO₂", "ClNO" ];

temp = globalVars.presets[ "ozone layer equilibrium" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "O•" ];
temp.componentRatios = [ 0.78, 0.21, 0.01, 0.0 ];
temp.componentHidePlot = [ "N₂" ];

temp = globalVars.presets[ "ozone layer with Chlorine" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 10;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "ClO•", "Cl•", "ClOO•", "ClOOCl", "Cl₂", "Cl₂O", "O•" ];
temp.componentRatios = [ 0.76, 0.20, 0.01, 0.03, 0.0 ];
temp.componentHidePlot = [ "N₂",  "Cl•", "ClO•", "ClOO•", "ClOOCl", "Cl₂", "Cl₂O" ];

temp = globalVars.presets[ "ozone layer with NOX" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 8;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N•", "O•" ];
temp.componentRatios = [ 0.76, 0.20, 0.01, 0.01, 0.02, 0.0 ];
temp.componentHidePlot = [ "N₂", "NO•", "NO₂•", "NO₃•", "N•" ];
// temp.numComponentsShow = 7;
// temp.componentIDs    = [ "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N₂O", "O•", "N•", ];
// temp.componentRatios = [ 0.76, 0.20, 0.01, 0.01, 0.02, 0.0 ];
// temp.componentHidePlot = [ "N₂", "NO•", "NO₂•", "NO₃•", "N₂O","N•" ];

temp = globalVars.presets[ "NOX decomposition reactions" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.8;
temp.numComponentsShow = 13;
temp.componentIDs    = [ "N₂O₅", "N₂O₄", "N₂O₃", "N₂O₂", "ONONO₂", "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N•", "O•" ];
temp.componentRatios = [ 0.3, 0.3, 0.2, 0.1, 0.1 ];
temp.componentHidePlot = [ "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N•", "O•" ];
/*
    TODO: Add reactions for all additional NOx species not modelled within the Ozone layer set.
    However, need to add NO recombination with N2O5 pathway above to encourage decomposition:
        - i.e. N2O5 + NO -> ONONO2 + NO2 -> 3 * NO2. With UV catalysis of ONONO2 and N2O5, if possible.
        - i.e. 2 * NO2 <-> N2O4, with UV catalysis.
        - i.e. 2 * NO <-> N2O2, with UV catalysis if possible.
*/

temp = globalVars.presets[ "combustion - H2 and O2 basic" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 700;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.8;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "H₂", "O₂", "H₂O", "O•", "H•", "HO•" ];
temp.componentRatios = [ 0.67, 0.33, 0.0 ];
temp.componentHidePlot = [ "O•", "H•", "HO•" ];

temp = globalVars.presets[ "combustion - H2 and O2 advanced" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 700;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 400;
temp.densMolecules = 0.8;
temp.numComponentsShow = 8;
temp.componentIDs    = [ "H₂", "O₂", "H₂O", "H₂O₂", "O•", "H•", "HO•", "HO₂•" ]; //"O₃", 
temp.componentRatios = [ 0.67, 0.33, 0.0 ];
temp.componentHidePlot = [ "O•", "H•", "HO•", "HO₂•" ];

temp = globalVars.presets[ "combustion - hydrocarbon" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 600;
temp.wallThermalConductivity = 1.0;
temp.worldGravityMultipler = -1 ;
//temp.numMolecules = 500;
temp.densMolecules = 1.0;
temp.numComponentsShow = 5;
temp.componentIDs    = [
    "O₂","CH₄","H₂","CO₂","H₂O",
    "O•", "H•", "HO•", "H₂O₂", "HO₂•",
    "CH₃•", "CH₂•",
    "CH₃O•","CH₂O","HCO•","CO",
    "C₂H₆","C₂H₅•","C₂H₄","C₂H₃•","C₂H₂",
];
temp.componentRatios = [ 0.667, 0.333, 0.0, 0.0, 0.0 ];
temp.componentHidePlot = [
    "O•", "H•", "HO•", "H₂O₂", "HO₂•",
    "CH₃•", "CH₂•",
    "CH₃O•","CH₂O","HCO•","CO",
    "C₂H₆","C₂H₅•","C₂H₄","C₂H₃•","C₂H₂",
];

/*
    The objects listing potential reactions go here so that they can be loaded in a modular manner.
    
    Note: all atom transfer reactions are defined such that the reactant and products are ordered.
*/
globalVars.presetReactions = {}

// Basic NO2 N2O4 equilibrium for HSC Chemistry.
// Source for activation energy: Ornellas et al., 2003. DOI: 10.1063/1.459256
globalVars.presetReactions[ "nitrogen dioxide" ] = [
    {
        reactantNames: [ "NO₂•", "NO₂•" ], productNames: [ "N₂O₄" ],
        reactantAngles:      [   0, 180 ], 
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0 ],
        productAngleRanges:  [ 360 ],
        EActivation: 0.2, lifetimeActivated: 2000,
    }
]

/*
    Aqua regia volatile gas equilibria.
    
    Royal water" was the stuff chemists used to dissolve noble metals gold and platinum. There is a nice story about Hungarian chemist George de Hevesy dissolving two Nobel prize medals to evade confiscation by Nazi Germany. See Wikipedia entry: https://en.wikipedia.org/wiki/Aqua_regia
    Nowadays, the reactions between Clorine, chloride and NOx species are studied in marine air quality as chlorine in all its forms affect the balance of these pollutants. There are important air-water interface reactions that are beyond the scope of this model, but it is worth knowing as 
    
    It begins with 3:1 mixture of HCl and HNO3, which will react and beign to form ClNO, ClNO2, and eventually just NO2.
        
    For now, we will simply use one of the restricted textbook equilibrium cases.
    NB: The rates in RL seems to heavily favour NO2 at a 10:1 ratio, whereas in this 2D model we have a 4:1 ratio.    
    See: https://chemed.chem.purdue.edu/genchem/topicreview/bp/ch16/gas.php
*/
globalVars.presetReactions[ "ClNO equilibrium (aqua regia)" ] = [
    {
        reactantNames: [ "ClNO₂", "NO•" ], productNames: [ "ClNO", "NO₂•" ],
        reactantAngles:      [   0, 180 ], 
        reactantAngleRanges: [ 240, 180 ],
        productAngles:       [ 120,   0 ],
        productAngleRanges:  [ 120, 240 ],
        EActivation: 1.5, 
    } // DeltaH: -17 kJ/mol, Guessed Ea
]

/*
    Hydrogen iodide decomposition is one of the three main steps in a method to produce hydrogen and oxygen from water - known as the sulfur-iodine cycle.
    One fancy thing about this equilibrium is that the dissociation energy of I2 -> I+I is equivalent to green light at 578 nm.
    
    See: https://en.wikipedia.org/wiki/Hydrogen_iodide and https://en.wikipedia.org/wiki/Sulfur%E2%80%93iodine_cycle 
    NB: requires catalysis to make the sulfuric acid decomposition more feasible.
    
    0. Get DeltaH from ANL database as usual: https://atct.anl.gov/Thermochemical%20Data/version%201.118/
        - H: 218, I: 107, I2: 62, HI: 26 
    1. We take the activation energies from this publication on the kinetics: Zhang et al. (2008), DOI: 10.1016/j.ijhydene.2007.10.025
    2. Some additional useful information of catalysed versions can be found in, e.g.: Favuzza et al. (2011), DOI: 10.1016/j.apcatb.2011.03.032  
*/
globalVars.presetReactions[ "hydrogen iodide equilibrium" ] = [
    {
        reactantNames: [ "H•", "H•" ], productNames: [ "H₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation: 0.0, DeltaH: -43.6, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "I•", "I•" ], productNames: [ "I₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0.0, DeltaH: -15.2, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "I•", "H•" ], productNames: [ "HI" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0.0, DeltaH: -29.9, lifetimeActivated: 1000,
    },    
    {
        reactantNames: [ "H₂", "I•" ], productNames: [ "H•", "HI" ],
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation: 14.0, DeltaH: 13.7,
    },
    {
        reactantNames: [ "I₂", "H•" ], productNames: [ "I•", "HI" ],
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation:  0.2, DeltaH: -14.7,
    },
    {
        // Symmetric copies
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [  90,  90 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [ 270,  90 ],
        angleReactionOffset:  90,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        // Symmetric copies
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [  90, 270 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [ 270,  90 ],        
        angleReactionOffset:  90,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        // Symmetric copies
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [ 270,  90 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [  90, 270 ],
        angleReactionOffset: 270,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        // Symmetric copies
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [ 270, 270 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [  90, 270 ],
        angleReactionOffset: 270,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },    
    {
        // Symmetric copies
        reactantNames: [ "HI", "HI" ], productNames: [ "I₂", "H₂" ],
        reactantAngles:      [ 270,  90 ], 
        reactantAngleRanges: [ 120, 120 ],
        productAngles:       [  90,  90 ],
        angleReactionOffset: 90,
        EActivation:  19.1, DeltaH: 1.0,
        bDoReverse: false,
    },
    {
        // Symmetric copies
        reactantNames: [ "HI", "HI" ], productNames: [ "I₂", "H₂" ],
        reactantAngles:      [  90, 270 ], 
        reactantAngleRanges: [ 120, 120 ],
        productAngles:       [  90,  90 ],
        angleReactionOffset: 270,
        EActivation:  19.1, DeltaH: 1.0,
        bDoReverse: false,
    }
    
]

/*
    Ozone layer simple model
    General pathways: https://en.wikipedia.org/wiki/Ozone%E2%80%93oxygen_cycle
    Get DeltaH from ANL database: https://atct.anl.gov/Thermochemical%20Data/version%201.118/
    Model photochemical excitation separately by adding to the internal energy of the molecule (pure rotation here).
    NB: 200nm light gives 598 kJ/mol of energy -> convert to 59.8 in this model.
    Give oxygen 200nm light and ozone 260nm light. See: Section 2 of http://www.ccpo.odu.edu/SEES/ozone/class/Chap_5/index.htm   
    
    Activation energy source for ozone contributions: Sun et al. (2019), DOI: 10.1016/j.pecs.2019.02.002
    TODO: add things that destroy the ozone layer.    
    
    
    Best overall reading seems to be Green Chemistry: an inclusive approach, Chapter 3.3 by Wilmouth et al. (2018) DOI: 10.1016/B978-0-12-809270-5.00008-X
*/
globalVars.presetReactions[ "ozone equilibrium core" ] = [
    {
        reactantNames: [ "O•", "O•" ], productNames: [ "O₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:   0, lifetimeActivated: 1000,
    }, // UV-triggered decomposition.
    {
        reactantNames: [ "O₂", "O•" ], productNames: [ "O₃" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "O₃", "O•" ], productNames: [ "O₂", "O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 2.0,
    }
]

/*
    Advanced: Involvement of Cl radical species in ozone layer equilibrium. 
    
    Mechanisms in theis model are based on p.186 of Green Chemistry, Chapter 3.3 (Wilmouth et al., 2018). This focuses on polar ozone layer at high stratephoeres, where NOX species are largely absent. A decent open acces alternative is given by` Clarmann (2014) DOI: 10.1016/S0187-6236(13)71086-5
    Relatively inconsequential Cl₂ path is included for completeness, while BrO contributions are not included.7
    Cl - NOX interactions that happen in the lower stratosphere are currently ignored. Bannan et al. (2015) DOI: 10.1002/2014JD022629
    
    TODO: Fill in kinetic data.  All activation energies are currently guesses due to ongoing research.   
    Nikolaison et al. (1994). DOI: 10.1021/j100052a027 has kinetics data but no Arrhenius activation energies.
*/
globalVars.presetReactions[ "ozone layer with Chlorine" ] = [
    {
        reactantNames: [ "O•", "Cl•" ], productNames: [ "ClO•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:   0, lifetimeActivated: 1000,
    },  // DeltaH = -268 kJ/mol. Relatively safe to ignore.    
    {
        reactantNames: [ "O•", "ClO•" ], productNames: [ "ClOO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 360, 180 ],
        productAngles:       [  45 ],
        EActivation:   0.5, lifetimeActivated: 1000,
        bDoReverse: false
    },  // DeltaH = -253 kJ/mol. Relatively safe to ignore.    
    {
        reactantNames: [ "O₂", "Cl•" ], productNames: [ "ClOO•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0.5, lifetimeActivated: 1000,
    }, // DeltaH = -23 kJ/mol
    {
        reactantNames: [ "ClOO•", "Cl•" ], productNames: [ "ClOOCl" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        EActivation:  0.5, lifetimeActivated: 1000,
    }, // DeltaH = -91 kJ/mol. Do this one first in decomposition tests to reflect photolysis preferences at ~90%.
    {
        reactantNames: [ "ClO•", "ClO•" ], productNames: [ "ClOOCl" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        EActivation:  0.5, lifetimeActivated: 1000,        
    }, // DeltaH = -76 kJ/mol
    {
        reactantNames: [ "Cl•", "Cl•" ], productNames: [ "Cl₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:   0, lifetimeActivated: 1000,
    }, // DeltaH = -242 kJ/mol. Side product.
    {
        reactantNames: [ "Cl•", "ClO•" ], productNames: [ "Cl₂O" ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 180 ],
        productAngles:       [  90 ],
        EActivation:  0.5, lifetimeActivated: 1000,
    }, // DeltaH = -142 kJ/mol. Side product.
    
    // = = = Transfer reactions.
    {
        reactantNames: [ "ClO•", "O•" ], productNames: [ "Cl•", "O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 0.5,
    }, // DeltaH = -230 kJ/mol  
    {
        reactantNames: [ "ClOO•", "O•" ], productNames: [ "ClO•", "O₂" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 0.5,
    }, // DeltaH = -245 kJ/mol. Symmetry 1.
    {
        reactantNames: [ "ClOO•", "O•" ], productNames: [ "O₂", "ClO•" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 0.5, bDoReverse: false       
    }, // DeltaH = -245 kJ/mol. Symmetry 2.
    {
        reactantNames: [ "ClOOCl", "O•" ], productNames: [ "ClOO•", "ClO•" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [  45, 180 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 0.5,
    }, // DeltaH = -177 kJ/mol. Symmetry 1
    {
        reactantNames: [ "ClOOCl", "O•" ], productNames: [ "ClOO•", "ClO•" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [  45, 180 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 0.5, bDoReverse: false
    }, // DeltaH = -177 kJ/mol. Symmetry 2    
    {
        reactantNames: [ "Cl₂", "O•" ], productNames: [ "Cl•", "ClO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation: 0.5,
    }, // DeltaH = -26 kJ/mol
    {
        reactantNames: [ "Cl₂O", "O•" ], productNames: [ "ClO•", "ClO•" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 0.5,
    }, // DeltaH = -126 kJ/mol. Symmetry 1 
    {
        reactantNames: [ "Cl₂O", "O•" ], productNames: [ "ClO•", "ClO•" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 0.5, bDoForward: false,
    }, // DeltaH = -126 kJ/mol. Symmetry 2

    {
        reactantNames: [ "O₃", "ClO•" ], productNames: [ "O₂", "ClOO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 240, 180 ],
        productAngles:       [   0,  45 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation: 0.5,
    },  // DeltaH = -146 kJ/mol
    {
        reactantNames: [ "O₃", "Cl•" ], productNames: [ "O₂", "ClO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation: 0.5,
    }, // DeltaH = -161 kJ/mol
    {
        reactantNames: [ "Cl₂O", "Cl•" ], productNames: [ "ClO•", "Cl₂" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 360 ],
        EActivation: 0.5,
    }, // DeltaH = -100 kJ/mol.
    {
        reactantNames: [ "ClOO•", "Cl•" ], productNames: [ "O₂", "Cl₂" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 0.5,
    }, // DeltaH = -219 kJ/mol. Other symmetry leads to ClOOCl 
    {
        reactantNames: [ "ClOOCl", "Cl•" ], productNames: [ "ClOO•", "Cl₂" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [  45,   0 ],
        productAngleRanges:  [ 180, 360 ],
        EActivation: 0.5,
    }, // DeltaH = -151 kJ/mol. Symmetry 1
    {
        reactantNames: [ "ClOOCl", "Cl•" ], productNames: [ "ClOO•", "Cl₂" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [  45,   0 ],
        productAngleRanges:  [ 180, 360 ],
        EActivation: 0.5, bDoReverse: false
    }, // DeltaH = -151 kJ/mol. Symmetry 2    
    
    {
        reactantNames: [ "ClOO•", "ClO•" ], productNames: [ "O₂", "Cl₂O" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation: 0.5,
    }, // DeltaH = -119 kJ/mol.
    {
        reactantNames: [ "ClOOCl", "ClO•" ], productNames: [ "ClOO•", "Cl₂O" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [  45, 180 ],
        productAngleRanges:  [ 180, 240 ],
        EActivation: 3.0,
    }, // DeltaH =  51 kJ/mol. Symmetry 1
    {
        reactantNames: [ "ClOOCl", "ClO•" ], productNames: [ "ClOO•", "Cl₂O" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [  45, 180 ],
        productAngleRanges:  [ 180, 240 ],
        EActivation: 3.0, bDoReverse: false
    }, // DeltaH =  51 kJ/mol. Symmetry 2  
    {
        reactantNames: [ "ClOO•", "ClOO•" ], productNames: [ "ClOOCl", "O₂" ],
        reactantAngles:      [  45, 225 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [  45,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 3.0, bDoReverse: false
    }, // DeltaH = -68 kJ/mol. Symmetry 1
    {
        reactantNames: [ "ClOO•", "ClOO•" ], productNames: [ "O₂", "ClOOCl" ],
        reactantAngles:      [ 225,  45 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0,  45 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 3.0,
    } // DeltaH = -68 kJ/mol. Symmetry 2   
]

/*
    Advanced: Involvement of NOx species in ozone layer equilibrium. This is mainly the low-stratosphere section where ther are mostly NOX species.
    Utilised references:
    - Skalska et al. (2011). DOI: 10.1016/j.ces.2011.01.028
    - Jaroszyńska-Wolińska (2010). DOI: 10.1016/j.theochem.2010.04.024      
    - Kritten et al. (2014). DOI: 10.5194/acp-14-9555-2014 
    - San Diego Mechanism NOx supplements for O + N2, N + O2 , N2O + O, and so on.    
    - Bannan et al.(2015). DOI: 10.1002/2014JD022629
   
    The main reactions in Kritten et al. (2014) are:
    1. NO + O3 -> NO2 + O2
    2. O + NO2 -> NO + O2
    3a. N2O + O -> 2NO
    3b. N2O + O -> N2 + O2
    4. N2O + hν -> N2 + O
    5. NO + hν -> N + O
    6. NO + N -> N2 + O
    7. NO2 + hν -> NO + O   
    8. NO2 + O3 -> NO3 + O2
    ...
    9. NO2 + NO3 <-> N2O5 (not modelled here just yet )
    10. N2O5 + H2O -> 2HNO3 (not modelled here so as to exclude set of hydrogen reactions)
    Authors state the nighttime net increase of HNO3, N2O5, and ClONO2 serve as the basis for daytime destruction of ozone layers.
    Also see other papers for further discussions. Bannan et al. (2015) introduces chlorine sources as an additional pollutant alongside NOX.
    
    Notes: Simulation fo opf 50% NO2 and 50% NO3 produces equimolar of NO2, NO, and O2.
    ...There are alternate pathways that may need to be considered in order to further reduce the formation of NO.
    This goes via the N2O5 + NO -> NO2 + NO2 + NO2 path.
    See: https://chemistry.stackexchange.com/questions/169350/mechanism-of-decomposition-of-n2o5 
    See also: Schott and Davidson (1958)
    
*/
globalVars.presetReactions[ "ozone layer with NOX" ] = [
    // Common pathways.
    // Part A: Combination reactions. Most of these are UV-catalysed to decompose as well.
    { 
        reactantNames: [ "N•", "N•" ], productNames: [ "N₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0.5, lifetimeActivated: 1000, bDoReverse: false,
    }, // DeltaH: -944 kJ/mol. Guessed EA. Ignore decomposition pathway. 
    // {
        // reactantNames: [ "N₂", "O•" ], productNames: [ "N₂O" ],
        // reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        // EActivation: 9.6, lifetimeActivated: 1000,
    // }, // DeltaH: -166 kJ/mol. SDMech data computed.
    // {
        // reactantNames: [ "NO•", "N•" ], productNames: [ "N₂O" ],
        // reactantAngles:      [ 180,   0 ],
        // reactantAngleRanges: [ 180, 360 ],        
        // EActivation: 0.5, lifetimeActivated: 1000,
    // }, // DeltaH: -480 kJ/mol. Guessed EA
    { 
        reactantNames: [ "N•", "O•" ], productNames: [ "NO•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation: 0.5, lifetimeActivated: 1000,
    }, //DeltaH: -630 kJ/mol. Guessed EA
    {
        reactantNames: [ "NO•", "O•" ], productNames: [ "NO₂•" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:       [  90 ],
        EActivation: 0.5, lifetimeActivated: 1000,
    }, //DeltaH: -306 kJ/mol. Guessed EA
    {
        reactantNames: [ "NO₂•", "O•" ], productNames: [ "NO₃•" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [ 60 ],
        EActivation: 0.5, lifetimeActivated: 1000,
    }, //DeltaH: -209 kJ/mol. Guessed EA
    // {
        // reactantNames: [ "NO₃•", "NO₂•" ], productNames: [ "N₂O₅" ],
    // },
    
    // = = Oxygen radical transfer reactions. = = 
    {
        reactantNames: [ "NO₂•", "O•" ], productNames: [ "NO•", "O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 360 ],
        EActivation: 0.3, 
    }, //DeltaH: -192kJ/mol. SDMech data.
    {
        reactantNames: [ "NO₃•", "O•" ], productNames: [ "NO₂•", "O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 120, 360 ],
        EActivation: 0.5,
    },   //DeltaH: -289kJ/mol. Guessed EA
    // {
        // reactantNames: [ "N₂O", "O•" ], productNames: [ "NO•", "NO•" ],
        // reactantAngles:      [ 180,   0 ],
        // reactantAngleRanges: [ 180, 360 ],
        // productAngles:       [ 180, 180 ],
        // productAngleRanges:  [ 180, 180 ],
        // EActivation: 11.7,
    // },   //DeltaH: -150 kJ/mol SDMech data for EA
    // {
        // reactantNames: [ "N₂O", "O•" ], productNames: [ "N₂", "O₂" ],
        // reactantAngles:      [   0,   0 ],
        // reactantAngleRanges: [ 180, 360 ],
        // productAngles:       [   0,   0 ],
        // productAngleRanges:  [ 360, 360 ],
        // EActivation: 10.0, bDoReverse: false,
    // },  //DeltaH: -332 kJ/mol. Guessed EA. Ignore reverse pathway

    // Nitrogen radical transfer reactions.    
    { 
        reactantNames: [ "O₂", "N•" ], productNames: [ "O•", "NO•"  ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation:  2.6, // SDMech data.
    }, //DeltaH: -132 kJ/mol. Guessed EA.
    {
        reactantNames: [ "O₃", "N•" ], productNames: [ "O₂", "NO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation: 1.0
    }, //DeltaH: -523 kJ/mol. Guessed EA.
    { 
        reactantNames: [ "NO•", "N•" ],  productNames: [ "O•", "N₂" ], 
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 180 ],
        EActivation: 0.1,
    }, //DeltaH: -314 kJ/mol. SDMech data but reversed.
    { 
        reactantNames: [ "NO₂•", "N•" ],  productNames: [ "NO•", "NO•" ], 
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 0.1,
    }, //DeltaH: -324 kJ/mol. Guessed EA.
    { 
        reactantNames: [ "NO₃•", "N•" ],  productNames: [ "NO₂•", "NO•" ], 
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 240, 180 ],
        EActivation: 0.1,
    }, //DeltaH: -421 kJ/mol. Guessed EA. 
    // { 
        // reactantNames: [ "N₂O", "N•" ],  productNames: [ "N₂", "NO•" ], 
        // reactantAngles:      [   0,   0 ], 
        // reactantAngleRanges: [ 180, 360 ],
        // productAngles:       [   0,   0 ],
        // productAngleRanges:  [ 360, 180 ],
        // EActivation: 2.0, bDoReverse: false
    // }, //DeltaH: -464 kJ/mol. Guessed EA. Ignore reverse pathway
    // { 
        // reactantNames: [ "N₂O", "N•" ],  productNames: [ "NO•", "N₂" ], 
        // reactantAngles:      [ 180,   0 ], 
        // reactantAngleRanges: [ 180, 360 ],
        // productAngles:       [ 180,   0 ],
        // productAngleRanges:  [ 180, 360 ],
        // EActivation: 2.0, bDoReverse: false
    // }, //DeltaH: -464 kJ/mol. Guessed EA. Ignore reverse pathway  

    // Ozone transfer reactions.
    {
        reactantNames: [ "O₃", "NO•" ], productNames: [ "O₂", "NO₂•" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 240, 180 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation:  0.5, 
    }, //DeltaH: -199 kJ/mol. EA data from J.-W., 2010
    {
        reactantNames: [ "O₃", "NO₂•" ], productNames: [ "O₂", "NO₃•" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 240, 120 ],
        productAngles:       [   0,  60 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation:  0.9, // J.-W., 2010
    }, //DeltaH: -102 kJ/mol. EA data from J.-W., 2010
    
    // NO transfer reactions.
    // {
        // reactantNames: [ "N₂O", "NO•" ], productNames: [ "N₂", "NO₂•" ],
        // reactantAngles:      [   0, 180 ],
        // reactantAngleRanges: [ 180, 180 ],
        // productAngles:       [   0,   0 ],
        // productAngleRanges:  [ 360, 240 ],
        // EActivation:  10.0, bDoReverse: false
    // }, //DeltaH: -140 kJ/mol. Guessed EA. Ignore reverse pathway.
    {
        reactantNames: [ "NO•", "NO•" ], productNames: [ "N•", "NO₂•" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation:  32.5, bDoReverse: false
    }, //DeltaH: +324 kJ/mol. Guessed EA. Symmetry 2 from N radical above.
    {
        reactantNames: [ "NO₃•", "NO•" ], productNames: [ "NO₂•", "NO₂•" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 360, 180 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 120, 240 ],
        EActivation: 0.5,
    }, //DeltaH: -97 kJ/mol. Guessed EA. Symmetry 1
    {
        reactantNames: [ "NO₂•", "NO₂•" ], productNames: [ "NO•", "NO₃•" ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 240, 120 ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        EActivation: 10.2,
    }, //DeltaH: +97 kJ/mol. Guessed EA. Symmetry 2
    // {
        // reactantNames: [ "N₂O", "NO₂•" ], productNames: [ "N₂", "NO₃•" ],
        // reactantAngles:      [   0, 180 ],
        // reactantAngleRanges: [ 180, 120 ],
        // productAngles:       [   0,   0 ],
        // productAngleRanges:  [ 360, 360 ],
        // EActivation:  10.0, bDoReverse: false
    // }, //DeltaH: -43 kJ/mol. Guessed EA. Ignore reverse pathway.
    
    // Gaseous nitric acid not modelled as this pracitcally involves water droplets.
    //{  reactantNames: [ "N₂O₅", "H₂O" ], productNames: [ "HNO₃", "HNO₃" ] },
]


/*
    Combustion reaction models. Datasets of activation energies has been taken from the San Diego mechanism hosted by UC San Diego Combustion Research Group. Available at: http://web.eng.ucsd.edu/mae/groups/combustion/mechanism.html            
    Heat of formation dataset at 298 K are drawn from ANL: https://atct.anl.gov/Thermochemical%20Data/version%201.118/                
*/

/*
    Hydrogen and oxygen reaction chains. DeltaH_formation:
        H = 218 ; O = 249 ; H2O = -242 ; OH = 37
    This process is simplified to eliminate additional paths such as H₂O₂ (peroxide). For fuller descriptions, see e.g.:
    1.  Dougherty and Rabitz (1980), DOI: 10.1063/1.439114            
*/
globalVars.presetReactions[ "combustion - H2 and O2 basic" ] = [
    // Hydrogen direct decomposition and recombination.
    {
        reactantNames: ["H•", "H•"], productNames: ["H₂"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation: 0.0, lifetimeActivated: 1000,
    }, // DeltaH: -436  kJ/mol
    // Oxygen direct decomposition and recombination.
    {
        reactantNames: ["O•", "O•"], productNames: ["O₂"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation: 0.0, lifetimeActivated: 1000,
    }, // DeltaH: -498  kJ/mol
    // Water direct decomposition and recombination.
    {
        reactantNames: ["HO•", "H•"], productNames: ["H₂O"],
        EActivation: 0.0, lifetimeActivated: 1000,
        reactantAngles:      [   0,   0 ], // Filled with 0.0 if not given.
        reactantAngleRanges: [ 180, 360 ], // Filled with 360 if not given. 
    }, // DeltaH: -497  kJ/mol
    // OH radical direct decomposition and recombination.
    {
        reactantNames: ["O•", "H•"], productNames: ["HO•"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation: 0.0, DeltaH: -43.0, lifetimeActivated: 1000,
    }, // DeltaH: -430 kJ/mol
    {
        reactantNames: [ "HO•", "O•" ], productNames: [ "H•", "O₂" ],
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 180, 360 ],
        EActivation: 0.3,
    }, //  DeltaH: -68 kJ/mol
    // Radical propagation 2: oxygen and hydrogen molecule
    {
        reactantNames: [ "HO•", "H•" ], productNames: [  "O•", "H₂" ],
        reactantAngles:      [ 180,   0 ], 
        reactantAngleRanges: [ 180, 360 ],
        EActivation: 2.0,
    }, //  DeltaH: -6 kJ/mol
    //  Collision-based water formation 1. 
    {
        reactantNames: ["H₂", "HO•"], productNames: ["H•", "H₂O"],
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation:  1.5,
    }, //  DeltaH: -61 kJ/mol
    {
        reactantNames: ["HO•", "HO•"], productNames: [ "O•", "H₂O" ],
        reactantAngles:      [ 180,   0 ], 
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
        EActivation:  0.0,
    }, //  DeltaH: -67 kJ/mol, Symmetry 1.
    {
        reactantNames: ["HO•", "HO•"], productNames: [ "H₂O", "O•" ],
        reactantAngles:      [ 180,   0 ], 
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 240, 360 ],
        EActivation:  0.0, bDoReverse: false,
    },  //  DeltaH: -67 kJ/mol, Symmetry 2.
    // Self reaction of hydrogen molecule and radical. Not used.
    // Self reaction of oxygen  molecule and radical. Not used, as it goes to ozone.
]

/*    
    The advanced H2-O2 combustion Use San Diego Mechanism core reaction paths 1 to 21f. This adds the peroxide pathways that reduces HO• levels relative to the simplified pathways. Autoignition temperatures are also lower as alternative means of generating H• becomes available.
    Activation energies from SD Mech, DeltaH from general DeltaH @ 293K.    
    Source: http://web.eng.ucsd.edu/mae/groups/combustion/mechanism.html.
    
    Nice exploratory papers on hydrogen combustion include:
    - Li et al. (2004) DOI: 10.1002/kin.20026
    - Wang et al. (2022) DOI: 10.1016/j.fuel.2022.123705    
*/
globalVars.presetReactions[ "combustion - H2 and O2 advanced" ] = [
    {
        reactantNames: [ "HO•", "HO•" ], productNames: [ "H₂O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        EActivation:  0.0, lifetimeActivated: 1000,
    }, //  DeltaH: -209 kJ/mol
    {
        reactantNames: [ "HO•", "O•" ], productNames: [ "HO₂•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 225 ],
        EActivation:  0.0, lifetimeActivated: 1000, bDoReverse: false,
    },  // DeltaH: -274 kJ/mol. Can happen if high energy.
    {
        reactantNames: [ "O₂", "H•" ], productNames: [ "HO₂•" ],
        reactantAngles:      [   0,    0 ], 
        reactantAngleRanges: [ 360,  360 ],
        productAngles:  [ 45 ],
        EActivation:  0.0, lifetimeActivated: 1000,
    },  // DeltaH: -206 kJ/mol. Preferred pathway.  
    {
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "HO•", "HO•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 180 ], 
        EActivation:  0.2,
    }, // DeltaH: -156 kJ/mol. In competition with peroxide synthesis, so place this lower down.
    {
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "O₂", "H₂" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 0.3,
    }, // DeltaH: -230 kJ/mol. NB: Alternate hydrogen radical production pathway with lower energy and no radical.
    { 
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "H₂O", "O•" ],
        reactantAngles:      [ 120,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 360 ],        
        EActivation:  0.7, angleReactionOffset: 240,
    }, //  DeltaH: -223 kJ/mol. NB: Alternate hydrogen radical production pathway with lower energy and O radical.
    { 
        reactantNames: [ "HO₂•", "O•" ], productNames: [ "O₂", "HO•" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 180 ],        
        EActivation: 0.0,
    }, // DeltaH: -224 kJ/mol 
    { 
        reactantNames: [ "HO₂•", "HO•" ], productNames: [ "O₂", "H₂O" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],        
        EActivation: 4.6,
    }, // DeltaH: -291 kJ/mol 
    { 
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "O₂", "H₂O₂" ],
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0,  45 ],
        productAngleRanges:  [ 360,  90 ],
        EActivation: 4.6, bDoReverse: false,
    }, // DeltaH: -159 kJ/mol. Symmetry 1-1
    { 
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "H₂O₂", "O₂" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [  45,   0 ],
        productAngleRanges:  [  90, 360 ],
        EActivation: 4.6,
    },  // DeltaH: -159 kJ/mol. Symmetry 2-1
    { 
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "H₂O₂", "O₂" ],
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [ 225,   0 ],
        productAngleRanges:  [  90, 360 ],
        EActivation: 4.6, bDoForward: false,
    },  // DeltaH: -159 kJ/mol. Symmetry 1-2    
    { 
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 360 ],        
        EActivation: 3.3,
    }, // DeltaH: -71 kJ/mol. Symmetry 1
    { 
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 360 ],        
        EActivation: 3.3, bDoReverse: false,
    }, // DeltaH: -71 kJ/mol. Symmetry 2    
    { 
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "H₂O", "HO•" ],
        reactantAngles:      [ 135,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 180 ],
        angleReactionOffset: 45, EActivation: 1.5,
    }, // DeltaH: -288 kJ/mol. Symmetry 1. Knock on reaction modelled by transfer reaction with rotation.
    { 
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "H₂O", "HO•" ],
        reactantAngles:      [ 315,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 180 ],
        angleReactionOffset: 45, EActivation: 1.5, bDoReverse: false,
    }, // DeltaH: -288 kJ/mol. Symmetry 2. Knock on reaction modelled by transfer reaction with rotation.

    { 
        reactantNames: [ "H₂O₂", "O•" ], productNames: [ "HO₂•", "HO•" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 120, 180 ],
        EActivation: 1.7,
    }, // DeltaH: -65 kJ/mol. Direct impact version symmetry 1.
    { 
        reactantNames: [ "H₂O₂", "O•" ], productNames: [ "HO₂•", "HO•" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 120, 180 ],
        EActivation: 1.7, bDoReverse: false
    }, // DeltaH: -65 kJ/mol. Direct impact version symmetry 2.
    { 
        reactantNames: [ "H₂O₂", "HO•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 120, 240 ],                
        EActivation: 3.0,
    }, // DeltaH: -132 kJ/mol. Symmetry 1.
    { 
        reactantNames: [ "H₂O₂", "HO•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 120, 240 ],
        EActivation: 3.0,  bDoReverse: false,
    }, // DeltaH: -132 kJ/mol. Symmetry 2.
]

/*
    Additional Reactions involving N2OX species.
    List of DeltaH as follows:
    - NO•: 91, NO₂•: 34, NO₃•: 74
    - N₂O: 83, N₂O₂: 171, N₂O₃: 86, N₂O₄: 11, ONONO₂: 52, N₂O₅: 15
*/
globalVars.presetReactions[ "NOX expanded reactions" ] = [
        
    // Synthesis & decomposition reactions.
    {
        reactantNames: ["NO₃•", "NO₂•"], productNames: ["N₂O₅"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  120 ],
        EActivation: 0.5, lifetimeActivated: 1000,
    }, // DeltaH: -93 kJ/mol, guessed EA.
    {
        reactantNames: ["NO₂•", "NO₂•"], productNames: ["ONONO₂"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  120 ],
        bDoForward: false,
        EActivation: 3.0, lifetimeActivated: 1000,
    }, // DeltaH: -16 kJ/mol, guessed EA.    
    {
        reactantNames: ["NO₂•", "NO•"], productNames: ["N₂O₃"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 120,  180 ],
        EActivation: 1.0, lifetimeActivated: 1000,
    }, // DeltaH: -39 kJ/mol, guessed EA.
    {
        reactantNames: ["NO•", "NO•"], productNames: ["N₂O₂"],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 180,  180 ],
        EActivation: 3.0, lifetimeActivated: 1000,
    } // DeltaH: -11 kJ/mol, guessed EA.
    
    // Transfer reactions with oxygen radicals and molecules.
    // {
        // reactantNames: ["N₂O₂", "O₂"], productNames: ["NO₂•","NO₂•"],
        // reactantAngles: [   0,    0 ], reactantAngleRanges: [ 180,  180 ],
        // EActivation: 2.0, lifetimeActivated: 1000,
    // },
    // {
        // reactantNames: ["N₂O₅", "NO•"], productNames: ["ONONO₂","NO₂•"],
        // reactantAngles: [   0,    0 ], reactantAngleRanges: [ 180,  180 ],
        // EActivation: 2.0, lifetimeActivated: 1000,
    // }, // N2O5 & NO decay pathway.


    
]

/*    
    The methane combustion pathway involves many species and hundreds of individual reactions. For a nice review on how complex fluid dynamics are used to model combustion, see Zettervall et al. (2021), DOI: 10.3390/fuels2020013 
    
    The reaction equations will use the DRM22 model as the basis, see: http://combustion.berkeley.edu/drm/ . The singlet/triple state of CH2 is further reduced to just the triplet state. This is composed of the following species:
    H2, H, O, O2, OH, H2O, HO2, H2O2, CH2(T)/CH2(S), CH3, CH4, CO, CO2, HCO, CH2O, CH3O, C2H2, C2H3, C2H4, C2H5, C2H6.

    NB: Reference units of Ea is in cal/mol.
    NB: Effects of adding ozone can be incorporated by considering Sun et al. (2019), DOI: 10.1016/j.pecs.2019.02.002
    NB: Effects of adding in ammonia can be incoporated by considering Wang et al. (2023), 10.1016/j.fuel.2022.125806    
*/

globalVars.presetReactions[ "combustion - hydrocarbon (DRM22)" ] = [    
    // O+H+M<=>OH+M                             5.000E+17   -1.000      0.00
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "O•", "H•" ], productNames: [ "HO•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation:  0.0, lifetimeActivated: 1000
    },
    // O+H2<=>H+OH                              5.000E+04    2.670   6290.00
    {
        reactantNames:  [ "HO•", "H•" ], productNames: [  "O•", "H₂" ],
        reactantAngles: [ 180, 0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation: 2.63,
    },
    // O+HO2<=>OH+O2                            2.000E+13    0.000      0.00               
    {
        reactantNames:  [ "HO₂•", "O•" ], productNames: [  "HO•", "O₂" ],
        reactantAngles: [ 0, 0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation: 0.0,
    },
    // O+CH2<=>H+HCO                            8.000E+13    0.000      0.00
    // O+CH2(S)<=>H+HCO                         1.500E+13    0.000      0.00
    {
        reactantNames:  [ "CH₂•", "O•" ], productNames: [  "H•", "HCO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 180 ],
        EActivation: 0.0,
    },
    // O+CH3<=>H+CH2O                           8.430E+13    0.000      0.00
    {
        reactantNames:  [ "CH₃•", "O•" ], productNames: [  "H•", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation: 0.0,
    },
    // O+CH4<=>OH+CH3                           1.020E+09    1.500   8600.00
    {
        reactantNames:  [ "CH₄", "O•" ], productNames: [  "HO•", "CH₃•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation: 3.60, // DeltaH: +9 kJ/mol
    },    
    // O+CO+M<=>CO2+M                           6.020E+14    0.000   3000.00    
    // H2/2.00/ O2/6.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/3.50/ C2H6/3.00/ AR/0.50/       
    {
        reactantNames:  [ "CO", "O•" ], productNames: [ "CO₂" ],
        reactantAngles: [ 0, 0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  1.26, lifetimeActivated: 1000
    },
    // O+HCO<=>OH+CO                            3.000E+13    0.000      0.00
    {
        reactantNames:  [ "HCO•", "O•" ], productNames: [ "CO", "HO•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.0,
    },
    // O+HCO<=>H+CO2                            3.000E+13    0.000      0.00
    {
        reactantNames:  [ "HCO•", "O•" ], productNames: [ "H•", "CO₂"  ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation: 0.0,
    },
    // O+CH2O<=>OH+HCO                          3.900E+13    0.000   3540.00
    {
        reactantNames:  [ "CH₂O", "O•" ], productNames: [ "HCO•", "HO•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 240, 360 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 240, 180 ],
        EActivation: 1.48,
    },
    // O+C2H2<=>CH2(S)+CO                       1.020E+07    2.000   1900.00
    // O+C2H2<=>CO+CH2                          1.020E+07    2.000   1900.00
    {
        reactantNames:  [ "C₂H₂", "O•" ], productNames: [ "CH₂•", "CO" ],
        reactantAngles: [  90,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.79,
    },
    {
        reactantNames:  [ "C₂H₂", "O•" ], productNames: [ "CH₂•", "CO" ],
        reactantAngles: [ 270,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.79, bDoReverse: false,
    },
    // O+C2H4<=>CH3+HCO                         1.920E+07    1.830    220.00
    {
        reactantNames:  [ "C₂H₄", "O•" ], productNames: [ "CH₃•", "HCO•" ],
        reactantAngles: [  90,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 180 ],
        EActivation: 0.09,
    },
    {
        reactantNames:  [ "C₂H₄", "O•" ], productNames: [ "CH₃•", "HCO•" ],
        reactantAngles: [  270,  0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 180 ],
        EActivation: 0.09, bDoReverse: false,
    },
    // O+C2H5<=>CH3+CH2O                        1.320E+14    0.000      0.00
    {
        reactantNames:  [ "C₂H₅•", "O•" ], productNames: [ "CH₃•", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation: 0.0,
    },
    // O+C2H6<=>OH+C2H5                         8.980E+07    1.920   5690.00
    {
        reactantNames:  [ "C₂H₆", "O•" ], productNames: [ "C₂H₅•", "HO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 2.38,
    },
    // O2+CO<=>O+CO2                            2.500E+12    0.000  47800.00
    {
        reactantNames:  [ "O₂", "CO" ], productNames: [ "O•", "CO₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation: 20.00,
    },
    // O2+CH2O<=>HO2+HCO                        1.000E+14    0.000  40000.00               
    {
        reactantNames:  [ "CH₂O", "O₂" ], productNames: [ "HCO•", "HO₂•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 240, 360 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 16.74, // DeltaH: +163 kJ/mol
    },
    // H+O2+M<=>HO2+M                           2.800E+18   -0.860      0.00
    // O2/0.00/ H2O/0.00/ CO/0.75/ CO2/1.50/ C2H6/1.50/ N2/0.00/ AR/0.00/
    // H+2O2<=>HO2+O2                           3.000E+20   -1.720      0.00
    // H+O2+H2O<=>HO2+H2O                       9.380E+18   -0.760      0.00           
    // H+O2+N2<=>HO2+N2                         3.750E+20   -1.720      0.00           
    // H+O2+AR<=>HO2+AR                         7.000E+17   -0.800      0.00               
    {
        reactantNames:  [ "O₂", "H•" ], productNames: [ "HO₂•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],        
        EActivation: 0.0, lifetimeActivated: 1000
    },
    // H+O2<=>O+OH                              8.300E+13    0.000  14413.00           
    {
        reactantNames:  [ "O₂", "H•" ], productNames: [ "O•", "HO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 180 ],
        EActivation: 6.80, bDoForward: false, // Skip the forward reaction.
    },
    // 2H+M<=>H2+M                              1.000E+18   -1.000      0.00 
    // H2/0.00/ H2O/0.00/ CH4/2.00/ CO2/0.00/ C2H6/3.00/ AR/0.63/                      
    // 2H+H2<=>2H2                              9.000E+16   -0.600      0.00           
    // 2H+H2O<=>H2+H2O                          6.000E+19   -1.250      0.00           
    // 2H+CO2<=>H2+CO2                          5.500E+20   -2.000      0.00               
    {
        reactantNames: [ "H•", "H•" ], productNames: [ "H₂" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:  0.0, lifetimeActivated: 1000
    },
    // H+OH+M<=>H2O+M                           2.200E+22   -2.000      0.00
    // H2/0.73/ H2O/3.65/ CH4/2.00/ C2H6/3.00/ AR/0.38/
    {
        reactantNames: [ "HO•", "H•" ], productNames: [ "H₂O" ],
        reactantAngles: [ 0, 0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  0.0, lifetimeActivated: 1000
    },
    // H+HO2<=>O2+H2                            2.800E+13    0.000   1068.00
    {
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "O₂", "H₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation:  0.45,
    },
    // H+HO2<=>2OH                              1.340E+14    0.000    635.00
    {
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "HO•", "HO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation:  0.27,
    },
    // H+H2O2<=>HO2+H2                          1.210E+07    2.000   5200.00
    {
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles: [  45,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  2.17,
    },
    {
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles: [ 225,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  2.17, bDoReverse: false
    },
    // H+CH2(+M)<=>CH3(+M)                      2.500E+16   -0.800      0.00
         // LOW  /  3.200E+27   -3.140   1230.00/                                      
         // TROE/  0.6800   78.00  1995.00  5590.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "CH₂•", "H•" ], productNames: [ "CH₃•" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:  0.0, lifetimeActivated: 1000
    },
    // H+CH3(+M)<=>CH4(+M)                      1.270E+16   -0.630    383.00           
         // LOW  /  2.477E+33   -4.760   2440.00/                                      
         // TROE/  0.7830   74.00  2941.00  6964.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "CH₃•", "H•" ], productNames: [ "CH₄" ],
        reactantAngles: [   0,    0 ], reactantAngleRanges: [ 360,  360 ],
        EActivation:  0.16, lifetimeActivated: 1000
    },
    // H+CH4<=>CH3+H2                           6.600E+08    1.620  10840.00
    {
        reactantNames: [ "CH₄", "H•" ], productNames: [ "CH₃•", "H₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation:  4.54,
    },
    // H+HCO(+M)<=>CH2O(+M)                     1.090E+12    0.480   -260.00           
         // LOW  /  1.350E+24   -2.570   1425.00/                                      
         // TROE/  0.7824  271.00  2755.00  6570.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "HCO•", "H•" ], productNames: [ "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  0.0, lifetimeActivated: 1000
    },
    // H+HCO<=>H2+CO                            7.340E+13    0.000      0.00
    {
        reactantNames: [ "HCO•", "H•" ], productNames: [ "CO", "H₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  0.0, // Slight change in reverse collision geometry to allow room for H2CO formation.
    },
    // H+CH2O(+M)<=>CH3O(+M)                    5.400E+11    0.454   2600.00           
         // LOW  /  2.200E+30   -4.800   5560.00/                                      
         // TROE/  0.7580   94.00  1555.00  4200.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/
    {
        reactantNames: [ "CH₂O", "H•" ], productNames: [ "CH₃O•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 120, 360 ],
        EActivation:  1.09, lifetimeActivated: 1000
    },
    // H+CH2O<=>HCO+H2                          2.300E+10    1.050   3275.00
    {
        reactantNames: [ "CH₂O", "H•" ], productNames: [ "HCO•", "H₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 240, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  1.37,
    },
    // H+CH3O<=>OH+CH3                          3.200E+13    0.000      0.00
    {
        reactantNames: [ "CH₃O•", "H•" ], productNames: [ "CH₃•", "HO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 180 ],
        EActivation:  0.0,
    },
    // H+C2H2(+M)<=>C2H3(+M)                    5.600E+12    0.000   2400.00           
         // LOW  /  3.800E+40   -7.270   7220.00/                                      
         // TROE/  0.7507   98.50  1302.00  4167.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "C₂H₂", "H•" ], productNames: [ "C₂H₃•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        EActivation:  1.00, lifetimeActivated: 1000
    },
    // H+C2H3(+M)<=>C2H4(+M)                    6.080E+12    0.270    280.00           
         // LOW  /  1.400E+30   -3.860   3320.00/                                      
         // TROE/  0.7820  207.50  2663.00  6095.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "C₂H₃•", "H•" ], productNames: [ "C₂H₄" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  0.12, lifetimeActivated: 1000
    },
    // H+C2H3<=>H2+C2H2                         3.000E+13    0.000      0.00
    {
        reactantNames: [ "C₂H₃•", "H•" ], productNames: [ "C₂H₂", "H₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation:  0.0,
    },
    // H+C2H4(+M)<=>C2H5(+M)                    1.080E+12    0.454   1820.00           
         // LOW  /  1.200E+42   -7.620   6970.00/                                      
         // TROE/  0.9753  210.00   984.00  4374.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "C₂H₄", "H•" ], productNames: [ "C₂H₅•" ],
        reactantAngles: [  90,   0 ], reactantAngleRanges: [  90, 360 ],
        EActivation:  0.76, lifetimeActivated: 1000
    },
    {
        reactantNames: [ "C₂H₄", "H•" ], productNames: [ "C₂H₅•" ],
        reactantAngles: [ 270,   0 ], reactantAngleRanges: [  90, 360 ],
        EActivation:  0.76, lifetimeActivated: 1000, bDoReverse: false
    },    
    // H+C2H4<=>C2H3+H2                         1.325E+06    2.530  12240.00
    {
        reactantNames: [ "C₂H₄", "H•" ], productNames: [ "C₂H₃•", "H₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  5.12,
    },
    {
        reactantNames: [ "C₂H₄", "H•" ], productNames: [ "C₂H₃•", "H₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  5.12, bDoReverse: false
    },
    // H+C2H5(+M)<=>C2H6(+M)                    5.210E+17   -0.990   1580.00           
         // LOW  /  1.990E+41   -7.080   6685.00/                                      
         // TROE/  0.8422  125.00  2219.00  6882.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "C₂H₅•", "H•" ], productNames: [ "C₂H₆" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  0.66, lifetimeActivated: 1000
    },
    // H+C2H6<=>C2H5+H2                         1.150E+08    1.900   7530.00
    {
        reactantNames: [ "C₂H₆", "H•" ], productNames: [ "C₂H₅•", "H₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  3.15,
    },
    // H2+CO(+M)<=>CH2O(+M)                     4.300E+07    1.500  79600.00
         // LOW  /  5.070E+27   -3.420  84350.00/                                      
         // TROE/  0.9320  197.00  1540.00 10300.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "H₂", "CO" ], productNames: [ "CH₂O" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 360, 180 ],
        EActivation: 33.3, lifetimeActivated: 1000, bDoReverse: false
    },
    // OH+H2<=>H+H2O                            2.160E+08    1.510   3430.00
    {
        reactantNames: [ "H₂", "HO•" ], productNames: [ "H•", "H₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation:  1.43,
    },
    // 2OH(+M)<=>H2O2(+M)                       7.400E+13   -0.370      0.00           
         // LOW  /  2.300E+18   -0.900  -1700.00/                                      
         // TROE/  0.7346   94.00  1756.00  5182.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "HO•", "HO•" ], productNames: [ "H₂O₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 180 ],
        EActivation:  0.0, lifetimeActivated: 1000,
    },
    // 2OH<=>O+H2O                              3.570E+04    2.400  -2110.00
    {
        reactantNames: [ "HO•", "HO•" ], productNames: [ "O•", "H₂O" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation:  0.0,
    },
    {
        reactantNames: [ "HO•", "HO•" ], productNames: [ "H₂O", "O•" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 240, 360 ],
        EActivation:  0.0, bDoReverse: false
    },
    // OH+HO2<=>O2+H2O                          2.900E+13    0.000   -500.00
    {
        reactantNames: [ "HO₂•", "HO•" ], productNames: [ "O₂", "H₂O" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation:  0.0,
    },
    // OH+H2O2<=>HO2+H2O                        5.800E+14    0.000   9560.00
    {
        reactantNames: [ "H₂O₂", "HO•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles: [  45,   0 ], reactantAngleRanges: [  90, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 240 ],
        EActivation:  4.00,
    },
    {
        reactantNames: [ "H₂O₂", "HO•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles: [ 225,   0 ], reactantAngleRanges: [  90, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 240 ],
        EActivation:  4.00, bDoReverse: false
    },
    // OH+CH2<=>H+CH2O                          2.000E+13    0.000      0.00
    // OH+CH2(S)<=>H+CH2O                       3.000E+13    0.000      0.00
    {
        reactantNames: [ "HO•", "CH₂•" ], productNames: [ "H•", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 120 ],
        EActivation:  0.0,
    },
    // OH+CH3<=>CH2+H2O                         5.600E+07    1.600   5420.00           
    // OH+CH3<=>CH2(S)+H2O                      2.501E+13    0.000      0.00
    {
        reactantNames: [ "CH₃•", "HO•" ], productNames: [ "CH₂•", "H₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 240 ],
        EActivation:  2.26,
    },
    // OH+CH4<=>CH3+H2O                         1.000E+08    1.600   3120.00
    {
        reactantNames: [ "CH₄", "HO•" ], productNames: [ "CH₃•", "H₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 240 ],
        EActivation:  1.31,
    },
    // OH+CO<=>H+CO2                            4.760E+07    1.228     70.00
    {
        reactantNames: [ "HO•", "CO" ], productNames: [ "H•", "CO₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation:  0.03,
    },
    // OH+HCO<=>H2O+CO                          5.000E+13    0.000      0.00
    {
        reactantNames: [ "HCO•", "HO•" ], productNames: [ "H₂O", "CO" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 240, 180 ],
        EActivation:  0.0,
    },
    // OH+CH2O<=>HCO+H2O                        3.430E+09    1.180   -447.00
    {
        reactantNames: [ "CH₂O", "HO•" ], productNames: [ "H₂O", "HCO•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 240, 180 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 240, 180 ],
        EActivation:  0.0,
    },
    // OH+C2H2<=>CH3+CO                         4.830E-04    4.000  -2000.00
    {
        reactantNames: [ "C₂H₂", "HO•" ], productNames: [ "CH₃•", "CO" ],
        reactantAngles: [  90,  90 ], reactantAngleRanges: [  90,  90 ],
        productAngles:  [   0,  90 ], productAngleRanges:  [ 360, 180 ],
        angleReactionOffset:  90,
        EActivation:  0.0, bDoReverse: false // Make inverse reaction unlikely due to energy diff.
    },
    {
        reactantNames: [ "C₂H₂", "HO•" ], productNames: [ "CH₃•", "CO" ],
        reactantAngles: [ 270,  90 ], reactantAngleRanges: [  90,  90 ],
        productAngles:  [   0,  90 ], productAngleRanges:  [ 360, 180 ],
        angleReactionOffset:  90,
        EActivation:  0.0, bDoReverse: false // Make inverse reaction unlikely due to energy diff.
    },
    {
        reactantNames: [ "C₂H₂", "HO•" ], productNames: [ "CH₃•", "CO" ],
        reactantAngles: [  90, 270 ], reactantAngleRanges: [  90,  90 ],
        productAngles:  [   0, 270 ], productAngleRanges:  [ 360, 180 ],
        angleReactionOffset: 270,
        EActivation:  0.0, bDoReverse: false // Make inverse reaction unlikely due to energy diff.
    },
    {
        reactantNames: [ "C₂H₂", "HO•" ], productNames: [ "CH₃•", "CO" ],
        reactantAngles: [ 270, 270 ], reactantAngleRanges: [  90,  90 ],
        productAngles:  [   0, 270 ], productAngleRanges:  [ 360, 180 ],
        angleReactionOffset: 270,
        EActivation:  0.0, bDoReverse: false // Make inverse reaction unlikely due to energy diff.
    },
    // OH+C2H3<=>H2O+C2H2                       5.000E+12    0.000      0.00
    {
        reactantNames: [ "HO•", "C₂H₃•" ], productNames: [ "H₂O", "C₂H₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180,  90 ], productAngleRanges:  [ 240,  90 ],
        EActivation:  0.0,
    },
    {
        reactantNames: [ "HO•", "C₂H₃•" ], productNames: [ "H₂O", "C₂H₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180, 270 ], productAngleRanges:  [ 240,  90 ],
        EActivation:  0.0, bDoForward: false
    },
    // OH+C2H4<=>C2H3+H2O                       3.600E+06    2.000   2500.00
    {
        reactantNames: [ "HO•", "C₂H₄" ], productNames: [ "H₂O", "C₂H₃•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 240, 180 ],
        EActivation: 1.05,
    },
    // OH+C2H6<=>C2H5+H2O                       3.540E+06    2.120    870.00
    {
        reactantNames: [ "HO•", "C₂H₆" ], productNames: [ "H₂O", "C₂H₅•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 240, 180 ],
        EActivation: 0.36,
    },
    // 2HO2<=>O2+H2O2                           1.300E+11    0.000  -1630.00           
     // DUPLICATE                                                                      
    // 2HO2<=>O2+H2O2                           4.200E+14    0.000  12000.00           
     // DUPLICATE
    { 
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "O₂", "H₂O₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0,  45 ], productAngleRanges:  [ 360,  90 ],
        EActivation: 5.02, bDoReverse: false,
    },
    { 
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "H₂O₂", "O₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [  45,   0 ], productAngleRanges:  [  90, 360 ],
        EActivation: 5.02,
    },
    {
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "H₂O₂", "O₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 225,   0 ], productAngleRanges:  [  90, 360 ],
        EActivation: 5.02, bDoForward: false,
    },
    // HO2+CH2<=>OH+CH2O                        2.000E+13    0.000      0.00
    {
        reactantNames: [ "HO₂•", "CH₂•" ], productNames: [ "HO•", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.0,
    },
    // HO2+CH3<=>O2+CH4                         1.000E+12    0.000      0.00
    {
        reactantNames: [ "HO₂•", "CH₃•" ], productNames: [ "O₂", "CH₄" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation: 0.0,
    },
    // HO2+CH3<=>OH+CH3O                        2.000E+13    0.000      0.00
    {
        reactantNames: [ "HO₂•", "CH₃•" ], productNames: [ "HO•", "CH₃O•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.0,
    },
    // HO2+CO<=>OH+CO2                          1.500E+14    0.000  23600.00
    {
        reactantNames: [ "HO₂•", "CO" ], productNames: [ "HO•", "CO₂" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation: 9.87,
    },
    // HO2+CH2O<=>HCO+H2O2                      1.000E+12    0.000   8000.00
    {
        reactantNames: [ "CH₂O", "HO₂•" ], productNames: [ "HCO•", "H₂O₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180,  45 ], productAngleRanges:  [ 180,  90 ],
        EActivation: 3.35,
    },
    {
        reactantNames: [ "CH₂O", "HO₂•" ], productNames: [ "HCO•", "H₂O₂" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [ 180, 225 ], productAngleRanges:  [ 180,  90 ],
        EActivation: 3.35, bDoForward: false
    },
    // CH2+O2<=>OH+HCO                          1.320E+13    0.000   1500.00
    {
        reactantNames: [ "O₂", "CH₂•" ], productNames: [ "HO•", "HCO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.63,
    },
    // CH2(S)+O2<=>CO+H2O                       1.200E+13    0.000      0.00
    {
        reactantNames: [ "O₂", "CH₂•" ], productNames: [ "H₂O", "CO" ],
        reactantAngles: [   0, 180 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 120, 240 ],
        EActivation: 0.0,
    },
    // CH2+H2<=>H+CH3                           5.000E+05    2.000   7230.00
    // CH2(S)+H2<=>CH3+H                        7.000E+13    0.000      0.00    
    {
        reactantNames: [ "H₂", "CH₂•" ], productNames: [ "H•", "CH₃•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation: 3.03,
    },
    // 2CH2<=>H2+C2H2                           3.200E+13    0.000      0.00
    {
        reactantNames: [ "CH₂•", "CH₂•" ], productNames: [ "H₂", "C₂H₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0,  90 ], productAngleRanges:  [ 360, 90 ],
        angleReactionOffset:  90,        
        EActivation: 0.0,
    },
    {
        reactantNames: [ "CH₂•", "CH₂•" ], productNames: [ "H₂", "C₂H₂" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 180 ],
        productAngles:  [   0, 270 ], productAngleRanges:  [ 360, 90 ],
        angleReactionOffset:  90,
        EActivation: 0.0, bDoForward: false
    },
    // CH2+CH3<=>H+C2H4                         4.000E+13    0.000      0.00
    // CH2(S)+CH3<=>H+C2H4                      1.200E+13    0.000   -570.00    
    {
        reactantNames: [ "CH₂•", "CH₃•" ], productNames: [ "H•", "C₂H₄" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0,  90 ], productAngleRanges:  [ 360, 90 ],
        angleReactionOffset:  90,        
        EActivation: 0.0,
    },    
    {
        reactantNames: [ "CH₂•", "CH₃•" ], productNames: [ "H•", "C₂H₄" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0, 270 ], productAngleRanges:  [ 360, 90 ],
        angleReactionOffset:  90,        
        EActivation: 0.0, bDoForward: false
    },    
    // CH2+CH4<=>2CH3                           2.460E+06    2.000   8270.00
    // CH2(S)+CH4<=>2CH3                        1.600E+13    0.000   -570.00
    // CH2(S)+CH4<=>2CH3                        1.600E+13    0.000   -570.00               
    {
        reactantNames: [ "CH₄", "CH₂•" ], productNames: [ "CH₃•", "CH₃•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 360 ],
        EActivation: 3.46, bDoReverse: false // Avoid clashing with C2H6 formation.
    },
    // CH2(S)+CO2<=>CO+CH2O                     1.400E+13    0.000      0.00    
    {
        reactantNames: [ "CO₂", "CH₂•" ], productNames: [ "CO", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 180 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 0.0,
    },
    // = = Ignore below reactions
    // CH2(S)+N2<=>CH2+N2                       1.500E+13    0.000    600.00    
    // CH2(S)+AR<=>CH2+AR                       9.000E+12    0.000    600.00
    // CH2(S)+H2O<=>CH2+H2O                     3.000E+13    0.000      0.00
    // CH2(S)+CO<=>CH2+CO                       9.000E+12    0.000      0.00
    // CH2(S)+CO2<=>CH2+CO2                     7.000E+12    0.000      0.00               
    // CH2(S)+O2<=>H+OH+CO                      2.800E+13    0.000      0.00
    // = = Ignore Above reactions = =     
    // CH3+O2<=>O+CH3O                          2.675E+13    0.000  28800.00
    {
        reactantNames: [ "O₂", "CH₃•" ], productNames: [ "O•", "CH₃O•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 360, 180 ],
        EActivation: 12.50, bDoForward: false // DeltaH: +125 kJ/mol. Outcompeted with no 2D symmetry left.
    },
    // CH3+O2<=>OH+CH2O                         3.600E+10    0.000   8940.00
    {
        reactantNames: [ "O₂", "CH₃•" ], productNames: [ "HO•", "CH₂O" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 180 ],
        EActivation: 3.74,
    },
    // CH3+H2O2<=>HO2+CH4                       2.450E+04    2.470   5180.00
    {
        reactantNames: [ "H₂O₂", "CH₃•" ], productNames: [ "HO₂•", "CH₄" ],
        reactantAngles: [  45,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation: 2.17,
    },
    {
        reactantNames: [ "H₂O₂", "CH₃•" ], productNames: [ "HO₂•", "CH₄" ],
        reactantAngles: [ 225,   0 ], reactantAngleRanges: [  90, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation: 2.17, bDoReverse: false
    },    
    // 2CH3(+M)<=>C2H6(+M)                      2.120E+16   -0.970    620.00           
         // LOW  /  1.770E+50   -9.670   6220.00/                                      
         // TROE/  0.5325  151.00  1038.00  4970.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "CH₃•", "CH₃•" ], productNames: [ "C₂H₆" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        EActivation:  0.26, lifetimeActivated: 1000,
    },
    // 2CH3<=>H+C2H5                            4.990E+12    0.100  10600.00
    {
        reactantNames: [ "CH₃•", "CH₃•" ], productNames: [ "H•","C₂H₅•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 180 ],
        EActivation:  4.6, bDoForward: false // DeltaH: 46 kJ/mol . Outcompeted by above.
    },
    // CH3+HCO<=>CH4+CO                         2.648E+13    0.000      0.00
    {
        reactantNames: [ "HCO•", "CH₃•" ], productNames: [ "CO", "CH₄" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  0.0,
    },
    // CH3+CH2O<=>HCO+CH4                       3.320E+03    2.810   5860.00
    {
        reactantNames: [ "CH₂O", "CH₃•" ], productNames: [ "HCO•", "CH₄" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  2.45,
    },
    // CH3+C2H4<=>C2H3+CH4                      2.270E+05    2.000   9200.00
    {
        reactantNames: [ "C₂H₄", "CH₃•" ], productNames: [ "C₂H₃•", "CH₄" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  3.85,
    },
    // CH3+C2H6<=>C2H5+CH4                      6.140E+06    1.740  10450.00               
    {
        reactantNames: [ "C₂H₆", "CH₃•" ], productNames: [ "C₂H₅•", "CH₄" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 360, 360 ],
        productAngles:  [   0,   0 ], productAngleRanges:  [ 180, 360 ],
        EActivation:  4.37,
    },
    // HCO+H2O<=>H+CO+H2O                       2.244E+18   -1.000  17000.00
    // HCO+M<=>H+CO+M                           1.870E+17   -1.000  17000.00           
    // H2/2.00/ H2O/0.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/                      
    {
        reactantNames: [ "CO", "H•" ], productNames: [ "HCO•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        EActivation:  7.11, lifetimeActivated: 1000,
    },    
    // HCO+O2<=>HO2+CO                          7.600E+12    0.000    400.00
    {
        reactantNames: [ "HCO•", "O₂" ], productNames: [ "CO", "HO₂•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation:  0.17,
    },
    // CH3O+O2<=>HO2+CH2O                       4.280E-13    7.600  -3530.00
    {
        reactantNames: [ "CH₃O•", "O₂" ], productNames: [ "CH₂O", "HO₂•" ],
        reactantAngles: [ 180,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [ 180, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation:  0.0,
    },    
    // C2H3+O2<=>HCO+CH2O                       3.980E+12    0.000   -240.00
    {
        reactantNames: [ "C₂H₃•", "O₂" ], productNames: [ "CH₂O", "HCO•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 180, 180 ],
        EActivation:  0.0,
    },    
    // C2H4(+M)<=>H2+C2H2(+M)                   8.000E+12    0.440  88770.00           
         // LOW  /  7.000E+50   -9.310  99860.00/                                      
         // TROE/  0.7345  180.00  1035.00  5417.00 /                                  
    // H2/2.00/ H2O/6.00/ CH4/2.00/ CO/1.50/ CO2/2.00/ C2H6/3.00/ AR/0.70/
    {
        reactantNames: [ "C₂H₂", "H₂" ], productNames: [ "C₂H₄" ],
        reactantAngles: [ 90,   0 ], reactantAngleRanges: [ 90, 360 ],
        EActivation: 37.14, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "C₂H₂", "H₂" ], productNames: [ "C₂H₄" ],
        reactantAngles: [ 270,   0 ], reactantAngleRanges: [ 90, 360 ],
        EActivation: 37.14, lifetimeActivated: 1000, bDoReverse: false
    },
    // C2H5+O2<=>HO2+C2H4                       8.400E+11    0.000   3875.00
    {
        reactantNames: [ "C₂H₅•", "O₂" ], productNames: [ "C₂H₄", "HO₂•" ],
        reactantAngles: [   0,   0 ], reactantAngleRanges: [ 180, 360 ],
        productAngles:  [   0, 180 ], productAngleRanges:  [ 360, 180 ],
        EActivation:  1.62,
    },
]

// = = = Hack to convert all angles from degrees to radians on initial load. = = =
for (let [key, arrReactions] of Object.entries(globalVars.presetReactions) ) {
    let f = Math.PI/180.0;
    arrReactions.forEach( (r) => {
        
        if ( undefined != r.reactantAngles ) {
            for(var i=0;i<r.reactantAngles.length; i++) { r.reactantAngles[i] *= f; }
        } else {
            r.reactantAngles = Array( r.reactantNames.length ).fill( 0.0 );
        }
        if ( undefined != r.reactantAngleRanges ) {
            for(var i=0;i<r.reactantAngleRanges.length; i++) { r.reactantAngleRanges[i] = Math.cos( r.reactantAngleRanges[i] * f/2 ); }
        } else {
            r.reactantAngleRanges = Array( r.reactantNames.length ).fill( -1.0 );
        }
        
        if ( undefined != r.productAngles ) {
            for(var i=0;i<r.productAngles.length; i++) { r.productAngles[i] *= f; }
        } else {
            r.productAngles = Array( r.productNames.length ).fill( 0.0 );
        }
        if ( undefined != r.productAngleRanges ) {
            for(var i=0;i<r.productAngleRanges.length; i++) { r.productAngleRanges[i] = Math.cos( r.productAngleRanges[i] * f/2 ); }
        } else {
            r.productAngleRanges = Array( r.productNames.length ).fill( -1.0 );
        }
        
        if ( undefined != r.angleReactionOffset ) {
            r.angleReactionOffset *= f;
        }
    });
    console.log( "Done;");
}


