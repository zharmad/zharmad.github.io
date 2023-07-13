/*
    Molecule class that handles everything about a single entity in the simulation.
    = = = = =
    The basic premise is that all molecules will behave as rigid circlular bodies undergoing elastic 2D collisions, regardless of its interior geometry. Thus each molecule has an aggregate position and velocity vector associated with its center of mass, which simplifies collision detection.
    
    Assumes that a global tableOfElements is available.
    
    Default conversion rate to pixels:
    100 pm -> 10 px -> 1 Angs.
*/

// Declare all multi-atom molecules that are supported by this script. Internal offsets positions for drawing purposes.
// Atoms are stated in their draw order. The internal X/Y-axis are defined according to potential molecular dipoles.

/*
    This class is the overall handler for elements and molecule types. It is responsible for generating individual molecules based on their properties.
    defines the types of molecules that are supported. It handles the properties that are shared across all copies of such a molecule type:
    - n, atoms, offsets, mass, rotI, size, colours, molColours 
    
    The convention for the orientation of the molecule is this:
    - the x-axis defines axis of the major bidirectional decomposition for a given molecule.
    - the heavier atom will go first.
*/
class MoleculeLibrary {
      
    constructor() {
        this.numEntries = 0;
        this.entries = {} ;
        this.collisionRadiiFactor = 1.0;
        
        this.tableOfElements = new ElementList();
        this.tableOfElements.add_all_known_elements();
        this.tableOfElements.rescale_radii( 0.75 );
    }
    
    //Does not update all molecule types.    
    get_defined_molecules() { return Object.keys(this.entries); }
    get_entry(name) { return this.entries[name]; }
    get_molecule_property(name, prop) { return this.entries[name][prop]; }    
    get_molecule_color(name) { return this.entries[name].molColour; }
    
    reset_library() {
        delete this.entries;
        this.entries = {};
        this.numEntries = 0;
        this.tableOfElements.reset_table();
        this.tableOfElements.rescale_radii( 0.75 );
    }

    add_entry_old( name, atoms, offsets, molColour ) {    
        const args = { name, atoms, offsets };
        if ( undefined != molColour ) { args.molColour = molColour };        
        args.collisionRadiiFactor = this.collisionRadiiFactor;
        args.tableOfElements = this.tableOfElements;        
        this.entries[name] = new MoleculeType( args );
        this.numEntries++;        
    }
    
    add_entry( args ) {
        const name = args.name;
        args.collisionRadiiFactor = this.collisionRadiiFactor;
        args.tableOfElements = this.tableOfElements;        
        this.entries[ name ] = new MoleculeType( args );
        this.numEntries++;
    }
    
    add_entry_atomic( args ) {
        const e = args.element;
        args.name = e; args.atoms = [ e ]; args.offsets = [ [0.0,0.0] ];
        if ( undefined === args.DeltaH ) { args.DeltaH = 0.0; }
        this.add_entry( args );
    }

    add_entry_atomic_radical( args ) {
        const e = args.element;
        args.name = e+"•"; args.atoms = [ e ]; args.offsets = [ [0.0,0.0] ];
        if ( undefined === args.DeltaH ) { args.DeltaH = 0.0; }
        this.add_entry( args );
    }

    add_entry_diatomic( args ) {
        const e = args.element, r = args.radius;
        args.name = e+"₂"; args.atoms = [ e,e ] ; args.offsets = [ [r,0.0],[-r,0.0] ];
        if ( undefined === args.DeltaH ) { args.DeltaH = 0.0; }
        this.add_entry( args );
    }
    
    add_entry_molecule_radialsymmetric( args ) {
        const e1 = args.element1, e2 = args.element2, r = args.radius, n = args.n;
        const dictSubscript = { 2: "₂", 3: "₃", 4:"₄", 5:"₅", 6:"₆" };
        args.name = e1 + e2 + dictSubscript[n];
        args.atoms = []; args.offsets = [];
        for ( let i=0; i<n; i++ ) {
            args.atoms.push( e2 );
            args.offsets.push( [ r * Math.cos( 2.0 * Math.PI * i / n ), r * Math.sin( 2.0 * Math.PI * i / n ) ] );
        }
        args.atoms.push( e1 ); args.offsets.push( [0.0,0.0] );
        if ( undefined === args.DeltaH ) { args.DeltaH = 0.0; }
        this.add_entry( args );
    }
    
    // Inefficient, but may be useful later.
    set_molecule_colour( molName, strColour ) {
        this.entries[molName].set_molecule_colour( strColour );
    }
    
    // Leave room for monoatomid, diatomic and polyatomic later.
    create_molecule( moltype, args ) {
        if ( undefined === args ) { args = {}; }
        var mol = undefined;
        if ( moltype.numAtoms > 1 ) {
            mol = new MoleculePolyatomic( moltype, args );
        } else {
            mol = new MoleculeMonoatomic( moltype, args );            
        }
        if ( undefined === mol.name ) { throw "Moltype argument not recognised! Did you mean create_molecule_by_name?"; }
        return mol;
    }
    
