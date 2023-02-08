// Simulation Class to Handle overall simulation operations.
class Simulation {
    constructor() {
        //Molecule Handler
        this.nMolecules = 0;
        this.molecules = [];
        this.moletypeNames   = []; // This one is an array to keep track of order.
        this.moletypeCounts  = []; // All are arrays to make it easy to syn up with chart.js
        this.moletypeColours = [];
        this.nDegrees = 0;
        this.nMoleculesTarget = 0;
        this.nTrialsPosition = 10; //Attempt this many trials when placing molecules before resorting to other means.
        
        //Objects to be initialised.
        this.moleculeLibrary = undefined;
        this.gasComp = undefined;
        this.gasReactions = undefined;
        
        //Simulation parameters. dt converts discrete timesteps into actual time in femtoseconds.
        this.timestep    = 0;
        this.timeElapsed = 0.0;
        this.dt          = 10.0 ;
        this.statsUpdateInterval  = 100;
        this.systemZeroInterval    = 100;
        //this.dt          = 50; //Basically in ~ picoseconds. average velocity of 2D oxygen molecule is ~300 ms^-1, or 30 px per timestep.       
        this.temperature = 300;
        this.bSet = false;
        this.bHeatExchange = true ;
        
        this.timeFactor = 0.001; // Convert time units from picoseconds, by default to femtoseconds.
        this.lengthScale  = 10; // Convert spatial units. Currently used to convert pm to pixels.        

        this.xBounds = new Vector2D(0, 1);
        this.yBounds = new Vector2D(0, 1);
        this.xMaxTarget = undefined;
        this.xWallVelNominal  = 0.1; //The nominal scalar value of the velocity if the volume needs changing.
        this.xWallVel = 0; //The wall velocity seen by molecules when colliding with the shifting boundary.
                
        //Graphical interface
        this.graphicalContext = null ;        
        this.refreshAlpha = 0.4 ;
        this.bDrawMolecules = true;        
        
        // Accounting features. The statistics natively uses a running average to keep track of the last 
        // uses this.statsUpdateInterval as a marker for the length.
        this.stats       = undefined;
        this.setup_statistics_object();
        
        this.objTextFields = {}; //Object of HTML span references that can be filled later.
        
        // Designed to be exportable directly to Chart.JS. Constructor does not know about its contents.
        // Default to current composition for now.
        this.chartDoughnutGr = undefined;        
        this.chartBarGr = undefined;       
        
        this.chartLineGr1   = undefined;
        this.displayLineGr1 = ['temperature'] ; // Default to display only simulation temperature.
        
        this.chartLineGr2 = undefined;               
        
        // TODO: Hookup with the dynamic component registry and create a single trajectory data object for use in plotting and export.
        /*
            For performance, dataframe syntax follows that of chart.js graphs data objects so that it can be directly sorted into Chart.js for plotting.
            User should decide how to format for specific purposes.
            - Line graphs: { label: 'T', data: [ [x1, y1], [x2, y2], ...], backgroundColor: 'black' }
            - Bar graphs: { label: 'KE', data: [ y1, y2, ...], backgroundColor: 'black' }
            - Pie graphs: {label: 'Count', data: [y1, y2, ...], backgroundColor: [c1, c2,...], hoverOffset: 4, borderWidth: 1}
            NB: Univariate graphs have a separate labels array to denote the X-values.
            NB: Bivariate graphs have a separate labels array to denote the legend.
        */
        this.dataFrame = undefined;
        
        /* array of modules that the simulation doesn't know the contents of. */
        this.nModules = 0;
        this.modules = [];
    }
    
    reset() {
        this.nMolecules = 0;
        this.molecules = [];
        this.nDegrees = 0;
        this.timestep    = 0;
        this.timeElapsed = 0.0;
        this.bSet = false;
        
        this.reset_data_frame();
    }
    
    // Internal dimensions will be in picometers. So will convert.
    setup_graphical_context(ctx, alpha) {
        if ( undefined === ctx ) { throw "Cannot setup graphical context without an argument!"; }
        if ( undefined === alpha ) { alpha = 0.4; }
        this.graphicalContext = ctx ;
        this.refreshAlpha = alpha ;
    }
    
    // NB: this one function should never be called while the simulation is running.
    set_target_number_of_molecules( nMol ) { this.nMoleculesTarget = nMol; }
    set_target_nMols_by_density( dens ) { this.nMoleculesTarget = Math.ceil( dens * this.measure_volume() ); }
    
    set_world_temperature( T ) { this.temperature = T; }
    get_world_temperature() { return this.temperature; }
    set_bool_heat_exchange( bool ) { this.bHeatExchange = bool; }
    get_bool_heat_exchange() { return this.bHeatExchange; }
    set_bool_draw_molecules( bool ) { this.bDrawMolecules = bool; }
    set_world_length_scale( x ) { this.lengthScale = x ; }
    get_world_length_scale() { return this.lengthScale; }
    set_world_time_factor( x ) { this.timeFactor = x ; }
    get_world_time_factor() { return this.timeFactor; }  
    
    // Updating overall simulation speed will also affect some reaction properties.
    set_world_time_delta( x ) {        
        this.dt = x ;
        if ( undefined != this.gasReactions ) {
            this.gasReactions.update_time_dependence( x );
        }
    }
    
    get_world_time_delta() { return this.dt; }      
    set_statistics_update_interval( x ) { this.statsUpdateInterval = x; }
    set_system_zero_interval( x ) { this.systemZeroInterval = x; }
    
    get_world_boundaries() {
        return [ this.xBounds, this.yBounds ];
    }
    set_world_boundaries( xMax, yMax ) {
        this.xBounds[1] = xMax * this.lengthScale;
        this.yBounds[1] = yMax * this.lengthScale;
        this.xMaxTarget = this.xBounds[1];
    }
    
    update_values_from_globals() {
        this.set_world_time_factor( globalVars.timeFactor );
        this.set_world_time_delta( globalVars.timeDelta );
        this.set_world_length_scale( globalVars.lengthScale );
        this.set_world_boundaries( globalVars.worldWidth, globalVars.worldHeight );
        this.set_world_temperature( globalVars.temperature );
        this.set_bool_heat_exchange( globalVars.bHeatExchange );
        //this.set_target_number_of_molecules( globalVars.numMolecules );
        this.set_target_nMols_by_density( globalVars.densMolecules * 1e-6 );
        this.set_statistics_update_interval( globalVars.statisticsUpdateInterval );
    }
    
    set_molecule_library( ml ) {
        this.moleculeLibrary = ml ;
    }
    
    set_gas_composition( gc ) {
        if ( this.gasComp != undefined ) { delete this.gasComp; }
        this.gasComp = gc;
        if ( 'count' === gc.type ) { this.nMoleculesTarget = gc.nTotal; }
    }

