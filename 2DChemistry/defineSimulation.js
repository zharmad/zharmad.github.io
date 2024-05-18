// Simulation Class to Handle overall simulation operations.
class Simulation {
    constructor() {
        //Molecule Handler
        this.nMolecules = 0;
        this.molecules = [];
        this.moletypeNames   = []; // This one is an array to keep track of order.
        this.moletypeCounts  = []; // All are arrays to make it easy to sync up with chart.js
        this.moletypeColours = [];
        this.numDegrees = 0;
        this.nMoleculesTarget = 0;
        
        //Objects to be initialised.
        this.moleculeLibrary = undefined;
        this.gasComp = undefined;
        this.gasReactions = undefined;
        
        this.moduleDomainDecomposition = undefined;
        
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
        this.bWorldGravity = false ;
        this.world_gravity = new Vector2D( 0, 9.81e-6 ); // Hardcode gravity for now at 10^12 g. Positive y is down for the canvas!
        
        this.timeFactor = 0.001; // Convert time units from picoseconds, by default to femtoseconds.
        this.distScale  = 10; // Convert spatial units. Currently used to convert pm to pixels.        
        
        this.xBounds = new Vector2D(0, 1);
        this.yBounds = new Vector2D(0, 1);
        this.xMaxTarget  = undefined;
        this.xMaxInitial = undefined;
        this.xWallVelNominal  = 0.01; //The nominal scalar value of the wall velocity if the area needs changing.
        this.xWallVel = 0; //The wall velocity seen by molecules when colliding with the shifting boundary.
                
        //Graphical interface
        this.graphicalContext = null ;        
        this.refreshAlpha = 0.4 ;
        this.bDrawMolecules = true;        
        this.molDrawStyle = 'molecule';
        this.molDrawSpeed = 'fast';
        
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
        this.numDegrees = 0;
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
    set_target_nMols_by_density( dens ) { this.nMoleculesTarget = Math.ceil( dens * this.measure_area() ); }
    
    set_world_temperature( T ) { this.temperature = T; }
    get_world_temperature() { return this.temperature; }
    set_bool_heat_exchange( bool ) { this.bHeatExchange = bool; }
    get_bool_heat_exchange() { return this.bHeatExchange; }
    set_bool_world_gravity( bool ) { this.bWorldGravity = bool; }
    get_bool_world_gravity() { return this.bWorldGravity; }
  
    set_world_length_scale( x ) {
        this.distScale = x ;
        if( this.bSet ) { this.moleculeLibrary.set_current_image_all( this.molDrawStyle, this.distScale ); }
    }
    get_world_length_scale() { return this.distScale; }
    set_world_time_factor( x ) { this.timeFactor = x ; }
    get_world_time_factor() { return this.timeFactor; }  
    
    set_refresh_alpha( x ) { this.refreshAlpha = x; }   

    set_bool_draw_molecules( bool ) { this.bDrawMolecules = bool; }
    
    set_molecule_draw_style( val ) {
        this.molDrawStyle = val;
        if( this.bSet ) { this.moleculeLibrary.set_current_image_all( this.molDrawStyle, this.distScale ); }
    }
    
    set_molecule_draw_speed( val ) { this.molDrawSpeed = val; }    
    
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
        this.xBounds[1] = xMax * this.distScale;
        this.yBounds[1] = yMax * this.distScale;
        this.xMaxTarget = this.xMaxInitial = this.xBounds[1];        
    }
    set_world_area_percentage( p ) {
        this.xMaxTarget = 0.01 * p * this.xMaxInitial;
    }    
    
