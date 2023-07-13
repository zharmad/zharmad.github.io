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

globalVars.bHeatExchange = true;

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

function initial_setup_with_html_vars( mapUserHTMLVars ) {
    
    const p = mapUserHTMLVars.get( "initialPreset" );
    if ( undefined != p ) { globalVars.initialPreset = p };
    overwrite_global_values( globalVars.initialPreset );
    
    // Overwrite these values from user HTML given tags
    for (const key in globalVars) {
        let s = mapUserHTMLVars.get(key);
        if ( undefined != s ) { globalVars[key] = s; }    
    }
}

// Preset simulation variables go below this section.
globalVars.presets = {};

/*
    Notes:
        1. All reactants, products and expected intermediates should be defined prior to activation.
        2. Place all species that the user are allowed to add prior to the simulation at the beginning. In other words, short-lived intermediates go after the reactants, products, and other participating molecules.
        3. Component ratios don't need to be listed for intermediates. The undefined entries will just resolve to 0.0.
*/
// Noble Gas, i.e. hard spheres.
var temp = globalVars.presets[ "noble gas" ] = {};
temp.distScale = 20;
temp.timeDelta = 50;
temp.worldTemperature = 200;
temp.bDoHeatExchange = true;
//temp.numMolecules = 124;
temp.densMolecules = 0.45;
temp.numComponentsShow = 5;
temp.componentIDs    = [ "He", "Ne", "Ar", "Kr", "Xe" ];
temp.componentRatios = [ 16, 8, 4, 2, 1 ];

/*
    Note: one molecule of ideal gas occupies 11.9 nm^2  at SATP, or 41.2 nm^3 in 3D.
*/
temp = globalVars.presets[ "atmosphere" ] = {};
temp.distScale =  80;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.bDoHeatExchange = true;
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
temp.bDoHeatExchange = true;
//temp.numMolecules = 300;
temp.densMolecules = 0.5;
temp.numComponentsShow = 2;
temp.componentIDs    = [ "NO₂•", "N₂O₄" ];
temp.componentRatios = [ 0.6, 0.4 ];

temp = globalVars.presets[ "hydrogen iodide equilibrium" ] = {};
temp.distScale  = 20;
temp.timeDelta    = 20;
temp.worldTemperature = 600;
temp.bDoHeatExchange = true;
//temp.numMolecules = 300;
temp.densMolecules = 1.2;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "H₂", "I₂", "HI", "H•", "I•" ];
temp.componentRatios = [ 0.5, 0.5, 0.0 ];
temp.componentHidePlot = [ "H•", "I•" ];

temp = globalVars.presets[ "ozone layer equilibrium" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.bDoHeatExchange = true;
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
temp.bDoHeatExchange = true;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 4;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "ClO•", "Cl•", "ClOO•", "ClOOCl", "Cl₂", "Cl₂O", "O•" ];
temp.componentRatios = [ 0.76, 0.20, 0.01, 0.03 ];
temp.componentHidePlot = [ "N₂",  "Cl•", "ClO•", "ClOO•", "ClOOCl", "Cl₂", "Cl₂O" ];