    set_gas_reactions( gr ) {
        if ( this.gasReactions != undefined ) { delete this.gasReactions; }
        this.gasReactions = gr;
        this.gasReactions.set_molecule_library( this.moleculeLibrary );
    }    
    
    get_random_position( margin ) {
        return random_2DUniform( this.xBounds.x + margin, this.xBounds.y - margin, this.yBounds.x + margin, this.yBounds.y - margin);
    }
    
    find_open_position( size ) {
        const nTrials = this.nTrialsPosition, nMols = this.nMolecules;
        let pTest = undefined, bCollide = false;
        for ( let i = 0; i < nTrials; i++ ) { 
            pTest = this.get_random_position( size );
            bCollide = false;
            for ( let j = 0; j < nMols; j++ ) {
                let pMol = this.molecules[j].p, sMol = this.molecules[j].size;
                var sepSq = (pMol[0]-pTest[0])*(pMol[0]-pTest[0]) + (pMol[1]-pTest[1])*(pMol[1]-pTest[1]);
                if ( sepSq < (sMol+size)*(sMol+size) ) { bCollide = true; break; }
            }
            if ( !(bCollide) ) { return pTest; }
        }
        // Let the simulation sort it out later.
        return pTest;
        //throw `ERROR: Failed to find open space for a molecule with size ${size}. Simulation is probably too densely packed!`;
    }
    // mass is defined in amu. velocity as pm per fs.
    // KE is thus measured as 1 kJ/mol = 1000 kg m^2 / ( s^2 mol) = 1 amu pm^2 / fs^2.

    // Below are the only set of functions that should be allowed to update the molecule counts in the simulation.    
    // Second use case if an argument is given with 0 or less molecules to be created. Create the molecule type to be tracked later.
    // This is useful for pformation of products and intermediates.
    create_and_add_molecules(moletypeName, n) {
        if ( undefined === n ) { throw "Function create_and_add_molecules requires two arguments: molecule type and number of molecules to create!"; }
        const moltype = this.moleculeLibrary.get_entry( moletypeName );
        const j = this.moletypeNames.indexOf( moletypeName );
        if ( -1 === j ) {
            this.moletypeNames.push( moletypeName );
            this.moletypeCounts.push( 0 );
            this.moletypeColours.push( moltype.molColour );
            j = this.moletypeCounts.length - 1;
        }
        if ( n <= 0 ) { return; }
        
        let pInit = undefined, mol = undefined;
        for ( let i = 0; i < n; i++ ) {
            pInit = this.find_open_position( moltype.size );
            mol = this.moleculeLibrary.create_molecule( moltype, { bSample: true, T: this.temperature, p: pInit } );
            this.molecules.push( mol );
            this.nMolecules++; 
        }
        this.nDegrees += mol.nDegrees * n;
        this.moletypeCounts[j] += n;
    }
    
    // Add one molecule.
    add_molecule( mol ) {
        this.molecules.push( mol );
        this.nMolecules++; this.nDegrees += mol.nDegrees;
        const j = this.moletypeNames.indexOf( mol.name );
        this.moletypeCounts[j]++;
    }        
    // Move references to molecules around. Does update global statistics.
    remove_molecule( mol ) {
        const i = this.molecules.indexOf( mol );
        delete this.molecules[i];
        this.molecules[i] = this.molecules[this.nMolecules-1];
        this.molecules.pop();        
        this.nMolecules--; this.nDegrees -= mol.nDegrees;
        const j = this.moletypeNames.indexOf( mol.name );        
        this.moletypeCounts[j]--;
    }
    
    /* Generic initialiser that takes up the most memory */
    // Args are for specifying the size of the library and what molecules to build.
    initialise_molecules_libraries(args) {
        this.moleculeLibrary.reset_library();
        this.moleculeLibrary.add_all_known_molecule_types();
    }
    
    initialise_moletype_accounting( arrNames ) {
        const n = arrNames.length;
        this.moletypeNames   = arrNames;
        this.moletypeCounts  = [];
        this.moletypeColours = [];
        let colour = undefined;
        for ( let i = 0; i < n; i++ ) {
            this.moletypeCounts.push( 0 );
            colour = this.moleculeLibrary.get_entry( arrNames[i] ).molColour;
            this.moletypeColours.push( colour );
        }
    }
    
    /* The main builder  */
    build_simulation() {
        
        if ( undefined === this.gasComp ) { throw "Simulation instance has no defined composition to sample from!"; }
        this.molecules = [];
        this.moletypeNames = [];
        this.nMolecules = 0, this.nDegrees = 0;
                
        const obj = this.gasComp.get_components();
        this.initialise_moletype_accounting( this.gasComp.get_component_names() );
        
        // Initial safety check.
        this.assert_maximum_safe_density();

        // Place molecules 
        switch ( this.gasComp.type ) {
            case 'count':
                obj.forEach( ([name,val]) => {
                    this.create_and_add_molecules( name, val );
                });
                break;
            case 'ratio':
                obj.forEach( ([name,val]) => {
                    const nCopies = Math.round( val * this.nMoleculesTarget );
                    this.create_and_add_molecules( name, nCopies );
                });
                break;
            default:
                throw `Simulation instance does not understand the type of Gas-composition: ${this.gasComp.type} !`;
        }
        
        //Create and manage the data frames that stores time plots for the line graph.
        this.reset_data_frame();
        this.moletypeNames.forEach( name => {
            var colour = this.moleculeLibrary.get_molecule_color(name);
            // Switch from white to black for visual purposes.
            switch( colour ) {
                case 'rgb(255,255,255)':
                case 'white':
                case '#FFFFFF':
                    colour = 'rgb(0,0,0)';
                    break;
                default:
                    //Do nothing.
            }
            this.create_data_frame_entry( name, name, colour );
        });        

        //Initial setup of data.
        this.update_statistics();
        this.push_current_stats();
        
        //Synchronise and set up graph data.
        this.bSet = true;
        console.log(`Build complete. Created ${this.nMolecules} molecules.`);
    }   

    // This is meant to be all-encompassing so that it should pass a self-check.
    regenerate_simulation(args) {
        this.update_values_from_globals();
        //this.initialise_molecules_libraries(args);
        
        // Make sure the gas composition is standardised.
        this.gasComp.normalise();    
        
        this.build_simulation();

        this.draw_background(1.0);        
        this.draw_all_new();
        //this.draw();
        
        this.timestep    = 0;
        this.timeElapsed = 0.0;
        //this.reset_line_graph();
        
        //Graph inital velocities.
        this.sync_all_graphs();
        this.update_all_graphs();
        
        this.run_self_check();
    }