    create_molecule_by_name( molname, args ) {
        const moltype = this.get_entry( molname );
        return this.create_molecule( moltype, args );
    }
    
    duplicate_molecule( mol ) {
        const molNew = this.create_molecule_by_name( mol.name, { p: mol.p, v: mol.v, th: mol.th, om: mol.om } );
        return molNew;
    }   
       
    // Meant to be an internal check
    check_com( molName ) {
        const e = this.entries[molName];
        var m = undefined;
        const pCOM = new Vector2D( 0.0, 0.0 );
        for ( let i = 0; i < e.numAtoms; i++ ) {
            m = this.tableOfElements.get_by_name( e.atoms[i] ).mass;
            pCOM.sincr( m, e.atomOffsets[i] );
        }
        pCOM.scale( 1.0 / e.mass );
        console.log( `Computed center of mass: ${pCOM.x} , ${pCOM.y}` );
    }
    
    check_com_all() {
        var m = undefined;
        const pCOM = new Vector2D( 0.0, 0.0 );
        for ( const molName of this.get_defined_molecules() ) {
            let e = this.entries[molName];
            m = 0; pCOM.reset();
            for ( let i = 0; i < e.numAtoms; i++ ) {
                m = this.tableOfElements.get_by_name( e.atoms[i] ).mass;
                pCOM.sincr( m, e.atomOffsets[i] );
            }
            pCOM.scale( 1.0 / e.mass );
            console.log( `Computed center of mass for ${molName}: ${pCOM.x} , ${pCOM.y}` );
        }
    }
    
    // Use PapaParse 5 plugin to import a CSV file as objects:
    // https://www.papaparse.com
    test_papa( fileLocation ) {
        if ( undefined === fileLocation ) { fileLocation = "lib/moleculeDefinitions.csv"; }
        const o = Papa.parse( fileLocation, {
            header: true,
            dynamicTyping: true,
        });
        return o;
    }
    