temp = globalVars.presets[ "ozone layer with NOX" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 200;
temp.bDoHeatExchange = true;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 6;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N•", "O•" ];
temp.componentRatios = [ 0.76, 0.20, 0.01, 0.01, 0.02, 0.0 ];
temp.componentHidePlot = [ "N₂", "NO•", "NO₂•", "NO₃•", "N•" ];
// temp.numComponentsShow = 7;
// temp.componentIDs    = [ "N₂", "O₂", "O₃", "NO•", "NO₂•", "NO₃•", "N₂O", "O•", "N•", ];
// temp.componentRatios = [ 0.76, 0.20, 0.01, 0.01, 0.02, 0.0 ];
// temp.componentHidePlot = [ "N₂", "NO•", "NO₂•", "NO₃•", "N₂O","N•" ];

temp = globalVars.presets[ "combustion - H2 and O2 basic" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 700;
temp.bDoHeatExchange = true;
//temp.numMolecules = 400;
temp.densMolecules = 0.8;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "H₂", "O₂", "H₂O", "O•", "H•", "OH•" ];
temp.componentRatios = [ 0.67, 0.33, 0.0 ];
temp.componentHidePlot = [ "O•", "H•", "OH•" ];

temp = globalVars.presets[ "combustion - H2 and O2 advanced" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 700;
temp.bDoHeatExchange = true;
//temp.numMolecules = 400;
temp.densMolecules = 0.8;
temp.numComponentsShow = 5;
temp.componentIDs    = [ "H₂", "O₂", "H₂O", "H₂O₂", "O•", "H•", "OH•", "HO₂•" ]; //"O₃", 
temp.componentRatios = [ 0.67, 0.33, 0.0 ];
temp.componentHidePlot = [ "O•", "H•", "OH•", "HO₂•" ];

temp = globalVars.presets[ "combustion - hydrocarbon" ] = {};
temp.distScale  = 30;
temp.timeDelta    = 20;
temp.worldTemperature = 600;
temp.bDoHeatExchange = true;
//temp.numMolecules = 500;
temp.densMolecules = 0.8;
temp.numComponentsShow = 4;
temp.componentIDs    = [ "C₂H₆", "CH₄", "O₂", "Ar", "CO₂", "H₂O", "H₂", "O•", "H•", "OH•", "H₂O₂", "HO₂•", "CH₃•", "CO", "CH₂O", "CH₃OH", "C₂H₂", "C₂H₄", "CH₂CO" ];
temp.componentRatios = [ 0.1, 0.2, 0.65, 0.05 ];
temp.componentHidePlot = [ "O•", "H•", "OH•" ];

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
        EActivation: 0.0, DeltaH: -43.6, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "I•", "I•" ], productNames: [ "I₂" ],
        EActivation: 0.0, DeltaH: -15.2, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "I•", "H•" ], productNames: [ "HI" ],
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
        EActivation:   0, lifetimeActivated: 1000,
    }, // UV-triggered decomposition.
    {
        reactantNames: [ "O₂", "O•" ], productNames: [ "O₃" ],
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
    
    Mechanisms in theis model are based on p.186 of Green Chemistry, Chapter 3.3 (Wilmouth et al., 2018). This focuses on polar ozone layer at high stratephoeres, where NOX species are largely absent.
    
    Relatively inconsequential Cl₂ path is included for completeness, while BrO contributions are not included.7
    Cl - NOX interactions that happen in the lower stratosphere are currently ignored. Bannan et al. (2015) DOI: 10.1002/2014JD022629
    
    TODO: Fill in kinetic data.  All activation energies are currently guesses due to ongoing research.   
    Nikolaison et al. (1994). DOI: 10.1021/j100052a027 has kinetics data but no Arrhenius activation energies.
*/
globalVars.presetReactions[ "ozone layer with Chlorine" ] = [
    {
        reactantNames: [ "O•", "Cl•" ], productNames: [ "ClO•" ],
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
*/
globalVars.presetReactions[ "ozone layer with NOX" ] = [
    // Common pathways.
    // Part A: Combination reactions. Most of these are UV-catalysed to decompose as well.
    { 
        reactantNames: [ "N•", "N•" ], productNames: [ "N₂" ],
        EActivation: 0.5, lifetimeActivated: 1000, bDoReverse: false,
    }, // DeltaH: -944 kJ/mol. Guessed EA. Ignore decomposition pathway. 
    // {
        // reactantNames: [ "N₂", "O•" ], productNames: [ "N₂O" ],
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
        EActivation: 1.0, bDoReverse: false
    }, //DeltaH: -523 kJ/mol. Guessed EA.  Ignore reverse pathway
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
    Aqua regia volatile gas equilibria.
    
    Royal water" was the stuff chemists used to dissolve noble metals gold and platinum. There is a nice story about Hungarian chemist George de Hevesy dissolving two Nobel prize medals to evade confiscation by Nazi Germany. See Wikipedia entry: https://en.wikipedia.org/wiki/Aqua_regia
    Nowadays, the reactions between Clorine, chloride and NOx species are studied in marine air quality as chlorine in all its forms affect the balance of these pollutants. There are important air-water interface reactions that are beyond the scope of this model, but it is worth knowing as 
    
    It begins with 3:1 mixture of HCl and HNO3, which will react and beign to form ClNO, ClNO2, and eventually just NO2.
       
    0. Get DeltaH from ANL database as usual: https://atct.anl.gov/Thermochemical%20Data/version%201.118/
        
    1. We take the activation energies from...
    
    2. Some additional useful information of catalysed versions
    
*/


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
        EActivation: 0.0, DeltaH: -43.6, lifetimeActivated: 1000,
    },
    // Oxygen direct decomposition and recombination.
    {
        reactantNames: ["O•", "O•"], productNames: ["O₂"],
        EActivation: 0.0, DeltaH: -49.8, lifetimeActivated: 1000,
    },
    // Water direct decomposition and recombination.
    {
        reactantNames: ["OH•", "H•"], productNames: ["H₂O"],
        EActivation: 0.0, DeltaH: -49.7, lifetimeActivated: 1000,
        reactantAngles:      [   0,   0 ], // Filled with 0.0 if not given.
        reactantAngleRanges: [ 240, 360 ], // Filled with 360 if not given. 
        productAngles:       [   0 ],
        productAngleRanges:  [ 360 ],
    },
    // OH radical direct decomposition and recombination.
    {
        reactantNames: ["O•", "H•"], productNames: ["OH•"],
        EActivation: 0.0, DeltaH: -43.0, lifetimeActivated: 1000,
    },
    // Radical propagation 1: hydrogen and oxygen molecule
    {
        reactantNames: ["O₂", "H•"], productNames: ["O•", "OH•"],
        EActivation: 7.1, DeltaH: 6.8,
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 240 ],
    },
    // Radical propagation 2: oxygen and hydrogen molecule
    {
        reactantNames: ["H₂", "O•"], productNames: ["H•", "OH•"],
        EActivation: 2.6, DeltaH: 0.6,
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
    },
    //  Collision-based water formation 1. 
    {
        reactantNames: ["H₂", "OH•"], productNames: ["H•", "H₂O"],
        EActivation:  1.5, DeltaH: -6.1,
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 240 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
    },
    //  Collision-based water formation 2. (Don't worry about collision symmetry just yet. This need a more advanced angle algorithm).
    {
        reactantNames: ["OH•", "OH•"], productNames: [ "O•", "H₂O" ],
        EActivation:  0.0, DeltaH: -6.7,
        reactantAngles:      [   0, 180 ], 
        reactantAngleRanges: [ 120, 240 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
    },
    // Symmetric copy since the current code won't recognise that the products need to be swapped.
    {
        reactantNames: ["OH•", "OH•"], productNames: [ "H₂O", "O•" ],
        EActivation:  0.0, DeltaH: -6.7,
        reactantAngles:      [ 180,   0 ], 
        reactantAngleRanges: [ 240, 120 ],
        productAngles:       [ 180,   0 ],
        productAngleRanges:  [ 240, 360 ],
        bDoReverse: false,
    },        
    // Self reaction of hydrogen molecule and radical. Not used.
    // Self reaction of oxygen  molecule and radical. Not used, as it goes to ozone.
]

// TODO: This and the carbon combustion requires an angle-based determination of reaction mechanisms. Example: OH+OH resolves to HOOH and H2O + O depending on angle.

/*
    Add in peroxide and ozone pathways that are involved in combustion.
    1. http://web.eng.ucsd.edu/mae/groups/combustion/mechanism.html.
    2. Sun et al. (2019), DOI: 10.1016/j.pecs.2019.02.002

        H = 218 ; O = 249 ; H2O = -242 ; OH = 37 ; H2O2 = -135 ; HO2 = 12 ; O3 = 142
*/
globalVars.presetReactions[ "combustion - H2 and O2 advanced" ] = [
    {
        reactantNames: [ "OH•", "OH•" ], productNames: [ "H₂O₂" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 180 ],
        EActivation:  0.0, DeltaH: -20.9,
        lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "OH•", "O•" ], productNames: [ "HO₂•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 180, 360 ],
        EActivation:  0.0, DeltaH: -27.4, 
        lifetimeActivated: 1000,
        bDoReverse: false,
        //remove the higher energy decomposition pathway as a convenience.
    },
    {
        //Symmetry 1. Competes with OH + O pathway, which is less energetically favourable.
        reactantNames: [ "H•", "O₂" ], productNames: [ "HO₂•" ],
        reactantAngles:      [   0,  90 ], 
        reactantAngleRanges: [ 360,  90 ],
        productAngles:       [   0 ],
        productAngleRanges:  [ 360 ],        
        EActivation:  0.0, DeltaH: -20.6,
        lifetimeActivated: 1000,
    },
    {
        //Symmetry 2.
        reactantNames: [ "H•", "O₂" ], productNames: [ "HO₂•" ],
        reactantAngles:      [   0, 180 ], 
        reactantAngleRanges: [ 360,  90 ],
        productAngles:       [   0 ],
        productAngleRanges:  [ 360 ],        
        EActivation:  0.0, DeltaH: -20.6,
        bDoReverse: false,
        lifetimeActivated: 1000,
    },    
    {
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "OH•", "OH•" ],
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 180 ],        
        EActivation:  0.2, DeltaH: -15.6,
        bDoReverse: false,
        // Reverse transfer pathway outcompeted by peroxide synthesis.
    },
    {
        //Symmetry 1. Alternate hydrogen radical production pathway. Lowest energy without requiring radical formation.
        reactantNames: [ "H₂", "O₂"  ], productNames: [ "H•", "HO₂•" ], 
        reactantAngles:      [   0,   0 ],
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [   0, 240 ],
        productAngleRanges:  [ 360, 120 ],        
        EActivation:  23.3, DeltaH: 23.0,
    },
    {
        //Symmetry 2
        reactantNames: [ "H₂", "O₂"  ], productNames: [ "H•", "HO₂•" ], 
        reactantAngles:      [   0, 180 ],
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [   0, 240 ],
        productAngleRanges:  [ 360, 120 ],        
        EActivation:  23.3, DeltaH: 23.0,
        bDoReverse: false,
    },
    {
        //Symmetry 3
        reactantNames: [ "H₂", "O₂"  ], productNames: [ "H•", "HO₂•" ], 
        reactantAngles:      [ 180,   0 ],
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [   0, 240 ],
        productAngleRanges:  [ 360, 120 ],        
        EActivation:  23.3, DeltaH: 23.0,
        bDoReverse: false,
    },
        {
        //Symmetry 4
        reactantNames: [ "H₂", "O₂"  ], productNames: [ "H•", "HO₂•" ], 
        reactantAngles:      [ 180, 180 ],
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [   0, 240 ],
        productAngleRanges:  [ 360, 120 ],        
        EActivation:  23.3, DeltaH: 23.0,
        bDoReverse: false,
    },
    { 
        //Alternate hydrogen radical production pathway. Lowest energy but requires a radical
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "H₂O", "O•" ],
        reactantAngles:      [ 120,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 120, 360 ],        
        EActivation:  0.7, DeltaH: -22.3,
        angleReactionOffset: 240,
    },
    { 
        reactantNames: [ "HO₂•", "O•" ], productNames: [ "O₂", "OH•" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [ 120, 180 ],
        productAngleRanges:  [ 360, 120 ],        
        EActivation: 0.0, DeltaH: -22.4,
    },
    { 
        reactantNames: [ "HO₂•", "OH•" ], productNames: [ "O₂", "H₂O" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 180 ],
        productAngles:       [ 120,   0 ],
        productAngleRanges:  [ 360, 240 ],        
        EActivation: 4.6, DeltaH: -29.1,
    },
    { 
        //Symnmetry 1
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "H₂O₂", "O₂" ],
        reactantAngles:      [  45, 225 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 4.6, DeltaH: -15.9,
    },
    { 
        //Symnmetry 2
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "O₂", "H₂O₂" ],
        reactantAngles:      [ 225,  45 ],
        reactantAngleRanges: [ 180, 180 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],
        EActivation: 4.6, DeltaH: -15.9,
        bDoReverse: false,
    },    
    { 
        //Symmetry 1
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 360 ],        
        EActivation: 3.3, DeltaH: -7.1,
    },
    { 
        //Symmetry 2
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [  45,   0 ],
        productAngleRanges:  [ 180, 360 ],
        EActivation: 3.3, DeltaH: -7.1,
        bDoReverse: false,
    },    
    { 
        //Symmetry 1. Knock on reaction modelled by transfer reaction with rotation.
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "OH•", "H₂O" ],
        reactantAngles:      [ 135,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 120 ],
        angleReactionOffset: 45,
        EActivation: 1.5, DeltaH: -28.8,
    },
    { 
        //Symmetry 2. Knock on reaction modelled by transfer reaction with rotation.
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "OH•", "H₂O" ],
        reactantAngles:      [ 315,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 180, 120 ],
        angleReactionOffset: 45,
        EActivation: 1.5, DeltaH: -28.8,
        bDoReverse: false,
    },
    // { 
        // Symmetry 1. Knock on reaction modelled by transfer reaction with rotation.
        // reactantNames: [ "H₂O₂", "O•" ], productNames: [ "OH•", "HO₂•" ],
        // reactantAngles:      [ 135,   0 ],
        // reactantAngleRanges: [  90, 360 ],
        // productAngles:       [   0, 135 ],
        // productAngleRanges:  [ 180,  90 ],
        // angleReactionOffset: 45,
        // EActivation: 1.7, DeltaH: -6.5,
    // },
    // { 
        //Symmetry 2. Knock on reaction modelled by transfer reaction with rotation.
        // reactantNames: [ "H₂O₂", "O•" ], productNames: [ "OH•", "HO₂•" ],
        // reactantAngles:      [ 315,   0 ],
        // reactantAngleRanges: [  90, 360 ],
        // productAngles:       [   0, 135 ],
        // productAngleRanges:  [ 180,  90 ],
        // angleReactionOffset: 45,
        // EActivation: 1.7, DeltaH: -6.5,
        // bDoReverse: false,
    // },
    { 
        //Symmetry 3. Direct impact version
        reactantNames: [ "H₂O₂", "O•" ], productNames: [ "HO₂•", "OH•" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 1.7, DeltaH: -6.5,
    },
    { 
        //Symmetry 4. Direct impact version
        reactantNames: [ "H₂O₂", "O•" ], productNames: [ "HO₂•", "OH•" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 180, 180 ],
        EActivation: 1.7, DeltaH: -6.5,
        bDoReverse: false,        
    },    
    { 
        //Symmetry 1.
        reactantNames: [ "H₂O₂", "OH•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles:      [  45,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 180, 240 ],                
        EActivation: 3.0, DeltaH: -13.2,
        //bDoReverse: false,
    },    
    { 
        //Symmetry 2.
        reactantNames: [ "H₂O₂", "OH•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles:      [ 225,   0 ],
        reactantAngleRanges: [  90, 180 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 180, 240 ],                
        EActivation: 3.0, DeltaH: -13.2,
        bDoReverse: false,
    },
]