    run_self_check() {
        if ( !this.bSet ) {throw "Simulation is not set!";}
        if ( 0 === this.nMolecules || [] === this.molecules) {throw "There are no molecules in the simulation!";}
        for (const mol of this.molecules) {
            if ( Number.isNaN( mol.p.x ) || Number.isNaN( mol.p.y ) ) {throw "A molecule has invalid positions!";}
            if ( Number.isNaN( mol.v.x ) || Number.isNaN( mol.v.y ) ) {throw "A molecule has invalid velocities!";}
        }
        if ( null === this.graphicalContext ) { throw "The graphical context has not been given!";}
        return true;
    }

    assert_maximum_safe_density() {
        // Inverse density measures the average amount of space available to each molecule.
        const limitRatio = 0.5 ;
        const volume = this.measure_volume() * 1e-6 ;
        const targetVolumePerMol = volume / this.nMoleculesTarget;
        let maxMolVolume = 0.0, molVolume = 0.0;
        for (const name of Object.keys( this.gasComp.data ) ) {
            molVolume = this.moleculeLibrary.data[name].size**2.0 * Math.PI;
            maxMolVolume = Math.max( maxMolVolume, molVolume );
        }
        maxMolVolume *= 1e-6 ;
        //console.log( this.nMoleculesTarget, volume, targetVolumePerMol, maxMolVolume );
        if ( targetVolumePerMol < maxMolVolume / limitRatio ) {
            const nMoleculesNew = Math.floor( limitRatio * volume / maxMolVolume );
            console.log( `Too dense! Reducing the target number of molecules from ${this.nMoleculesTarget} to ${nMoleculesNew}.` );
            this.nMoleculesTarget = nMoleculesNew;
        }
    }

    // This is responsible for wiping previous images.
    draw_background( alpha ) {
        if ( alpha === undefined ) { alpha = this.refreshAlpha; }
        const ctxLoc = this.graphicalContext ;
        const wWindow = ctxLoc.canvas.width, hWindow = ctxLoc.canvas.height;
        const wSim = this.xBounds[1] / this.lengthScale;
        if ( wSim >= wWindow ) {
            //Simulation at maximum possible extent.
            ctxLoc.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctxLoc.fillRect(0, 0, wWindow, hWindow);
            ctxLoc.lineWidth = 2;
            ctxLoc.strokeStyle = '#221100';
            ctxLoc.strokeRect(0, 0, wWindow, hWindow);
        } else {
            ctxLoc.fillStyle = `rgb(24,24,24)`;
            ctxLoc.fillRect(wSim, 0, wWindow, hWindow);            
            ctxLoc.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctxLoc.fillRect(0, 0, wSim, hWindow);
            ctxLoc.lineWidth = 2;
            ctxLoc.strokeStyle = '#221100';
            ctxLoc.strokeRect(0, 0, wSim, hWindow);            
        }
        //Draw on the back of canvas.
        //context.globalCompositeOperation = 'destination-over';
        //Draw on the front again
        //context.globalCompositeOperation = 'source-over';
    }
    
    draw() {
        this.draw_background();
        for (const mol of this.molecules) {
            mol.draw(this.graphicalContext);
        }
    }
    
    // New strategy is to put all of the circles of the same colour in a single path.
    // This is best done with a molecule colouring scheme.    
    draw_all_new() {
        
        if ( !this.bDrawMolecules ) { return; }
        
        const ctxLoc = this.graphicalContext;
        
        this.draw_background();
        
        //Modules
        for (let i = 0; i < this.nModules; i++ ) {
            this.modules[i].draw_call( ctxLoc );
        }
        
        //Collect every atom grouped by molecule colour.
        const xPos = {}, yPos = {}, rads = {}, colours = {};
        for ( const name of this.moletypeNames ) {
            xPos[name] = []; yPos[name] = []; rads[name] = [];
            colours[name] = this.moleculeLibrary.get_entry(name).molColour;
        }
        for (const mol of this.molecules) {
            for (let i = 0; i < mol.nAtoms; i++) {
                const off = Vector2D.rotate( mol.atomOffsets[i], mol.th );                
                xPos[mol.name].push( (mol.p.x + off.x) / globalVars.lengthScale );
                yPos[mol.name].push( (mol.p.y + off.y) / globalVars.lengthScale );
                rads[mol.name].push( mol.atomRadii[i] / globalVars.lengthScale );
            }
        }
        
        //Draw one path for each colour.
        for ( const name of this.moletypeNames ) {
            ctxLoc.beginPath();                
            ctxLoc.fillStyle = colours[name];
            ctxLoc.lineWidth = 1;
            ctxLoc.strokeStyle = '#221100';
            const nCircles = rads[name].length;
            for ( let i = 0; i < nCircles; i++ ) {                
                ctxLoc.moveTo( xPos[name][i] + rads[name][i], yPos[name][i] );
                ctxLoc.arc( xPos[name][i], yPos[name][i], rads[name][i], 0, 2 * Math.PI );
            }
            ctxLoc.stroke();
            ctxLoc.fill();
        }
    }
    
    resolve_molecule_changes( arrAdd, arrDel ) {
        //console.log(`DEBUG at timestep ${this.timestep}: Molecules reacted!`);
        for ( const m of Object.values(arrDel) ) { this.remove_molecule(m); };
        for ( const m of Object.values(arrAdd) ) { this.add_molecule(m); };
        //arrDel.forEach( m => { this.remove_molecule(m); });
        //arrAdd.forEach( m => { this.add_molecule(m); });
    }
    
    // This O(n^2) step takes the most time. 32 of 80 seconds on last check for ~2000 molecule system.
    // TODO: Try emscripten -> Webassembly this piece of code.
    detect_potential_collisions() {
        const nMol = this.nMolecules;
        const xPos = new Float32Array(nMol);
        const yPos = new Float32Array(nMol);
        const sizes = new Float32Array(nMol);
        //Assign positions once and for all to stop pointer chasing.
        for ( let i = 0; i < nMol; i++ ) {
            const p = this.molecules[i].p;
            xPos[i] = p.vec[0];
            yPos[i] = p.vec[1];
            sizes[i] = this.molecules[i].size;
        }
        
        const molPairs = [];
        for (let i = 0; i < nMol-1; i++) {            
            for (let j = i + 1; j < nMol; j++ ) {
                var sepSq = (xPos[j]-xPos[i])*(xPos[j]-xPos[i]) + (yPos[j]-yPos[i])*(yPos[j]-yPos[i]);
                if ( sepSq < (sizes[j]+sizes[i])*(sizes[j]+sizes[i]) ) {
                    molPairs.push( [ this.molecules[i], this.molecules[j] ] );
                }
            }
        }        
        return molPairs;
    }
        