    add_all_known_molecule_types() {
        /*
            Geometries are drawn from experimental geometries of the NIST database at https://cccbdb.nist.gov/introx.asp
            All geometries are of the ground state. 3D molecules will, of course, be flattened.
            Heat of formation dataset at 298 K are drawn from ANL: https://atct.anl.gov/Thermochemical%20Data/version%201.118/       
        
            Main properties to be defined are: name, atoms, offsets, molColour, DeltaH
            
            Diatomic elements default to horizontal orientation with [+X,0] and [-X,0].            
        */
        
        // Single atoms
        this.add_entry_atomic({ element: "He" });
        this.add_entry_atomic({ element: "Ne" });
        this.add_entry_atomic({ element: "Ar" });
        this.add_entry_atomic({ element: "Kr" });
        this.add_entry_atomic({ element: "Xe" });
        this.add_entry_atomic_radical({ element: "H",  DeltaH: 218, molColour: "rgb(251,236,93)" }); //Maize yellow. 
        this.add_entry_atomic_radical({ element: "N",  DeltaH: 472, molColour: "rgb(40,46,127)" }); //Darker shade for radical
        this.add_entry_atomic_radical({ element: "O",  DeltaH: 249, molColour: "rgb(127,40,46)" }); //Darker shade for radical
        this.add_entry_atomic_radical({ element: "Cl", DeltaH: 121, molColour: "rgb(80,128,16)" }); //Darker shade for radical
        this.add_entry_atomic_radical({ element: "Br", DeltaH: 112, molColour: "rgb(86,24,16)" }); //Darker shade for radical
        this.add_entry_atomic_radical({ element: "I",  DeltaH: 107, molColour: "rgb(90,30,110)" }); //Darker shade for radical

        // Simple molecules 
        this.add_entry_diatomic( { element: "H", radius: 37.1 } );
        this.add_entry_diatomic( { element: "N", radius: 54.9 } );
        this.add_entry_diatomic( { element: "O", radius: 60.4 } );        
        this.add_entry_diatomic( { element: "Cl", radius: 99.4 } );
        this.add_entry_diatomic( { element: "Br", DeltaH: 31, radius: 114.1 } ); //liquid at room temperature so deltaH not zero.
        this.add_entry_diatomic( { element: "I", DeltaH: 62, radius: 133.3 } ); 
        
        this.add_entry({ name: "H₂O", atoms: ["H","H","O"],
            offsets: [ [-52.0,75.7],[-52.0,-75.7],[6.6,0.0] ],
            DeltaH: -242, molColour: "#AFE4DE",            
        });
        this.add_entry_molecule_radialsymmetric({ element1: "C", element2: "H", n: 4, radius: 108.7, DeltaH:  -75 }); // CH₄
        this.add_entry_molecule_radialsymmetric({ element1: "C", element2: "O", n: 2, radius: 116.2, DeltaH: -393 }); // CO₂
        this.add_entry({ name: "CO", atoms: ["O","C"], offsets: [[48.4,0.0],[-64.4,0.0]], DeltaH: -111 }); // CO
        this.add_entry_molecule_radialsymmetric({ element1: "N", element2: "H", n: 3, radius: 101.2, DeltaH:  -46 }); // NH₃
        this.add_entry_molecule_radialsymmetric({ element1: "C", element2: "F", n: 4, radius: 131.5, DeltaH: -933 }); // CF₄
        this.add_entry_molecule_radialsymmetric({ element1: "S", element2: "F", n: 6, radius: 156.1, DeltaH: -1220 }); // SF₆
        
        //Nitrogen dioxide equilibrium.
        this.add_entry({ name: "NO₂•", atoms: ["O","O","N"],
            offsets: [[14.2,109.9],[14.2,-109.9],[-32.3,0.0]],
            DeltaH: 34, molColour: "rgb(180,72,26)"
        }); // NO₂• , reddish brown gas
        this.add_entry({ name: "N₂O₄", atoms: ["O","O","N","O","O","N"],
            offsets: [[134.3,110.1],[134.3,-110.1],[89.1,0.0],[-134.3,110.1],[-134.3,-110.1],[-89.1,0.0]],
            DeltaH: 11, molColour: "#FFFFFF"
        }); // N₂O₄ , colourless gas

        //Ozone layer equilibrium with Cl and NOx species. https://en.wikipedia.org/wiki/Ozone_layer
        // N2O3 = 86, N2O5 = 15             
        this.add_entry({ name: "O₃", atoms: ["O","O","O"],
            offsets: [[22.3,108.9],[22.3,-108.9],[-44.7,0]],
            DeltaH: 142, molColour: "rgb(255,127,127)",
        }); // O₃ , use a lighter red.
        
        this.add_entry({ name: "ClO•", atoms: ["Cl","O"],
            offsets: [[-48.8,0.0],[108.2,0.0]],
            DeltaH: 102
        }); // ClO, active species for ozone depletion.        
        this.add_entry({ name: "ClOO•", atoms: ["Cl","O","O"],
            offsets: [[-71.0,-89.3],[18.4,99.0],[138.9,99.0]],
            DeltaH: 98
        });  //Take geometry from Abbot and Schaefer (2018) DOI: 10.1021/acs.jpca.8b00394
        // alternative offsets: [[149.0,83.1],[97.3,-25.8], [-111.1,-25.8 ] ],
        // Intermediate products. Use as a basis Nikolaison et al. (1994). DOI: 10.1021/j100052a027        
        this.add_entry({ name: "ClOOCl", atoms: ["Cl","O","O","Cl"],
            offsets: [[-129.8,-160.1],[-71.3,0.0],[71.3,0.0],[129.8,160.1] ],
            DeltaH: 128
        });
        // Transient side product.
        this.add_entry({ name: "Cl₂O", atoms: ["Cl","Cl","O"],
            offsets: [[-17.7,-139.6],[-17.7,139.6],[78.5,0.0]],
            DeltaH: 81
        }); 
        
        
        this.add_entry({ name: "N₂O", atoms: ["O","N","N"],
            offsets: [ [111.2,0.0],[-120.0,0.0],[-7.2,0.0] ],
            DeltaH: 83
        }); // N₂O
        this.add_entry({ name: "NO•", atoms: ["O","N"],
            offsets: [[53.9,0.0],[-61.5,0.0]],
            DeltaH: 91
        }); // NO
        this.add_entry({ name: "NO₃•", atoms: ["O","O","O","N"],
            offsets: [[61.9,107.2],[61.9,-107.2],[-123.8,0.0],[0,0.0]],
            DeltaH: 74
        }); // NO₃•
        // this.add_entry({ name: "N₂O₅", atoms: ["O","O","O","N","O","O","N"],
            // offsets: [ ],
            // DeltaH: 15
        // });
        // N₂O₅
        
        // Hydrogen iodide equilibrium.
        this.add_entry({ name: "HI", atoms: ["H","I"],
            offsets: [ [159.6,0.0],[-1.3,0.0] ],
            DeltaH: 26,
        });
        
        // Aqua regia volatile equilibria.
        // Needs Cl2 , NO2 , and N2O4 .
        //this.add_entry_old( "ClNO", ["Cl","O","N"], [[14.2,109.9],[14.2,-109.9],[-32.3,0.0]] );
        //this.add_entry_old( "ClNO₂", ["Cl","O","O","N"], [[14.2,109.9],[14.2,-109.9],[-32.3,0.0]] );

        //Hydrogen-oxygen combustion.
        this.add_entry_old( "OH•", ["O","H"], [[5.8,0.0],[-91.2,0.0]] );
        this.set_molecule_colour("OH•", "rgb(253,118,47)");

        this.add_entry_old( "H₂O₂", ["H","H","O","O"], [[81.7,94.7],[-81.7,-94.7],[73.8,0.0],[-73.8,0.0]] );
        this.add_entry_old( "HO₂•", ["H","O","O"], [[-87.9,-91.1],[-63.9,2.9],[69.4,2.9]] );        
        this.set_molecule_colour("HO₂•", "rgb(254,74,31)");

        // Methane-ethane combustion
        this.add_entry_old( "C₂H₆", ["H","H","H","H","H","H","C","C"],
                                [[76.8,109.1],[185.9,0.0],[76.8,-109.1],[-76.8,-109.1],[-185.9,0.0],[-76.8,109.1],
                                [76.8,0.0],[-76.8,0.0]] );
        this.add_entry_old( "C₂H₄", ["H","H","H","H","C","C"],[[123.2,92.9],[123.2,-92.9],[-123.2,-92.9],[-123.2,92.9],[67.0,0.0],[-67.0,0.0]] );
        this.add_entry_old( "C₂H₂", ["H","H","C","C"], [[166.4,0.0],[-166.4,0.0],[60.1,0.0],[-60.1,0.0]] );
        this.add_entry_old( "CH₃•", ["H","H","H","C"], [[107.9,0.0],[-54.0,93.4],[-54.0,-93.4],[0.0,0.0]] );
        // Methanol
        this.add_entry_old( "CH₃OH", ["H","H","H","H","O","C"], [[-73.3,-112.4],[-182.9,-2.8],[-73.3,106.8],[100.3,87.7],[69.4,-2.8],[-73.3,-2.8]] );
        // Formaldehyde, not hydroxycarbene.
        this.add_entry_old( "CH₂O", ["H","H","O","C"], [[-119.0,94.3],[-119.0,-94.3],[60.2,0.0],[-60.3,0.0]] );
        // Ketene.
        this.add_entry_old( "CH₂CO", ["H","H","O","C","C"], [[-181.4,-94.5],[-181.4,94.5],[118.2,0.0],[-129.3,0.0],[2.2,0.0]] );       

        /*
            Hydrogen sulfide oxidation and direct thermal decomposition. 
            This is an important first step to eliminate sulfur impurities in fuel and biofuel sources.
            The first step is at highh temperature, but equilibrium dictates that significant H2S remains. Thus, a second step is used at a lower temperature with a surface catalyst to push equilibrum towards completion.
            See, e.g.:
                1.  Barba et al. (2017), DOI: 10.1016/j.fuel.2016.12.038
                2.  Cong et al. (2016), DOI: 10.1016/j.ijhydene.2016.03.053
            These two provide detailed reaction pathways of intermediates with and without use of oxygen.
        */
        // this.add_entry('H₂S', ['H','H','S']);
        // this.add_entry('HS', ['H','S']);
        // this.add_entry('HS₂', ['H','S','S']);
        // this.add_entry('H₂S₂', ['H','H','S','S']);
        // this.add_entry('SO', ['S','O']);
        // this.add_entry('SO₂', ['S','O','O']);
        // this.add_entry('S₂O', ['S','S','O','O']);
        // this.add_entry( 'HO₂', ['H','O','O'], [[94,82],[-94,-82],[0,74],[0,-74]] );
        // this.add_entry('S', ['S']);
        // this.add_entry('S₂', ['S','S']);
    }

