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
    Thus, a large molecule like N2O4 wilil be more expensive.    
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

//NB: these numbers will need sanitisation with the existing minimum and maximum.


// Preset simulation variables go here.
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
temp.timeDelta = 20;
temp.worldTemperature = 300;
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
temp.distScale =  60;
temp.timeDelta = 100;
temp.worldTemperature = 300;
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
temp.componentIDs    = [ "NO₂", "N₂O₄" ];
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

temp = globalVars.presets[ "ozone layer formation" ] = {};
temp.distScale = 30;
temp.timeDelta = 100;
temp.worldTemperature = 300;
temp.bDoHeatExchange = true;
//temp.numMolecules = 400;
temp.densMolecules = 0.7;
temp.numComponentsShow = 3;
temp.componentIDs    = [ "N₂", "O₂", "O₃", "O•" ];
temp.componentRatios = [ 0.78, 0.21, 0.01, 0.0 ];
temp.componentHidePlot = [ "N₂" ];

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

/*
    Hydrogen iodide decomposition is one of the three main steps in a method to produce hydrogen and oxygen from water - known as the sulfur-iodine cycle.
    One fancy thing about this equilibrium is that the dissociation energy of I2 -> I+I is equivalent to green light at 578 nm.
    
    See: https://en.wikipedia.org/wiki/Hydrogen_iodide and https://en.wikipedia.org/wiki/Sulfur%E2%80%93iodine_cycle 
    NB: requires catalysis to make the sulfuric acid decomposition more feasible.
    
    0. Get DeltaH from ANL database as usual: https://atct.anl.gov/Thermochemical%20Data/version%201.118/
        - H: 218, I: 107, I2: 62, HI: 26 
    1. We take the activation energies from this publication on the kinetics: Zhang et al. (2008), DOI: 10.1016/j.ijhydene.2007.10.025
    2. Some additional useful information of catalysed version can be found in, e.g.: Favuzza et al. (2011), DOI: 10.1016/j.apcatb.2011.03.032  
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
        //TODO: Add symmetry operations!
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [  90,  90 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [ 270,  90 ],
        angleReactionOffset:  90,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        //TODO: Add symmetry operations!
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [  90, 270 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [ 270,  90 ],        
        angleReactionOffset:  90,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        //TODO: Add symmetry operations!
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [ 270,  90 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [  90, 270 ],
        angleReactionOffset: 270,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },
    {
        //TODO: Add symmetry operations!
        reactantNames: [ "I₂", "H₂" ], productNames: [ "HI", "HI" ],
        reactantAngles:      [ 270, 270 ], 
        reactantAngleRanges: [  90,  90 ],
        productAngles:       [  90, 270 ],
        angleReactionOffset: 270,
        EActivation:  17.1, DeltaH: -1.0,
        bDoReverse: false,
    },    
    {
        //TODO: Add symmetry operations!
        reactantNames: [ "HI", "HI" ], productNames: [ "I₂", "H₂" ],
        reactantAngles:      [ 270,  90 ], 
        reactantAngleRanges: [ 120, 120 ],
        productAngles:       [  90,  90 ],
        angleReactionOffset: 90,
        EActivation:  19.1, DeltaH: 1.0,
        bDoReverse: false,
    },
    {
        //TODO: Add symmetry operations!
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
    TODO: add things that destory the ozone layer.    
*/
globalVars.presetReactions[ "ozone layer formation" ] = [
    {
        reactantNames: [ "O•", "O•" ], productNames: [ "O₂" ],
        EActivation:   0, DeltaH: -49.8, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "O₂", "O•" ], productNames: [ "O₃" ],
        EActivation: 0, DeltaH: -10.75, lifetimeActivated: 1000,
    },
    {
        reactantNames: [ "O₃", "O•" ], productNames: [ "O₂", "O₂" ],
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 240, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],                
        EActivation: 2.0, DeltaH: -39.1,
    }
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
        reactantNames: ["OH•", "OH•"], productNames: ["O•", "H₂O"],
        EActivation:  0.0, DeltaH: -6.7,
        reactantAngles:      [   0,   0 ], 
        reactantAngleRanges: [ 360, 360 ],
        productAngles:       [   0, 180 ],
        productAngleRanges:  [ 360, 240 ],
    },
    // Self reaction of hydrogen. Guesstimate as not experimentally measurable.
    {
        reactantNames: ["H₂", "H•"], productNames: ["H•", "H₂"],
        EActivation: 5.0, DeltaH: 0.0,
    }
    // Self reaction of oxygen not used -> goes to ozone.
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
        reactantNames: [ "H•", "O₂" ], productNames: [ "HO₂•" ],
        EActivation:  0.0, DeltaH: -20.6,
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
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "O₂", "H₂" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [ 120,   0 ],
        productAngleRanges:  [ 360,  90 ],        
        EActivation:  0.3, DeltaH: -23.0,
        bDoReverse: false,
        //Avoid alternative pathways for hydroxyl radical productions for now? These two seem like the lowest energy path for kickstarting the reaction process... TODO: encode symmetry.
    },
    { 
        // The other hydrogen radical formation path. Knock-on reaction. Use Transfer as a temporary shoe-in.
        reactantNames: [ "HO₂•", "H•" ], productNames: [ "H₂O", "O•" ],
        reactantAngles:      [ 120,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [   0,   0 ],
        productAngleRanges:  [ 360, 360 ],        
        EActivation:  0.7, DeltaH: -22.3,
        angleReactionOffset: 240,
        bDoReverse: false,
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
        //TODO: Code in Symmetry!    
        reactantNames: [ "HO₂•", "HO₂•" ], productNames: [ "O₂", "H₂O₂" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 360 ],
        productAngles:       [ 120, 240 ],
        productAngleRanges:  [ 360, 360 ],        
        EActivation: 4.6, DeltaH: -15.9,
        //bDoReverse: false,
    },
    { 
        //TODO: Code in Symmetry!
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "HO₂•", "H₂" ],
        EActivation: 3.3, DeltaH: -7.1,
    },
    { 
        //TODO: Code in Symmetry! Knock on reaction.
        reactantNames: [ "H₂O₂", "H•" ], productNames: [ "H₂O", "OH•" ],
        angleReactionOffset: 240,
        EActivation: 1.5, DeltaH: -28.8,
        //bDoReverse: false,        
    },
    { 
        //TODO: Code in Symmetry! Knock on reaction.
        reactantNames: [ "H₂O₂", "O•" ], productNames: [ "HO₂•", "OH•" ],
        angleReactionOffset: 240,
        EActivation: 1.7, DeltaH: -6.5,
        //bDoReverse: false,
    },
    { 
        //TODO: Code in Symmetry! Knock on reaction.
        reactantNames: [ "H₂O₂", "OH•" ], productNames: [ "HO₂•", "H₂O" ],
        reactantAngles:      [ 240,   0 ],
        reactantAngleRanges: [ 120, 180 ],
        productAngles:       [ 120,  90 ],
        productAngleRanges:  [ 360, 360 ],                
        angleReactionOffset: 240,
        EActivation: 3.0, DeltaH: -13.2,
        //bDoReverse: false,
    },    
    
]