    resolve_all_potential_collisions( molPairs ) {    
        var ret = undefined, arrDel = [], arrAdd = [];
        const nPairs = molPairs.length;
        for( var i = 0; i < nPairs; i++ ) {            
            const m1 = molPairs[i][0]; const m2 = molPairs[i][1];            
            if ( m1.bIgnore || m2.bIgnore ) { continue; }
                
            // Offload each encounter to the interaction handler.
            var ret = this.gasReactions.process_molecule_encounter(m1, m2);
            
            // When a reaction has occurred, take note of the molecules to be created and deleted.
            if ( null != ret ) {
                m1.bIgnore = true; m2.bIgnore = true;
                arrDel.push( m1 ); arrDel.push( m2 );
                ret.forEach( m => { arrAdd.push( m ); });
            }
        }
        
        /* Account for additions and subtractions here. */
        if ( arrDel.length > 0 ) {
            this.resolve_molecule_changes( arrAdd, arrDel );            
            // Draw new molecules separately in an asynchronous implementation.
            if ( this.bDrawMolecules ) {
                for (const mol of arrAdd) { mol.draw( this.graphicalContext ); }
            }            
            //stop_simulation();
        }
    }
    
    async step() {
        this.timestep ++;
        const dt = this.dt;
        this.timeElapsed += dt * this.timeFactor ;
        //console.log( this.timestep, this.timeFactor );
        let nMol = this.nMolecules;

        //Resolve any spontaneous decomposition reactions
        //Placeholder for reaction list.
        const arrDel = [], arrAdd = [];
        //let ret = undefined;        
        for (const mol of this.molecules) {
            let ret = this.gasReactions.process_molecule_selfinteraction(mol);
            if ( null != ret ) {
                arrDel.push( mol );
                ret.forEach( m => { arrAdd.push( m ); });
            }
        } 
        /* Account for additions and subtractions here. */
        if ( arrDel.length > 0 ) {
            this.resolve_molecule_changes( arrAdd, arrDel );
            //stop_simulation();
        }
                
        // Simple movement
        for (const mol of this.molecules) {
            mol.update_position( dt );
        }
        
        // Asynchronous version of draw. Breaks fidelity a little but speeds up simulation work.
        let drawPromise = new Promise( function( resolve, reject ) {
            sim.draw_all_new();
            resolve();
            reject();
        });
        
        
        // Detect and resolve collisions
        //const t0 = performance.now();
        const molPairs = this.detect_potential_collisions();
        // const t1 = performance.now();
        // console.log(`Time required to detect collisions: ${t1-t0} ms`);        
        if ( molPairs.length > 0 ) { this.resolve_all_potential_collisions( molPairs ); }
        
        //Run final self check.
        //console.log(`Checking integrity at step ${this.timestep}`);        
        // for ( const mol of this.molecules ) {
            // if ( Number.isNaN( mol.v.x ) || Number.isNaN( mol.v.y ) ) {
                // mol.debug();
                // throw "NaN velocity values have been detected!";
            // }
        // }
        
        // Shift wall boundaries if required.
        // NB: Le Chatelier's Principle and pressure effects are very difficult to discern within the normal bounds of the simulation.
        // I believe that the reason is this: the collision rate needs to change by ~an order of magnitude in order to have any noticeable shift in the equilibrium of gases. This means simulation times that are not really practical when trying to maintain adequate collision detection rates.
        if ( this.xMaxTarget > this.xBounds[1] ) {
            this.xWallVel = this.xWallVelNominal ;
            this.xBounds[1] += this.xWallVelNominal * this.dt;
            if ( this.xMaxTarget < this.xBounds[1] ) { this.xBounds[1] = this.xMaxTarget; } 
        } else if ( this.xMaxTarget < this.xBounds[1] ) {
            this.xWallVel = -this.xWallVelNominal;
            this.xBounds[1] -= this.xWallVelNominal * this.dt;
            if ( this.xMaxTarget > this.xBounds[1] ) { this.xBounds[1] = this.xMaxTarget; }             
        } else {
            this.xWallVel = 0;
        }
        
        // Resolve any collision with the walls.
        let totalMomentumTransfer = 0.0;
        for (const mol of this.molecules) {
            //Shift molecules            
            totalMomentumTransfer += this.process_wallBounce(mol);            
        }
        
        //Zero all angular momentum to reduce ice cude phenomenon. This now breaks strict energy conservation of the system.
        if ( this.timestep % this.systemZeroInterval == 1 ) {
            this.zero_total_momentum();
            // const sysP = this.get_linear_momentum(); 
            // sysP.scale( 1.0/this.nMolecules );
            // console.log(`Reporting at time step ${this.timestep} ( ${this.nMolecules} molecules )` );
            // console.log("System linear momentum per molecule:", sysP.x, sysP.y );
            // console.log("System angular momentum per molecule:", this.get_angular_momentum() / this.nMolecules );
        }

        // Modules
        for (let i = 0; i < this.nModules; i++ ) {
            this.modules[i].step_call();
        }        

        // inform the graphical context. -- synchronous execution version.
        // if( this.bDrawMolecules ) { this.draw_all_new(); }        
        
        // inform fast updaters
        this.update_statistics();        
        this.stats['pressure'].unshift( this.calculate_instant_pressure( totalMomentumTransfer ) );

        this.push_current_stats();
        
        // inform slow updaters
        if ( this.timestep % this.statsUpdateInterval == 0 ) {
            this.push_data_frame();
            this.update_all_graphs();
        }
                
        await drawPromise;
    }

    debug() {
        for (const mol of this.molecules) {
            var n = [mol.p[0], mol.p[1], mol.v[0], mol.v[1], mol.th, mol.om]
            var out = n.map(n => parseFloat(n.toPrecision(3)));
            console.log( mol.name, out);
        }
    }

    // TO-DO: switch to the rigid body collider with the wall.
    // const vel1PInit = vInit1 + scalar_cross( om, sep1P );
    // const w = (rotI != null ) ? sep1P.cross(vecN)**2.0/rotI : 0.0;
    // const f = 1.0 / ( 1.0/mass + w ) ;
    // const impulse = f * vel1PInit.dot(vecN) * (1 + elasticity) ;
    process_wallBounce(mol) {        
        const xBounds = this.xBounds, yBounds = this.yBounds;
        const s = mol.size, p = mol.p, v = mol.v ;
        let bCollideX = false, bCollideY = false, bMovingWall = false;        
        const vInit = Vector2D.duplicate( v );
        
        if ( p.x - s < xBounds.vec[0] ) {
            v.x = -v.x;
            p.x += 2.0*( s + xBounds.vec[0] - p.x );
            bCollideX = true;
        } else if ( p.x + s > xBounds.vec[1] ) {
            // This is the boundary that can move. Add additional component from an infinitely heavier wall collision.            
            v.x = -v.x ;
            p.x += 2.0*( xBounds.vec[1] -p.x - s );
            bCollideX = true;
            bMovingWall = true;
        }

        if ( p.y - s < yBounds.x) {
            v.y = -v.y;
            p.y += 2.0*( s + yBounds.x - p.y );
            bCollideY = true;
        } else if ( p.y + s > yBounds.y) {
            v.y = -v.y;
            p.y += 2.0*( yBounds.y - p.y - s );
            bCollideY = true;
        }
        
        /*
        Resample energies upon contact with the outside world. The default loses energy over time because faster molecules collide with the walls more often. This results in net energy tranfer to the outside. A correction constant is thus determined numerically from atmospheric samples.
        A values of 1.38 leads to the following:
            - 200 molecules in 303nm^2 box gives 292K.
            - 500 molecules in 303nm^2 box gives 300K.
        This confirms that the constant will have a small dependence on density, i.e. collision rate between molecules.
        */
        if ( !bCollideY || !bCollideY ) { return 0.0 }
        
        if ( this.bHeatExchange ) {
            // mol.resample_speed( this.temperature * 1.26 );
            // mol.resample_omega( this.temperature * 1.26 );
            mol.resample_speed( this.temperature * 1.38 );
            //mol.resample_speed( this.temperature );
            mol.resample_omega( this.temperature );
        }
        
        if ( bMovingWall ) { mol.v.x += 2.0 * this.xWallVel } 

        if ( bCollideX ) {
            return mol.mass * Math.abs( mol.v.x - vInit.x );
        } else if ( bCollideY ) {
            return mol.mass * Math.abs( mol.v.y - vInit.y );
        } else {
            return mol.mass * mol.v.dist(vInit);
        }
    }
    