    // Make atom-coloured and molecule-coloured image libraries for visualisation.
    create_all_image_sets() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');        
        Object.values( this.entries ).forEach( moltype => {
            moltype.create_image_set( { canvas, ctx });
        });
        canvas.remove();
    }

    set_current_image_all( type, distScale ) {
        Object.values( this.entries ).forEach( moltype => {
            if ( undefined != moltype.imageSet ) {
                moltype.set_current_image( type, distScale );
            }
        });
    }
    
    create_image_set_from_array( moltypeNames ) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        for ( const name of moltypeNames ) {
            const moltype = this.get_entry( name );
            moltype.create_image_set( { canvas, ctx } );
        }
        canvas.remove();        
    }
    
    set_current_image_from_array( moltypeNames, type, distScale ) {
        for ( const name of moltypeNames ) {
            const moltype = this.get_entry( name );
            moltype.set_current_image( type, distScale );
        }
    }
    
    checkif_image_created( moltypeNames ) {
        for ( const name of moltypeNames ) {
            const moltype = this.get_entry( name );
            if ( undefined === moltype.imageNow ) { return false; }
            if ( undefined === moltype.imageNow.image ) { return false; }
        }                
        return true;
    }
}

/*
    WIP: Class of molecule types, which should handle the properties for each entry to be created.
*/
class MoleculeType {
    