    update_values_from_globals() {
        this.set_world_time_factor( globalVars.timeFactor );
        this.set_world_time_delta( globalVars.timeDelta );
        this.set_world_length_scale( globalVars.distScale );
        this.set_world_boundaries( globalVars.worldWidth, globalVars.worldHeight );
        this.set_world_temperature( globalVars.temperature );
        this.set_bool_heat_exchange( globalVars.bHeatExchange );
        this.set_bool_world_gravity( globalVars.bWorldGravity );
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
            pInit = this.get_random_position( moltype.size );
            //this.find_open_position( moltype.size ); //No need. Will sort out afterwards.
            mol = this.moleculeLibrary.create_molecule( moltype, { bSample: true, T: this.temperature, p: pInit } );
            this.molecules.push( mol );
            this.nMolecules++; 
        }
        this.numDegrees += mol.numDegrees * n;
        this.moletypeCounts[j] += n;
    }
    
    // Add one molecule.
    add_molecule( mol ) {
        this.molecules.push( mol );
        this.nMolecules++; this.numDegrees += mol.numDegrees;
        const j = this.moletypeNames.indexOf( mol.name );
        this.moletypeCounts[j]++;
    }        
    // Move references to molecules around. Does update global statistics.
    remove_molecule( mol ) {
        const i = this.molecules.indexOf( mol );
        delete this.molecules[i];
        this.molecules[i] = this.molecules[this.nMolecules-1];
        this.molecules.pop();        
        this.nMolecules--; this.numDegrees -= mol.numDegrees;
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
        this.nMolecules = 0, this.numDegrees = 0;
                
        const obj = this.gasComp.get_components();
        this.initialise_moletype_accounting( this.gasComp.get_component_names() );
        
        // Initial safety check.
        this.constrain_maximum_density();

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
        
        // Do one-round of initial correction.
        this.shift_overlapping_molecules( 10 );
        
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
        
        //Synchronise and set up graph data.
        this.bSet = true;
        console.log(`Build complete. Created ${this.nMolecules} molecules.`);
    }   

    // This is meant to be all-encompassing so that it should pass a self-check.
    async regenerate_simulation(args) {
        
        this.bSet = false;
        this.timestep    = 0;
        this.timeElapsed = 0.0;
        
        this.update_values_from_globals();
        //this.initialise_molecules_libraries(args);        
        
        // Make sure the gas composition is standardised.
        this.gasComp.normalise();    
        
        this.build_simulation();
        
        // Setup the individual element images
        //this.moleculeLibrary.tableOfElements.create_all_images( 1.0/this.distScale );        
        //this.moleculeLibrary.create_all_images();
        let makeImagePromise = new Promise( function( resolve, reject ) {
            sim.moleculeLibrary.create_image_set_from_array( sim.moletypeNames );        
            sim.moleculeLibrary.set_current_image_from_array( sim.moletypeNames, sim.molDrawStyle, sim.distScale );
            resolve();
            reject();
        });
        
        if ( undefined === this.moduleDomainDecomposition ) {
            this.moduleDomainDecomposition = new DomainDecompositionHandler( this );
        }
        this.moduleDomainDecomposition.tune_parameters_for_simulation();
        if ( this.nMolecules > 500 ) {
            this.collisionDetectMethod = "DomainDecomposition";
        } else {
            this.collisionDetectMethod = "standard";
        }        
        
        //this.reset_line_graph();
        
        //Initial setup of statistical data.
        this.update_statistics();
        this.push_current_stats();        
        this.push_data_frame_composition();
        
        //Graph inital velocities.
        this.sync_all_graphs();
        this.update_all_graphs();
        
        this.run_self_check();
        
        // Make sure all molecule images have finished loading before making the first draw call.
        await makeImagePromise;
        this.draw_background(1.0);
        this.draw_molecules_initial_wait();
        //await makeDomainDecompPromise;
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

    constrain_maximum_density() {
        // Inverse density measures the average amount of space available to each molecule.
        const limitRatio = 0.4 ;
        const area = this.measure_area() * 1e-6 ;
        const targetAreaPerMol = area / this.nMoleculesTarget;
        let maxMolArea = 0.0, molArea = 0.0;
        for (const name of Object.keys( this.gasComp.data ) ) {
            molArea = this.moleculeLibrary.get_molecule_property( name, 'area' );
            maxMolArea = Math.max( maxMolArea, molArea );
        }
        maxMolArea *= 1e-6 ;
        //console.log( this.nMoleculesTarget, area, targetAreaPerMol, maxMolArea );
        if ( targetAreaPerMol < maxMolArea / limitRatio ) {
            const nMoleculesNew = Math.floor( limitRatio * area / maxMolArea );
            console.log( `Too dense! Reducing the target number of molecules from ${this.nMoleculesTarget} to ${nMoleculesNew}.` );
            this.nMoleculesTarget = nMoleculesNew;
        }
    }

    // This is responsible for wiping previous images.
    draw_background( alpha ) {
        if ( alpha === undefined ) { alpha = this.refreshAlpha; }
        const ctxLoc = this.graphicalContext ;
        var wWindow = ctxLoc.canvas.width, hWindow = ctxLoc.canvas.height;
        const wSim = this.xBounds[1] / this.distScale;
        const hSim = this.yBounds[1] / this.distScale;
        if ( wSim < wWindow ) {
            ctxLoc.fillStyle = `#494952`;
            ctxLoc.fillRect(wSim, 0, wWindow, hWindow);
            wWindow = wSim;
        }
        if ( hSim < hWindow ) {
            ctxLoc.fillStyle = `#494952`;
            ctxLoc.fillRect(0, hSim, wWindow, hWindow);
            hWindow = hSim;
        }        
        ctxLoc.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctxLoc.fillRect(0, 0, wWindow, hWindow);
        ctxLoc.lineWidth = 2;
        ctxLoc.strokeStyle = '#221100';
        ctxLoc.strokeRect(0, 0, wWindow, hWindow);

        //Draw on the back of canvas.
        //context.globalCompositeOperation = 'destination-over';
        //Draw on the front again
        //context.globalCompositeOperation = 'source-over';
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
        
        //Call the relevant function for molecule drawing.
        this.draw_molecules();
    }

    /*
        There is some sort of race-condition problem with Firefox when the molecule image are being created on initial page load,
        where the canvas.drawImage simply refuses to work.
        Use molArcs as a work-around while we figure out if it can be fixed.
    */
    draw_molecules_initial_wait() {
        var bReady = false;
        while ( !bReady ) {
            bReady = this.moleculeLibrary.checkif_image_created( this.moletypeNames );
        }

        this.draw_molecules_as_molArcs();
    }
    
    // Draw everything.
    draw_molecules() {
        
        if ( "fast" == this.molDrawSpeed ) {
            for (const mol of this.molecules) { mol.draw( this.graphicalContext ); }
        }
        if ( "slow" == this.molDrawSpeed ) {
            if ( "molecule" == this.molDrawStyle ) {
                this.draw_molecules_as_molArcs();
            } else {
                for (const mol of this.molecules) { mol.draw_as_atom_circles( this.graphicalContext ); }
            }
        }
    }
    
    // Draw onlt the set of molecules that are given.
    draw_molecules_array( arr ) {
        if ( "fast" == this.molDrawSpeed ) {
            for ( const mol of arr ) { mol.draw( this.graphicalContext ); }
        }
        if ( "slow" == this.molDrawSpeed ) {
            if ( "molecule" == this.molDrawStyle ) {
                for ( const mol of arr ) { mol.draw_as_one_molecule( this.graphicalContext ); }
            } else {
                for ( const mol of arr ) { mol.draw_as_atom_circles( this.graphicalContext ); }
            }
        }        
    }
    
    // Uses the canvas fill and stroke mechanism. Slower under current browsers.
    draw_molecules_as_molArcs() {
   
        const ctxLoc = this.graphicalContext;
        //Collect every atom grouped by molecule colour.
        const xPos = {}, yPos = {}, rads = {}, colours = {};
        for ( const name of this.moletypeNames ) {
            xPos[name] = []; yPos[name] = []; rads[name] = [];
            colours[name] = this.moleculeLibrary.get_entry(name).molColour;
        }
        for (const mol of this.molecules) {
            for (let i = 0; i < mol.nAtoms; i++) {
                const off = Vector2D.rotate( mol.atomOffsets[i], mol.th );                
                xPos[mol.name].push( (mol.p.x + off.x) / globalVars.distScale );
                yPos[mol.name].push( (mol.p.y + off.y) / globalVars.distScale );
                rads[mol.name].push( mol.atomRadii[i] / globalVars.distScale );
            }
        }
        
        //Draw one path for each colour.
        for ( const name of this.moletypeNames ) {
            ctxLoc.beginPath();                
            ctxLoc.fillStyle = colours[name];
            ctxLoc.lineWidth = 1;
            ctxLoc.strokeStyle = 'black';
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

    //Assign positions once and for all to reduce pointer chasing in the pair-computation.
    set_WASM_memory_block() {        
        this.memWASM = {};
        var offset = 0, nMol = this.nMolecules;
        this.memWASM.xPos = new Float32Array(WASM.mem.buffer, offset, nMol);
        offset += nMol * Float32Array.BYTES_PER_ELEMENT;
        this.memWASM.yPos = new Float32Array(WASM.mem.buffer, offset, nMol);
        offset += nMol * Float32Array.BYTES_PER_ELEMENT;
        this.memWASM.sizes = new Float32Array(WASM.mem.buffer, offset, nMol);
        offset += nMol * Float32Array.BYTES_PER_ELEMENT;
        this.memWASM.nPairs = new Int32Array(WASM.mem.buffer, offset, 1);
        offset += 1 * Int32Array.BYTES_PER_ELEMENT;
        this.memWASM.arrPairs = new Int32Array(WASM.mem.buffer, offset, nMol);
    }
    
    copy_position_info_to_memory( nMol, xPos, yPos, sizes ) {
        for ( let i = 0; i < nMol; i++ ) {
            const p = this.molecules[i].p;
            xPos[i] = p.vec[0];
            yPos[i] = p.vec[1];
            sizes[i] = this.molecules[i].size;
        }        
    }
    
    shift_overlapping_molecules( nMaxSteps ) {
        const nMol = this.nMolecules;
        let countPrev = undefined;
        for ( let s = 0; s < nMaxSteps; s++ ) {
            let count = 0;
            for ( let i = 0; i < nMol-1; i++ ) {
                for ( let j = i+1; j < nMol; j++ ) {
                    count += Molecule.fix_potential_overlap( this.molecules[i], this.molecules[j] );                    
                }
            }
            console.log( `Initial jitter to resolve collisions: step ${s} results in ${count} shifts.`);
            if ( count < 0.05 * nMol ) {
                console.log( "....overlap rate is now satisfactory." );
                return;
            }
            if ( undefined === countPrev ) {
                countPrev = count;
                continue;
            } else if ( count / countPrev > 0.9 ) {
                    console.log( "....overlap rate is not improving significantly. Skipping rest." );
                    return;
            }
            countPrev = count;
        }
        console.log( "....maximum steps have been reached." );
    }
    
    // This O(n^2) step takes the most time. 32 of 80 seconds on last check for ~2000 molecule system.
    // TODO: Try emscripten -> Webassembly this piece of code.
    detect_potential_collisions() {
                
        const nMol = this.nMolecules;
        const molPairs = []; //Pairs of actual moleculee objects, rather than just their references.
        
        const str = this.collisionDetectMethod;
        //const str = "standard";
        switch ( str ) {
            case "DomainDecomposition": 
                const idPairs = this.moduleDomainDecomposition.detect_potential_collisions();
                const nProx = idPairs.length;
                //console.log(`Number of proximal pairs: ${nProx}`);
                for ( let i = 0; i < nProx; i++ ) {
                    molPairs.push([
                        this.molecules[ idPairs[i][0] ],
                        this.molecules[ idPairs[i][1] ],
                    ]);
                }
                //this.debug_validate_proximal_pairs( molPairs );
                break;
            case "WASM":
                //Get arrays and points to WASM memory locations.
                this.set_WASM_memory_block();            

                this.copy_position_info_to_memory( nMol, this.memWASM.xPos, this.memWASM.yPos, this.memWASM.sizes );
            
                // void detect_collisions(int n, float* x, float* y, float* r, int* nPairs, int* pairs) {
                WASM.instance.exports.detect_collisions(
                    nMol, this.memWASM.xPos.byteOffset, this.memWASM.yPos.byteOffset, this.memWASM.sizes.byteOffset,
                    this.memWASM.nPairs.byteOffset, this.memWASM.arrPairs.byteOffset,
                );
                const nPairs   = this.memWASM.nPairs[0];
                const arrPairs = this.memWASM.arrPairs;
                if ( nPairs == 0 ) { return molPairs; }
                for( let i = 0; i < 2 * nPairs; i += 2 ) {
                    molPairs.push( [ this.molecules[ arrPairs[i] ], this.molecules[ arrPairs[i+1] ] ] );
                }
                break;
            case "standard":
            default:
                var xPos = new Float32Array(nMol);
                var yPos = new Float32Array(nMol);
                var sizes = new Float32Array(nMol);

                this.copy_position_info_to_memory( nMol, xPos, yPos, sizes );                
                for (let i = 0; i < nMol-1; i++) {            
                    for (let j = i + 1; j < nMol; j++ ) {
                        var sepSq = (xPos[j]-xPos[i])*(xPos[j]-xPos[i]) + (yPos[j]-yPos[i])*(yPos[j]-yPos[i]);
                        if ( sepSq < (sizes[j]+sizes[i])*(sizes[j]+sizes[i]) ) {
                            molPairs.push( [ this.molecules[i], this.molecules[j] ] );
                        }
                    }
                }               
        }
        // const time4 = Date.now();        
        // console.log( time2-time1, time4-time3, (time4-time3)/(time2-time1) );
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
                this.draw_molecules_array( arrAdd );
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
        if ( this.bWorldGravity ) {            
            for (const mol of this.molecules) {
                mol.update_position_with_acceleration( dt, this.world_gravity );
            }
        } else {
            for (const mol of this.molecules) {
                mol.update_position( dt );
            }
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
        const wallVel = this.xWallVelNominal * this.distScale;
        if ( this.xMaxTarget > this.xBounds[1] ) {
            this.xWallVel = wallVel ;
            this.xBounds[1] += wallVel * this.dt;
            if ( this.xMaxTarget < this.xBounds[1] ) { this.xBounds[1] = this.xMaxTarget; } 
        } else if ( this.xMaxTarget < this.xBounds[1] ) {
            this.xWallVel = -wallVel;
            this.xBounds[1] -= wallVel * this.dt;
            if ( this.xMaxTarget > this.xBounds[1] ) { this.xBounds[1] = this.xMaxTarget; }             
        } else {
            this.xWallVel = 0;
        }
        
        // Resolve any collision with the walls.
        let totalMomentumTransfer = 0.0;
        for (const mol of this.molecules) {
            //Shift molecules            
            totalMomentumTransfer += this.process_wall_collisions(mol);            
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

    debug_validate_proximal_pairs( molPairs ) {
        const nPairs = molPairs.length;
        for ( let i = 0; i < nPairs; i++ ) {
            const mol1 = molPairs[i][0], mol2 = molPairs[i][1];
            if ( undefined === mol1 || undefined === mol2 ) {
                throw "ERROR: molecule pairs contain undefined entries!";
            }
            if ( mol1 === mol2 ) { throw "ERROR: collision pairs contains pairs that collide with themselves!"; } 
            const bNear = Molecule.check_proximity( mol1, mol2 );
            if ( ! bNear ) {
                console.log( pair[0], pair[1], d );
                throw "ERROR: collision pairs are not actually in proximity!";
            }            
        }
        console.log("Proximal pairs validated to be indeed all proximal.");
    }

    // TO-DO: switch to the rigid body collide with the wall.
    // const vel1PInit = vInit1 + scalar_cross( om, sep1P );
    // const w = (rotI != null ) ? sep1P.cross(vecN)**2.0/rotI : 0.0;
    // const f = 1.0 / ( 1.0/mass + w ) ;
    // const impulse = f * vel1PInit.dot(vecN) * (1 + elasticity) ;
    process_wall_collisions(mol) {
        const frac = 0.5; // Temporary placeholder for heat exchange efficiency.
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
        if ( !bCollideX && !bCollideY ) { return 0.0 }
        
        if ( this.bHeatExchange ) {
            // TODO: Add heat exchagne coefficient via frac .
            // mol.resample_speed( this.temperature * 1.26 );
            // mol.resample_omega( this.temperature * 1.26 );
            mol.resample_speed( this.temperature * 1.38 );
            //mol.resample_speed( this.temperature );
            mol.resample_omega( this.temperature );
        }
        
        if ( bMovingWall ) { mol.v.x += 2.0 * this.xWallVel } 

        // Open question: Do I account for shear froces as well? 
        // IF NO:
        if ( bCollideX ) {
            return mol.mass * Math.abs( mol.v.x - vInit.x );
        } else if ( bCollideY ) {
            return mol.mass * Math.abs( mol.v.y - vInit.y );
        } else {
            return mol.mass * mol.v.dist(vInit);
        }
        // IF YES:
        //return mol.mass * mol.v.dist(vInit);
    }
    
    /* Cheapouts when the value has already been done */
    get_current_stat( key ) {
       return this.stats[key][0];
    }
    get_average_stat( key ) {
        return array_average( this.stats[key] );
    }    
    
    /* General analysis functions*/
    measure_area() {
        return ( this.xBounds[1] - this.xBounds[0] ) * (this.yBounds[1] - this.yBounds[0] );
    }
    
    // This alternate method is consistent with kinetic theory, but is more volatile.
    measure_temperatureB() {
        const totKE = this.measure_total_kinetic_energy();
        return totKE / ( this.nMolecules * 8.314 * this.timeFactor**2.0 * 1000 ) ;
    }
    
    // The current method includes internal energies, which isn't technically not the Kelvin temperature.
    measure_temperature() {
        // Note: the minus 3 comes from the constraints on setting the center of mass and rotation to zero.
        const totE = this.measure_total_energy();
        return totE / ( 0.5 * (this.numDegrees - 3) * 8.314 * this.timeFactor**2.0 * 1000 ) ;
    }
    
    measure_perimeter() {
        // In pm
        return 2.0 * ( this.xBounds[1] - this.xBounds[0] + this.yBounds[1] - this.yBounds[0] );
    }
    
    calculate_instant_pressure( totalMomentumTransfer ) {
        // In amu, pm, fs. Need to convert.
        // Report as amu, pm, ps.
        return totalMomentumTransfer / this.measure_perimeter() / this.dt / this.timeFactor**2 ;
    }
       
    report_expected_pressure_from_ideal_gas_law() {
        // Report as amu, pm, ps.
        // Apply 2/3 factor to Boltzmann's constant here for 2D values.
        let pExpect  = 0.008314 * this.get_average_stat('temperature') * this.get_average_stat('density') ;
        let pMeasure = this.get_average_stat('pressure');
        console.log( "...Based on averages over last 100 steps:\n", 
            `Expected pressure from PA = nRT is ${pExpect}\n`,
            `Observed pressure from collisions is ${pMeasure}`,
        );
        
        pExpect  = 0.008314 * this.get_data_frame_stat('temperature') * this.get_data_frame_stat('density') ;
        pMeasure = this.get_data_frame_stat('pressure');
        console.log( "...Based on graph data for entire simulation:\n", 
            `Expected pressure from PA = nRT is ${pExpect}\n`,
            `Observed pressure from collisions is ${pMeasure}`,
        );
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

    //Other meesures that depend upon the molecule library.
    measure_total_molecule_area() {
        const n = this.moletypeNames.length;
        const molLib = this.moleculeLibrary;
        let sum = 0.0 ;
        for ( let i = 0; i < n; i++ ) {
            sum += molLib.get_entry( this.moletypeNames[i] ).area * this.moletypeCounts[i];
        }
        return sum;
    }
    
    measure_max_molecule_size() {
        const n = this.moletypeNames.length;
        const molLib = this.moleculeLibrary;
        let max = 0.0 ;
        for ( let i = 0; i < n; i++ ) {
            const s = molLib.get_entry( this.moletypeNames[i] ).size;
            max = ( max < s ) ? s : max;
        }
        return max;
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
        this.create_data_frame_entry( 'area', 'area (nm²)', 'rgb(255,128,0)' );
        this.create_data_frame_entry( 'pressure', 'pressure (amu pm ps⁻² pm⁻¹)', 'rgb(0,255,128)' );
        this.create_data_frame_entry( 'density', 'density (nm⁻²)', 'rgb(128,0,255)' );
        this.create_data_frame_entry( 'numMolecules', '# of molecules', 'rgb(128,128,128)' );
        this.create_data_frame_entry( 'performance', 'simulated-ps per RL-min', 'rgb(128,192,64)' );
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
        this.stats['area'] = [];
        this.stats['density'] = [];        
        this.stats['temperature'] = [];
        this.stats['pressure'] = [];
    }
    
    // Most recent addition is always at the front of the array
    update_statistics() {
        const s = this.stats;
        s.timeElapsed.unshift( this.timeElapsed );
        s.numMolecules.unshift( this.nMolecules );
        s.area.unshift( this.measure_area() * 1e-6 );
        s.density.unshift( this.nMolecules / s.area[0] );
        s.temperature.unshift( this.measure_temperature() );
        //s.pressure.unshift( this.measure_pressure() );
        
        //Pop last entries to maintain length.
        if ( this.statsUpdateInterval < s.timeElapsed.length ) {
            s.timeElapsed.pop();
            s.numMolecules.pop();
            s.area.pop();
            s.density.pop();
            s.temperature.pop();
            s.pressure.pop();
        }
    }
    
    // Always get the latest values only from the arrays.
    push_current_stats() {
        for ( const [ k, v ] of Object.entries( this.stats ) ) {
            if ( k in this.objTextFields ) {
                if ( k === 'timeElapsed' || k === 'pressure' ) {
                    this.objTextFields[k].innerHTML = ( undefined != v[0] ) ? v[0].toFixed(3) : undefined;                
                } else {
                    this.objTextFields[k].innerHTML = ( undefined != v[0] ) ? v[0].toFixed(0) : undefined;
                }
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
        this.dataFrame['performance'].data.push( [ t, this.check_lap_timer() ] );
        
        this.push_data_frame_composition();
    }
    
    push_data_frame_composition() {
        // Molecule inventory
        const t = this.timeElapsed;        
        const n = this.moletypeNames.length;       
        let name = undefined, count = undefined;
        for ( let i = 0; i < n; i++ ) {
            name  = this.moletypeNames[i];
            count = this.moletypeCounts[i];
            this.dataFrame[name].data.push( [ t, count ] );
        }       
    }

    get_data_frame_stat( k, tStart, tEnd ) {
        const arr = this.dataFrame[k].data;
        if ( undefined === tStart ) { tStart = 0.0; }
        if ( undefined === tEnd ) { tEnd = Number.MAX_VALUE; }
        var count = 0, sum = 0.0;
        for ( const [t,v] of arr ) { if ( t >= tStart && t <= tEnd ) { count++; sum += v }; }
        if ( 0 == count ) { return undefined; }
        return sum/count;
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

    //Report as ns per minute in RL.    
    check_lap_timer() {
        const nowRL  = Date.now();
        const nowSim = this.timeElapsed;
        const dtRL  = nowRL  - this.timeRealLife;
        const dtSim = nowSim - this.timeSimulation;
        this.timeRealLife = nowRL;
        this.timeSimulation = nowSim;
        return dtSim / dtRL * 6e4 ;
    }
    
    reset_lap_timer() {
        this.timeRealLife   = Date.now();
        this.timeSimulation = this.timeElapsed;
    }
    
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
            "ClO•": PhotonEmitterModule.collision_radii_func_ClO,
            "ClOO•": PhotonEmitterModule.collision_radii_func_ClOO,
            "ClOOCl": PhotonEmitterModule.collision_radii_func_ClOOCl,
            "Cl₂": PhotonEmitterModule.collision_radii_func_Cl2,
            "Cl₂O": PhotonEmitterModule.collision_radii_func_Cl2O,
            "I₂": PhotonEmitterModule.collision_radii_func_I2,
            "N₂O": PhotonEmitterModule.collision_radii_func_N2O,
            "NO•": PhotonEmitterModule.collision_radii_func_NO,
            "NO₂•": PhotonEmitterModule.collision_radii_func_NO2,
            "NO₃•": PhotonEmitterModule.collision_radii_func_NO3,
            "N₂O₄": PhotonEmitterModule.collision_radii_func_N2O4,
            "N₂O₅": PhotonEmitterModule.collision_radii_func_N2O5
        }
    }

    reset_photons() {
        this.numPhotons = 0;
        this.posXPhoton = [];
        this.posYPhoton = [];
        this.LPhoton = [];
    }    
    
    /*
        Add fixed collision cross-section functions based on wavelength. Inputs are areas in pm^2 and wavelengths in nm.
        1e-20 cm^2 = 1 pm^2. Then square root ( A / PI) to get radii in order to drop down to 2D.
        1 FWHM ~= 2.355 sigma.
        In general, searching for the terms (photo)absorption, photolysis, photodissociation, collision, and/or cross-section should be be useful when looking for the relevant raw data of new species. Should watch out that it is for gas phase data.
        Also note that a database is available at: https://uv-vis-spectral-atlas-mainz.org. DOI: 10.5194/essd-5-365-2013
    */
    // Imitating UV spectra found in Itikawa et al. (1989), DOI: 10.1063/1.555841
    static collision_radii_func_O2( l ) { return Math.sqrt( 1150 * gaussian(l, 140, 20) / Math.PI); }
    
    // Imitating the UV absorption spectra found in Qu et al. (2015), DOI: 10.1063/1.2001650
    // Use UV-vis databse graphs, both Hartley band and VUV peaks.
    static collision_radii_func_O3( l ) {
        return Math.sqrt( 2300 * gaussian(l, 122, 2.1) / Math.PI) + Math.sqrt( 1500 * gaussian(l, 133, 3) / Math.PI) + Math.sqrt( 1140 * gaussian(l, 255, 17.6) / Math.PI);
    }

    //Chlorine species taken from UV-VIS database.
    static collision_radii_func_Cl2( l ) { return Math.sqrt(  26 * gaussian(l, 330, 26) / Math.PI); }
    static collision_radii_func_Cl2O( l ) {
        return  Math.sqrt( 2000 * gaussian(l, 135, 17) / Math.PI) + Math.sqrt( 1700 * gaussian(l, 171, 7.2) / Math.PI) + Math.sqrt( 180 * gaussian(l, 270, 21) / Math.PI);
    }
    static collision_radii_func_ClO( l ) { return Math.sqrt( 550 * gaussian(l, 268, 17) / Math.PI); }
    static collision_radii_func_ClOO( l ) { return Math.sqrt( 2500 * gaussian(l, 245, 13) / Math.PI); }
    static collision_radii_func_ClOOCl( l ) {
        return Math.sqrt( 640 * gaussian(l, 246, 13) / Math.PI) + Math.sqrt( 1280 * gaussian(l, 146, 38) / Math.PI);
    } //Second one is a guess because data do not extend into the far UV, but we know there is an absoprtion peak lower down.

    // Modelled UV absorption of NOx species as follows. Note double gaussian in NO2.   
    // 
    // N2O: Gaussian fit to Table 1, Carlon et al. (2010). DOI: 10.5194/acp-10-6137-2010
    // NO: Very approximate fit to source data. See UV-vis database.
    // NO2: Gaussian guesses based on Schneider et al. (1987). DOI: 10.1016/1010-6030(87)85001-3  . Also see Fig3 3 in paper below.
    // NO3: Photolysed very quickly during the day. See Fig. 5 of Bingen et al. (2019). DOI: 10.3389/fenvs.2019.00118
    // N2O5: UV-Vis database, straight-forward. 4e-17 cm^-2 & FWHM of 46 nm
    static collision_radii_func_N2O( l ) {
        return  Math.sqrt( 2800 * gaussian(l, 112, 3.4) / Math.PI) + Math.sqrt( 8600 * gaussian(l, 129, 3.4) / Math.PI) + Math.sqrt( 700 * gaussian(l, 146, 3.4) / Math.PI);
     }
    static collision_radii_func_NO(  l ) {
        return Math.sqrt( 250 * gaussian(l, 120, 12) / Math.PI + 250 * gaussian(l, 140, 12) / Math.PI +  300 * gaussian(l, 180, 12) / Math.PI ) ;
    }    
    static collision_radii_func_NO2( l ) {
        return Math.sqrt(  40 * gaussian(l, 215, 14) / Math.PI + 60 * gaussian(l, 400, 50) / Math.PI);
    }        
    static collision_radii_func_NO3( l ) {
        return Math.sqrt( 300 * gaussian(l, 570, 46) / Math.PI + 2000 * gaussian(l, 662,  4) / Math.PI);
    } //Note: NO3 radicals look blue.    
    //static collision_radii_func_N2O3( l ) {
        // return Math.sqrt( 4000 * gaussian(l, 160, 20) / Math.PI );
    //} //Note: There is one, but the only dataset doesn't show a clean peak at all. Probably one at 190nm like N2O4.
    static collision_radii_func_N2O4( l ) {
        return Math.sqrt( 5400 * gaussian(l, 188, 15) / Math.PI  +  70 * gaussian(l, 339, 18) / Math.PI );
    }   // Model two of three easily resolved peaks.
    static collision_radii_func_N2O5( l ) {
        return Math.sqrt( 4000 * gaussian(l, 160, 20) / Math.PI );
    }

    
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
                if ( undefined === args.photonColour ) {
                    args.photonColour = PhotonEmitterModule.convert_wavelength_to_RGBcolour( args.avgLambda );
                }
                this.avgLambda = args.avgLambda;                
                break;
            case 'gaussian':
                this.avgLambda = args.avgLambda;
                this.sigLambda = args.sigLambda;
                break;
            case 'sqrt-bias':
            case 'solar':
                this.minLambda = args.minLambda;
                this.maxLambda = args.maxLambda;
                this.avgLambda = 0.5*(args.maxLambda+args.minLambda);
                break;
            default:
                throw `Unknown model give to Photon emitter! ${this.model}`;
        }

        if ( undefined === args.photonColour ) {
            // this.photonColour = PhotonEmitterModule.convert_wavelength_to_RGBcolour( this.avgLambda );
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
            case 'sqrt-bias':
                // Instead of the full black body radiation curve at 5900K...
                // simple bias towards higher wavelengths to approximate the wavelength dependence in the UV regime.
                return this.minLambda + Math.sqrt( Math.random() ) * ( this.maxLambda - this.minLambda );            
            case 'solar':
                // TODO.
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
        if ( undefined === this.photonColour) {            
            ctx.lineWidth = 1;
            for ( let i = 0; i < n; i++ ) {
                ctx.beginPath();
                ctx.strokeStyle = PhotonEmitterModule.convert_wavelength_to_RGBcolour( this.LPhoton[i] );
                ctx.moveTo( this.posXPhoton[i]/globalVars.distScale, 0 );
                ctx.lineTo( this.posXPhoton[i]/globalVars.distScale, this.posYPhoton[i]/globalVars.distScale );
                ctx.stroke();
                //console.log( this.posYPhoton[i]/globalVars.distScale );
            }
        } else {
            ctx.beginPath();
            ctx.lineWidth = 1;            
            ctx.strokeStyle = this.photonColour;
            for ( let i = 0; i < n; i++ ) {
                ctx.moveTo( this.posXPhoton[i]/globalVars.distScale, 0 );
                ctx.lineTo( this.posXPhoton[i]/globalVars.distScale, this.posYPhoton[i]/globalVars.distScale );
                //console.log( this.posYPhoton[i]/globalVars.distScale );
            }
            ctx.stroke();            
            //ctx.closePath();
        }       
    }
}

/*
    Handles some of the additional manipulations and drawing of area controls.
    Not all simulation presets need to have its area adjusted.
*/
class SimulationAreaModule {
    
}