    /* Cheapouts when the value has already been done */
    get_current_stat( key ) {
       return this.stats[key][0];
    }
    get_average_stat( key ) {
        return array_average( this.stats[key] );
    }    
    
    /* General analysis functions*/
    measure_volume() {
        return ( this.xBounds[1] - this.xBounds[0] ) * (this.yBounds[1] - this.yBounds[0] );
    }    
    measure_temperature() {
        // Note: the minus 3 comes from the constraints on setting the center of mass and rotation to zero.
        const totE = this.measure_total_energy();
        return totE / ( 0.5 * (this.nDegrees - 3) * 8.314 * this.timeFactor**2.0 * 1000 ) ;
    }
    
    measure_perimeter() {
        // In pm
        return 2.0 * ( this.xBounds[1] - this.xBounds[0] + this.yBounds[1] - this.yBounds[0] );
    }    
    calculate_instant_pressure( totMomentumTransfer ) {
        // In amu, pm, fs. Need to convert.
        // Report as amu, pm, ps.
        return totMomentumTransfer / this.measure_perimeter() / this.dt / this.timeFactor**2 ;
    }
    
    /* */
    measure_total_energy() {
        let ETot = 0.0; 
        for (const mol of this.molecules) {
            ETot += mol.measure_total_energy();
        }
        return ETot;        
    }
    measure_total_kinetic_energy() {
        let KE = 0.0;
        for (const mol of this.molecules) {
            KE += mol.measure_kinetic_energy();
        }
        return KE;
    }
    measure_total_rotational_energy() {
        let RE = 0.0;
        for (const mol of this.molecules) {
            RE += mol.measure_rotational_energy();
        }
        return RE;
    }        
    measure_mean_velocity() {
        let v = 0.0;
        for (const mol of this.molecules) {
            v += mol.v.norm();
        }
        return v/this.nMolecules;
    }

    get_centre_of_mass() {
        let pCent = new Vector2D(0,0), mTot = 0.0;
        for (const mol of this.molecules) {
            pCent.sincr( mol.mass, mol.p );
            mTot += mol.mass;
        }
        pCent.scale( 1.0 / mTot );
        return pCent;
    }
    get_angular_momentum() {
        let pCent = this.get_centre_of_mass();
        let L = 0.0;
        for ( const mol of this.molecules ) { L += mol.get_angular_momentum( pCent ); }
        return L;
    }
    get_linear_momentum() {
        let P = new Vector2D( 0, 0 );
        for ( const mol of this.molecules ) { P.sincr( mol.mass, mol.v); }
        return P;
    }

    // Conduct an iso-kinetic energy redistribution of total momentums and energies.
    // This transfer the system's rotational and linear energies back into the kinetic energies of individual molecules.
    // Note that the rotational energies if indviidual atoms have remained untouched for now. This may need to be redistributed as well.
    zero_total_momentum() {
        //if ( undefined === bLinear ) { bLinear = true; }
        //if ( undefined === bAngular ) { bAngular = true; }
        let pCent = this.get_centre_of_mass();
        let PTot = new Vector2D( 0, 0 );
        let MTot = 0, LTot = 0.0, ITot = 0.0, ETotOld = 0.0;
        for (const mol of this.molecules) {
            MTot += mol.mass ;
            PTot.sincr( mol.mass, mol.v );
            ITot += mol.mass * mol.p.subtract( pCent ).norm2();            
            LTot += mol.get_angular_momentum( pCent );
            ETotOld += mol.measure_total_energy();
        }
        const sysOm = LTot / ITot; const sysV = PTot.scaled_copy( 1.0 / MTot );
        let ETotNew = 0.0;
        //console.log(`Zeroing system angular momentum about ( ${pCent.x}, ${pCent.y} ) with angular momentum ${LTot} and rotation ${sysOm} ...`);
        for (const mol of this.molecules) {
            const vRect = Vector2D.scalar_cross( -sysOm, mol.p.subtract( pCent ) );
            vRect.decr( sysV );
            mol.v.incr( vRect );
            ETotNew += mol.measure_total_energy();
        }
        // Energy redistribution
        const ratio = Math.sqrt( ETotOld/ETotNew );
        for (const mol of this.molecules) {
            mol.v.scale( ratio );
            mol.set_omega( mol.om*ratio );
        };
        
        //debugging
        // const PFinal = this.get_linear_momentum();
        // const LFinal = this.get_angular_momentum();
        // const ETotFinal = this.measure_total_energy();        
        // console.log( "Old momentum and energies:", PTot.x, PTot.y, LTot, ETotOld);
        // console.log( "New momentum and energies:", PFinal.x, PFinal.y, LFinal, ETotFinal );
    }
    
    /* Reaction handling functions */
    test_decomposition( mol ) {
        const totKE = mol.measure_kinetic_energy() + mol.measure_rotational_energy();        
        console.log( totKE );
        if ( totKE > 12.6 ) {
            // Create decomposed molecules and delete this one.
        }
    }
    
    /*
        All functions for handling data
        - Line graphs: { label: 'T', data: [ [x1, y1], [x2, y2], ...], backgroundColor: 'black' }
        - Bar graphs: { label: 'KE', data: [ y1, y2, ...], backgroundColor: 'black' }
        - Pie graphs: {label: 'Count', data: [y1, y2, ...], backgroundColor: [c1, c2,...], hoverOffset: 4, borderWidth: 1}
    */
    