    constructor( args ) {
        
        if ( undefined === args.tableOfElements ) { throw "Creation of a molecule type requires a table of Elements to be given!"; }
        if ( undefined === args.name ) { throw "Creation of a molecule type requires a name argument!"; }
        if ( undefined === args.atoms ) { throw `Creation of the molecule type ${args.name} requires an array of atoms!`; }
        const n = args.atoms.length;
        if ( undefined === args.offsets && n > 1 ) { throw `Creation of a polyatomic molecule type ${args.name} requires an array of its atom offsets!`; }
        if ( n != args.offsets.length ) { throw `The length of atoms and offset arrays are not the same for molecule type ${args.name}!`; }
        if ( undefined === args.collisionRadiiFactor ) { args.collisionRadiiFactor = 1.0; }
        
        this.numAtoms = n;
        this.numDegrees = (n > 1) ? 3 : 2;
        
        this.name        = args.name;
        this.atoms       = args.atoms;
        this.atomOffsets = undefined;
        this.convert_offsets( args.offsets );

        if ( undefined === args.DeltaH ) { args.DeltaH = 0.0; }
        this.DeltaH = args.DeltaH;
        this.size = 0.0;
        this.area = undefined;
        this.mass = 0.0;
        this.rotI = 0.0;
        
        this.molColour = undefined;
        this.atomColours = [];
        this.atomRadii   = [];
        this.elements  = [];
        
        // Image data for the molecule type. Designed for fast use.
        this.imageSet = undefined;
        this.imageNow = undefined;
        
        // Molecule colour defaults to the average colour over the atoms.
        let cSum = [0,0,0] ;        
        for ( let i = 0 ; i < n ; i++ ) {               
        
            const elem = args.tableOfElements.get_by_name( this.atoms[i] );
            this.elements.push( elem );

            this.mass += elem.mass;
            
            const radiusAtom  = elem.radius ;
            this.atomRadii.push( radiusAtom );
            
            const r2 = this.atomOffsets[i].norm2();
            this.rotI += elem.mass * r2 ;            
            this.size = Math.max( radiusAtom + Math.sqrt(r2), this.size );

            for (let j = 0 ; j < 3 ; j++ ) { cSum[j] += elem.colourVec[j]; }
            this.atomColours.push( elem.parse_colourVec() );
            
        }
        
        // Make monoatomic molecules have a null rotational kinetic energy.
        if ( 0.0 == this.rotI ) { this.rotI = null; }
        
        // Assign the newly computed properties back to the data entry.
        this.size *= args.collisionRadiiFactor ; //TODO shift back to library.
        this.area = this.size**2.0 * Math.PI;
        
        if ( undefined === args.molColour ) {
            for (let j = 0 ; j < 3 ; j++ ) { cSum[j] = Math.floor(cSum[j]/n) ; }
            this.molColour = `rgb(${cSum[0]},${cSum[1]},${cSum[2]})`;
        } else {
            this.molColour = args.molColour;
        }
    }

    convert_offsets( off ) {
        this.atomOffsets = [];
        for ( let i = 0 ; i < this.numAtoms ; i++ ) {
            const v = off[i];
            if ( !( v instanceof Vector2D ) ) {
                this.atomOffsets.push( new Vector2D( v[0], v[1] ) );
            } else {
                this.atomOffsets.push( v );
            }
        }
    }      

    get_DeltaH() { return this.DeltaH; }
    get_size() { return this.size; }
    get_area() { return this.area; }
    get_mass() { return this.mass; }
    get_rotI() { return this.rotI; }
    
    /*
        Pre-create all images for use later. Uses globalVars.as the basis
        Fairly slow on some devices if the HTML canvas needs to be created.
    */
    create_image_set( args ) {
        
        const bForce = ( undefined != args.Force && args.Force );
        if ( undefined != this.imageSet && !bForce ) { return; }
        
        var canvas, ctx;
        const bInternalCanvas = ( undefined === args.canvas );
        if ( bInternalCanvas ) {
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
        } else {
            canvas = args.canvas;
            ctx = args.ctx;
        }
        
        this.imageSet = {};
        const param = globalVars.distScaleParams;
        const arrType = [ "atom", "molecule" ];
        for ( const type of arrType ) {
            this.imageSet[type] = {};
            for ( let ds = param.min; ds <= param.max; ds += param.step ) {
                if ( undefined == ds || Number.isNaN( ds ) ) {
                    throw `ERROR in image generation for molecule type ${this.name}: the global distance scale parameter set seemns ill defined! ${param}`;
                }
                this.imageSet[type][ds] = this.create_image_internal( canvas, ctx, type, 1.0/ds );
            }
        }
        
        if ( bInternalCanvas ) { canvas.remove(); }
    }

    // Use HTML Canvas notation. Return only width/height
    calculate_draw_dimensions() {
        const n = this.numAtoms;
        var xmin = 0.0, xmax = 0.0, ymin = 0.0, ymax = 0.0;
        for ( let i = 0; i < n; i++ ) {
            let x = this.atomOffsets[i].vec[0];
            let y = this.atomOffsets[i].vec[1];
            let r = this.atomRadii[i];
            xmin = ( xmin > x - r ) ? x - r : xmin;
            xmax = ( xmax < x + r ) ? x + r : xmax;
            ymin = ( ymin > y - r ) ? y - r : ymin;
            ymax = ( ymax < y + r ) ? y + r : ymax;
        }        
        return [ 2 * Math.max( xmax, -xmin), 2 * Math.max( ymax, -ymin) ];
    }
    
    /*
        This will create a shaded circle for each atom.
    */
    create_image_internal( canvas, ctx, type, scale ) {
        
        const lineWidth = 0.5;
        const dim = this.calculate_draw_dimensions( scale );

        var colourEdge = "#000000"; // Black for now.        

        var colourInterior = this.molColour;
        var rgbInt = RGBops.decompose_string( colourInterior );        
        var colourExterior = RGBops.compose_array( RGBops.combine( rgbInt, [0,0,0], 0.5 ) );

        
        canvas.width  = dim[0] = Math.ceil( scale * dim[0] + lineWidth);
        canvas.height = dim[1] = Math.ceil( scale * dim[1] + lineWidth);
        
        // Create gradient
        const n = this.numAtoms;        
        for ( let i = 0; i < n; i++ ) {           
            const xCent = this.atomOffsets[i].vec[0] * scale;
            const yCent = this.atomOffsets[i].vec[1] * scale;
            const r  = this.atomRadii[i] * scale ;
            const rI = 0.5 * r;

            ctx.translate( dim[0]/2, dim[1]/2 );            
            ctx.beginPath();
            // Use shading to make the circles pop a little more.
            const colourGradient = ctx.createRadialGradient( xCent, yCent, rI, xCent, yCent, r );
            if ( type == "atom" ) {
                colourInterior = this.atomColours[i];
                rgbInt = RGBops.decompose_string( colourInterior );        
                colourExterior = RGBops.compose_array( RGBops.combine( rgbInt, [0,0,0], 0.4 ) );
            }
            colourGradient.addColorStop(0, colourInterior);
            colourGradient.addColorStop(1, colourExterior);
            ctx.fillStyle = colourGradient;       
            ctx.lineWidth   = lineWidth;
            ctx.strokeStyle = colourEdge;
            
            // Draw circle
            ctx.arc( xCent, yCent, r, 0, 2 * Math.PI );
            ctx.fill();
            ctx.stroke();
            
            ctx.resetTransform();
        }
        // Export image for future use.
        //const imageData = ctx.getImageData(0, 0, d, d);        
        const image = new Image( dim[0], dim[1] );
        image.src = canvas.toDataURL('img/png');        
        const offset = [ -dim[0]/2, -dim[1]/2 ];
        
        ctx.clearRect( 0, 0, dim[0], dim[1] );
        return { image, offset };
    }

    //This one is needed to update the molecule images.
    set_molecule_colour( str ) {
        if ( str != this.molColour ) {
            this.molColour = str;
            this.create_image_set( { bForce: true } );
        }
    }
        
    // Draw this molecule type on a canvas.
    // Need image and imageOffsets
    // WIP.
    draw( ctx, x, y, th ) {        
        const img = this.imageNow;
        ctx.translate( x, y );
        ctx.rotate( th );
        ctx.drawImage( img.image, img.offset[0], img.offset[1] );
        ctx.resetTransform();
    }
    
    set_current_image( type, distScale ) {
        this.imageNow = this.get_image_object( type, distScale );
        if ( undefined === this.imageNow ) {
            throw `ERROR: The molecule type ${this.name} does not have a pre-determined image of type ${type}:${distScale}!`;
        }
    }
    
    //Need to then use .image and .offset for canvas drawing.
    get_image_object( type, distScale ) {
        if ( undefined === type ) { type = "atom"; }
        if ( undefined === distScale ) { distScale = '20'; }
        return this.imageSet[type][distScale];
    }
}

/*
    This class handles the properties that are unique to each molecule:
    - Position, velocity, rotation, if there are special colours, etc.
    
*/
// This is the base class. Assume polyatomic with all 3 degrees of freedom.
class Molecule {
    constructor( moltype, args ) {
        if ( undefined === moltype ) { throw "ERROR: new Molecule() is not given an molecule type to create!"; }                
        this.name    = moltype.name;
        this.sync_molecular_properties(moltype);
        
        this.p  = undefined;
        this.v  = undefined;
        this.th = undefined;
        this.om = undefined;
        
        //Used by the simulation to skip this molecule, as it has reacted and is about to be deleted.
        this.bIgnore = false;
    }
    
    static check_NaN( mol ) {
        if ( Number.isNaN( mol.v.x ) || Number.isNaN( mol.v.y ) ) {
            mol.debug();
            throw `Molecule ${mol.name} has a NaN linear velocity value!`
        }
        if ( Number.isNaN( mol.om ) ) {
            mol.debug();
            throw `Molecule ${mol.name} has a NaN rotational velocity value!`
        }
    }
    
    static measure_distance( mA, mB ) { return Vector2D.dist( mA.p, mB.p ); }
    static check_proximity( mA, mB ) {
        const d2 = Vector2D.dist2( mA.p, mB.p );
        return ( d2 < (mA.size + mB.size)**2.0 );
    }
    static fix_potential_overlap( mA, mB ) {    
        const d = Vector2D.dist( mA.p, mB.p );
        const s = mA.size + mB.size;
        if ( d < s ) {
            const dp = mB.p.subtract(mA.p);
            dp.scale( 0.55*(s-d)/d );
            mB.p.incr ( dp );
            mA.p.sincr ( -1, dp );
            return true;
        } else {
            return false;
        }
    }
    
    // angle given in degrees.
    static convert_relative_geometry( r1, r2, th ) {
        th = th * Math.PI / 180.0;
        const p1 = new Vector2D( 0, 0 );
        const p2 = new Vector2D( r1, 0 );
        const p3 = new Vector2D( r1 - Math.cos(th)*r2, Math.sin(th)*r2 );
        console.log( p1.vec );
        console.log( p2.vec );
        console.log( p3.vec );
    }
    