    reset_data_frame() {
        delete this.dataFrame;
        this.dataFrame = {};
        this.create_data_frame_entry( 'temperature', 'temperature (K)', 'rgb(0,0,0)' );
        this.create_data_frame_entry( 'volume', 'volume (nm³)', 'rgb(255,128,0)' );
        this.create_data_frame_entry( 'pressure', 'pressure (amu ps⁻²)', 'rgb(0,255,128)' );
        this.create_data_frame_entry( 'density', 'density (nm⁻³)', 'rgb(128,0,255)' );
        this.create_data_frame_entry( 'numMolecules', '# of molecules', 'rgb(128,128,128)' );
    }
    
    create_data_frame_entry( key, label, BGColour ) {
        if ( undefined === label ) { label = key; }
        if ( undefined === BGColour ) { BGColour = 'black'; }
        this.dataFrame[key] = { label: label, data: [], backgroundColor: BGColour }        
    }
    
    link_current_stats_text_fields( args ) {
        for (const [k, v] of Object.entries( args ) ) {
            this.objTextFields[k] = v;
        }
    }

    // Uses this.statsUpdateInterval as the length of the average.
    setup_statistics_object() {
        this.stats = {};
        this.stats['timeElapsed'] = [];
        this.stats['numMolecules'] = [];        
        this.stats['volume'] = [];
        this.stats['density'] = [];        
        this.stats['temperature'] = [];
        this.stats['pressure'] = [];
    }
    
    // Most recent addition is always at the front of the array
    update_statistics() {
        const s = this.stats;
        s.timeElapsed.unshift( this.timeElapsed );
        s.numMolecules.unshift( this.nMolecules );
        s.volume.unshift( this.measure_volume() * 1e-6 );
        s.density.unshift( this.nMolecules / s.volume[0] );
        s.temperature.unshift( this.measure_temperature() );
        //s.pressure.unshift( this.measure_pressure() );
        
        //Pop last entries to maintain length.
        if ( this.statsUpdateInterval < s.timeElapsed.length ) {
            s.timeElapsed.pop();
            s.numMolecules.pop();
            s.volume.pop();
            s.density.pop();
            s.temperature.pop();
            s.pressure.pop();
        }
    }
    
    // Always get the latest values only from the arrays.
    push_current_stats() {
        for ( const [ k, v ] of Object.entries( this.stats ) ) {
            if ( k in this.objTextFields ) {
                this.objTextFields[k].innerHTML = ( undefined != v[0] ) ? v[0].toFixed(0) : undefined;
            }
        };
    }
    
    // Where possible, assume that push current stats has already been called as it's a slower set of data.
    push_data_frame() {
        
        const s = this.stats;
        const t = this.timeElapsed;
        for (const [k,v] of Object.entries(s) ) {
            if ( k in this.dataFrame ) {
                this.dataFrame[k].data.push( [ t, array_average(v) ] );
            }
        }
        //this.dataFrame['temperature'].data.push( [ t, this.get_average_() ] );
        
        // Molecule inventory
        const n = this.moletypeNames.length;       
        let name = undefined, count = undefined;
        for ( let i = 0; i < n; i++ ) {
            name  = this.moletypeNames[i];
            count = this.moletypeCounts[i];
            this.dataFrame[name].data.push( [ t, count ] );
        }
        

    }
        
    /* Analysis functions for graphing in Chart.JS */
    // The synchronisation functions simply point the data objects within the charts to their equivalents within the simulation so that they are automatically updated with the timestep
    // This is so that when the times come to update, we can just call update_graph().
    
    // Usage scenario: user passes an array of 
    sync_doughnut_graph() {
        const d = this.chartDoughnutGr.data ;        
        d.labels = this.moletypeNames ;
        d.datasets[0].data = this.moletypeCounts ;
        d.datasets[0].backgroundColor = this.moletypeColours ;
    }
    
    sync_bar_graph( arr ) {
        if ( undefined === arr ) { arr = ['energies']; }
        const d = this.chartBarGr.data ; const n = arr.length;
        for ( let i = 0; i < n; i++ ) {
            switch ( arr[i] ) {
                case 'velocities':
                    d.datasets[i] = {
                        label: 'velocities (pm fs⁻¹)',
                        data: [],
                        backgroundColor: 'rgb(72,  96, 128)'
                    }
                    break;
                case 'energies':
                    d.datasets[i] = {
                        label: 'energies (kJ mol⁻¹)',
                        data: [],
                        backgroundColor: 'rgb(72,  96, 128)'
                    }
                    break;                    
                default:
                    throw `Bar graph type ${arr[i]} is not recognised!`;
            }
        }
    }
  
    //Temperature
    sync_line_graph_1() {
        const datasetNew = [];
        this.displayLineGr1.forEach( k => {
            datasetNew.push( this.dataFrame[k] );
        });
        this.chartLineGr1.data.datasets = datasetNew ;
    }
    
    //Copunts of individual molecule types
    sync_line_graph_2( arrEntries ) {
        if ( undefined === arrEntries ) { arrEntries = this.moletypeNames; }
        //this.chartLineGr1.data.labels = arrLabels;        
        const d = this.chartLineGr2.data.datasets = [];
        const n = arrEntries.length;
        let entry = undefined;
        for ( let i = 0; i < n; i++ ) {
            entry = this.dataFrame[ arrEntries[i] ];
            if ( undefined === entry ) { throw `Unrecognised entry for simulation data frame! ${arrEntries[i]}`; }
            d.push( entry );
        }
    }
    
    sync_all_graphs() {
        this.sync_doughnut_graph(); //Molecule composition for now.        
        this.sync_bar_graph(); //Atom velocities for now.
        this.sync_line_graph_1();
        this.sync_line_graph_2();
    }    
    
    inventory_bar_graph() {
        //this.reset_bar_graph();
        const arrVal = [], nBins = 20;
        //var maxVal = 0.0;
        var meanVal = 0.0;
        var temp = undefined ;     
        for (const mol of this.molecules) {
            temp = mol.measure_total_energy();
            //temp = mol.measure_kinetic_energy();
            //temp = mol.v.norm();
            arrVal.push( temp );
            //maxVal = Math.max( maxVal, temp );
            meanVal += temp;
        }
        const maxVal = 3.0* meanVal / this.nMolecules;
        /* Bucket into bins and plot */
        const d = this.chartBarGr.data;
        d.labels = Array.apply(null, Array(nBins)).map(function (x, i) { const a = i * maxVal / nBins ; return a.toFixed(2); }) 
        d.datasets[0].data = Array.apply(null, Array(nBins)).map(function (x, i) { return 0; }) 
        arrVal.forEach( v => {
            temp = Math.floor( nBins * v / ( maxVal * 1.001 ) );
            d.datasets[0].data[temp]++;
        });
        if ( this.chartBarGr != undefined ) { this.chartBarGr.update(); }
    }    
    
    
    update_doughnut_graph() {
        this.chartDoughnutGr.update();
    }
    
    update_line_graphs() {
        if ( this.chartLineGr1.bUpdate ) { this.chartLineGr1.update(); }
        if ( this.chartLineGr2.bUpdate ) { this.chartLineGr2.update(); }
    }
    
    update_all_graphs() {
        this.update_doughnut_graph();
        this.update_line_graphs();        
        if ( this.chartBarGr.bUpdate ) { this.inventory_bar_graph(); }
    }
    
    /*
        Plugin Module section.
        This section is for functionalities that are required only for specific setups.
        Example is the UV emitter module for ozone layer models.
    */
    reset_plugin_modules() {
        for ( let i = 0; i < this.nModules; i++ ) {
            delete this.modules[i];
        }
        this.modules = [];
        this.nModules = 0;
    }
    
    add_plugin_module( m ) {
        this.nModules++;
        m.host = this;
        this.modules.push( m );        
    }
    
    set_module_variable( modType, param, val ) {
        for ( let i = 0; i < this.nModules; i++ ) {
            if ( this.modules[i].modType == modType ) {
                this.modules[i].set_parameter( param, val );
            }
        }
    }
}

/*
    Module to be loaded into the simulation.`
    Not going to worry about the dependence of effective collision cross-section on wavelength and other things.
    See, e.g. Figure 5.02 in: http://www.ccpo.odu.edu/SEES/ozone/class/Chap_5/index.htm    
    Intensity will be in photons per pm per fs. Drawn from a dsitribution.    
    Photon wavelengths will be in nm.
*/
class PhotonEmitterModule {
    
    constructor( args ) {
        if ( undefined === args ) { args = {}; }
        
        this.modType = 'PhotonEmitter';
        
        this.host = undefined; //Should only be defined when attached to a host simulation.
        
        this.model = undefined; // single, gaussian, or solar.        
        this.maxLambda = undefined; //Used for solar
        this.minLambda = undefined; //Used for solar
        this.avgLambda = undefined; //Used for single and spectrum.
        this.sigLambda = undefined; //Used for spectrum. In nm.        
        this.molNamesReaction = undefined; //Allow initiator to define the types of molecules that are allowed to be hit by the photon.
        this.photonColour = undefined;
        
        this.set_emitter_model( args );
        
        this.intensity = undefined;
        
        this.direction = 'down';

        this.pFraction = 0.0;
        
        this.reset_photons();        
        
        // Formula to convert wavelength to energy.
        // 2.998e8 * 6.626e-34 * 6.02214e23 * 1e6 -> kJ nm / mol
        // Divide by 10 again to match the decreased barriers in this simulation.
        this.eFactor = 11963;
        
        // Formula to convert wavelength to momentum.
        // 6.626e-34 / 1e-12 * 1.66054e27 -> amu nm pm / fs
        // Divide by 10 again to match the decreased barriers in this simulation.
        this.mvFactor = 1.1;
        
        this.funcCollRadii = {
            "O₂": PhotonEmitterModule.collision_radii_func_O2,
            "O₃": PhotonEmitterModule.collision_radii_func_O3,
            "I₂": PhotonEmitterModule.collision_radii_func_I2,
        }
    }

    reset_photons() {
        this.numPhotons = 0;
        this.posXPhoton = [];
        this.posYPhoton = [];
        this.LPhoton = [];
    }    
    
    /*
        Add fixed collision cross-section functions based on wavelength.
        1e-18 cm^2 = 100 pm^2. Then square root ( A / PI) to get radii in order to drop down to 2D.
        1 FWHM ~= 2.355 sigma.
        In general, searching for the terms (photo)absorption, photolysis, photodissociation, collision, and/or cross-section should be be useful when looking for the relevant raw data of new species. Should watch out that it is for gas phase data.
    */
    // Imitating UV spectra found in Itikawa et al. (1989), DOI: 10.1063/1.555841
    static collision_radii_func_O2( l ) { return Math.sqrt( 1150 * gaussian(l, 140, 20) / Math.PI); }
    
    // Imitating the UV absorption spectra found in Qu et al. (2015), DOI: 10.1063/1.2001650
    // Use gaussian function: max 1140 pm^2 -> 19 pm in radii. Center of gaussian at 255 nm, with ~17 nm sigma.
    static collision_radii_func_O3( l ) { return Math.sqrt( 1140 * gaussian(l, 255, 17) / Math.PI); }
    
    // Imitating the visual absorption spectra found in Saiz-Lopez et al. (2004), DOI: 10.5194/acp-4-1443-2004
    // NB: The UV band is ignored. The additional vibrational peaks in the green-band is also ignored for simplicity.
    static collision_radii_func_I2( l ) { return Math.sqrt( 310 * gaussian(l, 525, 34) / Math.PI); }
    // For the UV absorption of HI, see: Brion et al. (2005), DOI: 10.1016/j.elspec.2005.01.010

    /*
        Sources: https://stackoverflow.com/questions/3407942/rgb-values-of-visible-spectrum
            Also see older linear approximation by Prof. Bruton: http://www.midnightkite.com/color.html            
    */    
    static convert_wavelength_to_RGBcolour( l ) {
        let t = 0.0, r = 0.0, g = 0.0, b = 0.0;
        if ( l < 400.0 || l > 700 ) { return 'rgb(0,0,0)'; }
        // Determine RGB components separately by three if-chain statements.
        if ( l < 410.0 ) {
            t=(l-400.0)/(410.0-400.0); r=    +(0.33*t)-(0.20*t*t);
        } else if ( l < 475.0 ) {
            t=(l-410.0)/(475.0-410.0); r=0.14         -(0.13*t*t);
        } else if ( l < 545.0 ) {            
            r = 0.0;
        } else if ( l < 595.0 ) {
            t=(l-545.0)/(595.0-545.0); r=    +(1.98*t)-(     t*t);
        } else if ( l < 650.0 ) {
            t=(l-595.0)/(650.0-595.0); r=0.98+(0.06*t)-(0.40*t*t);
        } else {
            t=(l-650.0)/(700.0-650.0); r=0.65-(0.84*t)+(0.20*t*t);
        }        
        //Green band.
        if ( l < 415.0 ) {
            g = 0.0;
        } else if ( l < 475.0 ) {
            t=(l-415.0)/(475.0-415.0); g=             +(0.80*t*t);
        } else if ( l < 590.0 ) {
            t=(l-475.0)/(590.0-475.0); g=0.8 +(0.76*t)-(0.80*t*t);
        } else if ( l < 639.0 ) {
            t=(l-585.0)/(639.0-585.0); g=0.84-(0.84*t)           ;
        }
        // Blue band.
        if ( l < 475.0 ) {
            t=(l-400.0)/(475.0-400.0); b=    +(2.20*t)-(1.50*t*t);
        } else if ( l < 560.0 ) {
            t=(l-475.0)/(560.0-475.0); b=0.7 -(     t)+(0.30*t*t);
        }

        // Report output as string.
        r=Math.floor(r*255.9999); g=Math.floor(g*255.9999); b=Math.floor(b*255.9999);
        return `rgb(${r},${g},${b})`;
    }