    // Reference the matching molecular properties from the Library.
    sync_molecular_properties(moltype) {
        if ( undefined === moltype )  { throw "ERROR: sync_molecular_properties is not given an molecule type!"; }
        // References to molecular properties.
        this.mass   = moltype.mass;
        this.rotI   = moltype.rotI;
        this.size   = moltype.size;
        this.colour = moltype.molColour;

        // References to atomic properties.
        this.nAtoms      = moltype.numAtoms;
        this.numDegrees    = moltype.numDegrees;
        this.atomOffsets = moltype.atomOffsets;
        this.atomColours = moltype.atomColours;
        this.atomRadii   = moltype.atomRadii;
        
        // Get direct reference to moltypes and elements in case this is needed later.
        this.moltype  = moltype;
        this.elements = moltype.elements;
    }
    
    // Various shorthands for retrieval.
    get_DeltaH() { return this.moltype.get_DeltaH(); }
    get_size() { return this.size; }
    get_mass() { return this.mass; }
    get_rotI() { return this.rotI; }
    get_colour() { return this.colour; }
    measure_area() { return Math.PI * this.size * this.size; }
        
    //Report in kJ/mol rather than kg.m^2/s^2 
    measure_kinetic_energy() { return 0.5 * this.mass * this.v.norm2(); }
    measure_rotational_energy() { return 0.5 * this.rotI * this.om**2.0; }
    measure_total_energy() { return this.measure_kinetic_energy() + this.measure_rotational_energy(); }
    get_energies() { return [ this.measure_kinetic_energy(), this.measure_rotational_energy() ]; }
    
    //momentum
    get_translational_momentum() { return this.v.scaled_copy( this.mass ) ; }
    get_angular_momentum( pRef ) {
        if ( undefined === pRef ) {
            return this.rotI * this.om;
        } else {
            return this.rotI * this.om + this.mass * Vector2D.cross( this.p.subtract(pRef), this.v ) ;
        }
    }
    
    debug() {
        const entries = Object.entries(this);
        for (const x in entries) {
            var y = entries[x][1];
            if ( y instanceof Vector2D ) {
                console.log(`${entries[x][0]}: ${y[0]} ${y[1]}`);
            }  else {
                console.log(`${entries[x][0]}: ${y}`);
            }
        }
    }
    
    copy_pos_vel_from( mol ) {
        this.p.set_to( mol.p );
        this.v.set_to( mol.v );
        this.th = mol.th;
        this.om = mol.om;
    }
    
    /*
        Draw each atom according to its offset and rotation.
        Using fill and strokes appear to be much more expensive than using pre-rendered images to put on the canvas.
        The only difference between molecule-image and atom-image is the colour of the atoms,
        - each moltype stores the images of its atoms as coloured.
    */
    draw( ctxLoc, distScale ) {
        if ( undefined === distScale ) { distScale = globalVars.distScale; }
        this.moltype.draw( ctxLoc, this.p.vec[0]/distScale, this.p.vec[1]/distScale, this.th );
    }
    
    draw_as_atom_circles( ctxLoc, distScale ) {
        if ( undefined === distScale ) { distScale = globalVars.distScale; }
        for (let i = 0; i < this.nAtoms; i++) {
            const off = Vector2D.rotate( this.atomOffsets[i], this.th );
            const xPos = (this.p.vec[0] + off.vec[0])/distScale ;
            const yPos = (this.p.vec[1] + off.vec[1])/distScale ;
            const radius = this.atomRadii[i]/distScale;                    
            ctxLoc.beginPath();
            ctxLoc.fillStyle = this.atomColours[i];
            ctxLoc.arc( xPos, yPos, radius, 0, 2 * Math.PI );
            ctxLoc.fill();
            ctxLoc.lineWidth = 1;
            ctxLoc.strokeStyle = '#221100';
            ctxLoc.stroke();
        }        
    }

    draw_as_one_molecule( ctxLoc, distScale ) {
        if ( undefined === distScale ) { distScale = globalVars.distScale; }
        ctxLoc.beginPath();                
        ctxLoc.fillStyle = this.colour;
        ctxLoc.lineWidth = 1;
        ctxLoc.strokeStyle = '#221100';
        for (let i = 0; i < this.nAtoms; i++) {
            const off = Vector2D.rotate( this.atomOffsets[i], this.th );                    
            const xPos = (this.p.vec[0] + off.vec[0])/distScale ;
            const yPos = (this.p.vec[1] + off.vec[1])/distScale ;
            const radius = this.atomRadii[i]/distScale;
            ctxLoc.moveTo( xPos + radius, yPos );
            ctxLoc.arc( xPos, yPos, radius, 0, 2 * Math.PI );
        }
        ctxLoc.stroke();
        ctxLoc.fill();
    }

    //Dynamics functions.
    update_position( dt ) {
        this.p.sincr( dt, this.v );
        this.th = ( this.th + this.om * dt ) % ( 2.0 * Math.PI ) ;
    }
    
    rescale_velocities( s ) {
        this.v.scale( s );
        this.om *= s;
    }
    