    set_emitter_model( args ) {
        //if ( undefined === args ) { throw "Photon Emitter setup needs a model with relevant arguments!"; }
        
        if ( undefined == args.molNamesReaction ) {
            // E.g.: [ "O₂", "O₃" ]
            throw "ERROR: Photon Emitter is missing an array of molecule names that are allowed to be hit by the photon. This is given to the argument molNamesReaction."
        }
        this.molNamesReaction = args.molNamesReaction;
        if ( undefined === args.model ) { args.model = 'single'; }
        this.model = args.model;        
        if ( undefined === args.avgLambda ) { args.avgLambda = 210; }
        if ( undefined === args.sigLambda ) { args.sigLambda =  20; }
        if ( undefined === args.minLambda ) { args.minLambda = 100; }
        if ( undefined === args.maxLambda ) { args.maxLambda = 280; }
        switch ( this.model ) {
            case 'single':
                this.avgLambda = args.avgLambda;
                break;
            case 'gaussian':
                this.avgLambda = args.avgLambda;
                this.sigLambda = args.sigLambda;
                break;
            case 'solar':
                this.minLambda = args.minLambda;
                this.maxLambda = args.maxLambda;
                this.avgLambda = 0.5*(args.maxLambda+args.minLambda);
                break;
            default:
                throw `Unknown model give to Photon emitter! ${this.model}`;
        }

        if ( undefined === args.photonColour ) {
            this.photonColour = PhotonEmitterModule.convert_wavelength_to_RGBcolour( this.avgLambda );
        } else {
            this.photonColour = args.photonColour ;
        }

    }
    
    set_intensity( I ) { this.intensity = I; }
    get_intensity() { return this.intensity; }
        
    calc_photon_energy( l ) { return this.eFactor / l }; // in kJ/mol
    calc_photon_momentum( l ) { return this.mvFactor / l }; // in amu pm fs^-1
    
    // Not currently used. Reserved for future removal of hard-coded functions.
    calc_collision_radii( molName, l ) {
        //Do nothing
    }
    
    sample_photon_spectrum() {
        switch( this.model ) {
            case 'single':
                return this.avgLambda;
            case 'gaussian':
                return this.avgLambda + random_1DGaussian( this.sigLambda );
            case 'solar':
                // Instead of the full black body radiation curve at 5900K...
                // simple bias towards higher wavelengths to approximate the wavelength dependence in the UV regime.
                return this.minLambda + Math.sqrt( Math.random() ) * ( this.maxLambda - this.minLambda );
            default:
                return undefined;
        }
    }   
    
    // Don't worry about other elastic effects like Compton scattering. Assume invisible
    fire_ray_gun() {
        
        this.reset_photons();
        
        //assume direction is down
        const rangeX = this.host.xBounds;
        const rangeY = this.host.yBounds;                
        
        // Get a float number of photons to be expected. Use to keep track of fractional intensities.        
        const increment = this.intensity * ( rangeX[1] - rangeX[0] ) * this.host.dt * this.host.timeFactor;
        this.pFraction += increment;
        
        if ( this.pFraction < 1.0 ) { return; }
        
        const numPhotons = this.numPhotons = Math.floor( this.pFraction );      
        this.pFraction -= numPhotons;        
        const posXPhoton = this.posXPhoton;
        const posYPhoton = this.posYPhoton;
        const LPhoton = this.LPhoton;
        const molInPath = [];
        for ( let j = 0; j < numPhotons; j++ ) {
            posXPhoton.push( random( rangeX[0], rangeX[1] ) ); 
            posYPhoton.push( rangeY[1] );
            LPhoton.push ( this.sample_photon_spectrum() );
            molInPath.push( null );
        }
        
        //Do only for ozone layer equilbrium for now.
        const molNamesReaction = this.molNamesReaction;
        //Determine potential collisions again. Make list of atoms in the path of each photon.
        const mols = this.host.molecules;
        const nMols = this.host.nMolecules;      
        for ( let i = 0; i < nMols ; i++ ) {
            //Check if the molecule is one of the candidates.            
            if ( molNamesReaction.indexOf(mols[i].name) < 0 ) { continue; }
            for (let j = 0 ; j < numPhotons; j++ ) {
                let r = this.funcCollRadii[mols[i].name]( LPhoton[j] );
                if ( Math.abs( mols[i].p.x - posXPhoton[j] ) < r ) {
                    if ( null === molInPath[j] ) {
                        molInPath[j] = mols[i] ;
                        posYPhoton[j] = mols[i].p.y;
                    } else if ( molInPath[j].p.y > mols[i].p.y  ) {
                        molInPath[j] = mols[i] ;
                        posYPhoton[j] = mols[i].p.y;
                    }
                }
            }
        }
        // molInPath now contains the first eligible atom to be hit, if any.        

        for ( let j = 0; j < numPhotons; j++ ) {
            let mol = molInPath[j]; 
            if ( null === mol ) { continue; }            
            //console.log(`A molecule has been hit!`);
            // Hit molecule with photon. Update momentum and energy.
            // NB: single atoms never interact in our model.
            //console.log( mol.name, mol.v.y, mol.om );
            mol.v.y += this.calc_photon_momentum( LPhoton[j] ) / mol.mass;
            const RE    = mol.measure_rotational_energy();
            const RENew = RE + this.calc_photon_energy( LPhoton[j] );
            
            mol.om = ( RE > 0.0 ) ? mol.om * Math.sqrt(RENew/RE) : Math.sqrt( 2.0 * RENew / mol.rotI );
            //Molecule.check_NaN( mol );

        }
        // Molecules hit should now contain sufficient rotational energy for decomposition reactions down the track.
        
        return;        
    }

    // General interface functions with the host simulation.
    set_parameter( param, val ) {
        switch( param ) {
            case 'intensity':
                this.set_intensity( val );
                break;
            default:
                throw `Unknown parameter ${param} given to module ${this.modType}!`;
        }
    }
    
    step_call() { this.fire_ray_gun(); }
    
    draw_call( ctx ) {

        const n = this.numPhotons;
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = this.photonColour;
        for ( let i = 0; i < n; i++ ) {
            ctx.moveTo( this.posXPhoton[i]/globalVars.lengthScale, 0 );
            ctx.lineTo( this.posXPhoton[i]/globalVars.lengthScale, this.posYPhoton[i]/globalVars.lengthScale );
            //console.log( this.posYPhoton[i]/globalVars.lengthScale );
        }
        //ctx.closePath();
        ctx.stroke();
    }
}

/*
    Handles some of the additional manipulations and drawing of volume controls.
    Not all simulation presets need to have its volume adjusted.
*/
class SimulationVolumeModule {
    
}