    resample_speed( T, f ) {
        if ( undefined === T ) { throw "Resampling requires an input temperature!";}        
        let vNew = random_speed2D( T, this.mass );
        if ( undefined === f ) {
            this.v.scale( globalVars.timeFactor * vNew / this.v.norm() ) ;
        } else {
            const vOld = this.v.norm();
            vNew = ( 1.0 - f ) * vOld + f * vNew;
            this.v.scale( globalVars.timeFactor * vNew / this.v.norm() ) ;
        }
    }
    
    sample_velocity( T ) {
        if ( undefined === T ) { throw "Sampling requires an input temperature!";}        
        this.v = random_velocity2D( T, this.mass );
        this.v.scale( globalVars.timeFactor );
    }
    
    resample_velocity( T, f ) {
        if ( undefined === T ) { throw "Resampling requires an input temperature!";}        
        const vNew = random_velocity2D( T, this.mass );        
        if ( undefined === f ) {
            this.v.vec[0] = vNew.vec[0] * globalVars.timeFactor;
            this.v.vec[1] = vNew.vec[1] * globalVars.timeFactor;
        } else {
            this.v.vec[0] = globalVars.timeFactor * ( ( 1.0 - f ) * this.v.vec[0] + f * vNew.vec[0] );
            this.v.vec[1] = globalVars.timeFactor * ( ( 1.0 - f ) * this.v.vec[1] + f * vNew.vec[1] );
        }
    }
    
    set_theta( th ) { this.th = th };
    set_omega( om ) { this.om = om };
    resample_omega( T, f ) {
        if ( undefined === T ) { throw "Resampling requires an input temperature!";}
        //Cheat to just assume that rotations are exactly the same as another dimension of translational movement.
        if ( undefined === f ) {
            this.om = globalVars.timeFactor * random_speed1D( T, this.rotI ) ;
        } else {
            this.om = ( 1.0 - f ) * this.om + f * globalVars.timeFactor * random_speed1D( T, this.rotI );
        }
    }
}

//General class.
class MoleculePolyatomic extends Molecule {
    constructor( moltype, args ) {
        super( moltype, args );
        
        const bSample = ( 'bSample' in args ) ? args.bSample : false;
        if ( bSample ) {
            if ( !( 'T' in args ) ) { throw "Cannot get random properties without a temperature argument 'T'!"; }
            // Translational and rotational properties.        
            if ( 'p' in args ) { this.p = args.p } else { this.p = new Vector2D(0,0); }
            if ( 'v' in args ) { this.v = args.v } else { this.sample_velocity( args.T ); }
            if ( 'th' in args ) { this.th = args.th } else { this.th = Math.random() * 2.0 * Math.PI; }
            if ( 'om' in args ) { this.om = args.om } else { this.resample_omega( args.T ); }
        } else {
            // Translational and rotational properties.        
            if ( 'p' in args ) { this.p = args.p } else { this.p = new Vector2D(0,0); }
            if ( 'v' in args ) { this.v = args.v } else { this.v = new Vector2D(0,0); }        
            if ( 'th' in args ) { this.th = args.th } else { this.th = 0.0; }
            if ( 'om' in args ) { this.om = args.om } else { this.om = 0.0; }
        }
    }
}

// TODO: If we incorporate internal vibrational freedoms. Use this.
// class MoleculeDiatomic extends Molecule {}

// Subtype that ignores commands related to rotational freedoms
class MoleculeMonoatomic extends Molecule {
    constructor( moltype, args ) {
        super( moltype, args );
              
        this.th = null;
        this.om = null;
        
        const bSample = ( 'bSample' in args ) ? args.bSample : false;
        if ( bSample ) {
            if ( !( 'T' in args ) ) { throw "Cannot get random properties without a temperature argument 'T'!"; }
            // Translational and rotational properties.        
            if ( 'p' in args ) { this.p = args.p } else { this.p = new Vector2D(0,0); }
            if ( 'v' in args ) { this.v = args.v } else { this.sample_velocity( args.T ); }
        } else {
            // Translational and rotational properties.        
            if ( 'p' in args ) { this.p = args.p } else { this.p = new Vector2D(0,0); }
            if ( 'v' in args ) { this.v = args.v } else { this.v = new Vector2D(0,0); }        
        }
    }   
    
    get_rotI() { return null; }    
    //Report in kJ/mol rather than kg.m^2/s^2 
    measure_rotational_energy() { return 0.0; }
    measure_total_energy() { return this.measure_kinetic_energy(); }
    get_energies() { return [ this.measure_kinetic_energy(), 0.0 ]; }
    
    //momentum
    get_angular_momentum( pRef ) {
        if ( undefined === pRef ) {
            return 0.0 ;
        } else {
            return Vector2D.cross( this.p.subtract(pRef), this.v ) ;
        }
    }
        
    copy_pos_vel_from( mol ) {
        this.p.set_to( mol.p );
        this.v.set_to( mol.v );
    }
    
    //Dynamics functions.
    update_position( dt ) { this.p.sincr( dt, this.v ); }
    
    rescale_velocities( s ) { this.v.scale( s ); }    
    
    set_theta( th ) {}
    set_omega( om ) {}    
    resample_omega( T ) {}    
}

