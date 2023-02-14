/*
    This is an implementation of industry standard algorithms for making efficient pairwise calculations, when there are no long-range interactions to consider. It divides the simulation box into discrete domains, in which only interactions between particles of adjacent domains will be considered.
    See, for example:
    1. http://www.lmops.univ-smb.fr/brown/speedup.pdf
    2. https://manual.gromacs.org/current/reference-manual/algorithms/parallelization-domain-decomp.html

    For example, if a simulation is divided into 8x8 domains, a particle in a central domain - e.g., (2,2) - will only interact with other particles in its own domain, or the 8 adjacent domains next to them.

    The size of the domain should then take into account the maximum sizes of the molecules and any short-range interactions that they might have. If the domain-ID of each molecule is not updated every step, the size must also take into account how fast they might move 
    
    In this simple implementation, the grid is calculated prefore simulation begins, and the adjacency relationships set up like a rectangular graph.
    At each step, the individual molecule positions are copied into the corresponding fixed Float32Arrays - this way distant molecules are never seen.
    
    The individual grid workloads can then be sent to web-workers if further optimisation is required.
*/
class DomainDecompositionHandler {
    
    constructor( sim ) {
        this.host = sim;
        
        // The spacing multiplier will determine the total number of domains created. This represents an initial guess on what kind of efficient trade-off will be between having to pointer-chase too many domains versus the making too many pair-wise computations.
        // If we decide to do van-der-Waals and/or short-range electrostatics, there will be a strict lower limit on this.
        this.spacingMult = 5;
        this.spacingMin = undefined;        
        this.spacing = undefined; // May want to adjust based on simulation volume. Will see later.
        
        // Memory efficiency. Assume that generally the simulation won't try to squeeze in too many molecules at once. The value 1 represents the point where a domain is **completely** filled with molecules of average size, which should rarely happen.
        this.sizeMemMult = 1;
        this.sizeMemInit = undefined;
        
        this.domains = {};
        this.numDomains = 0;
        this.numX = undefined;
        this.numY = undefined;
        this.wDomain = undefined;
        this.hDomain = undefined;       
        this.bSet = false;
    }
    

    tune_parameters_for_simulation() {
        
        if( this.bSet ) { this.reset(); this.bSet = false; }
            
        const sim = this.host;
        const wSim = sim.xBounds.vec[1] - sim.xBounds.vec[0];
        const hSim = sim.yBounds.vec[1] - sim.yBounds.vec[0];
        // Determine the domain decomposition dimensions.
        this.spacingMin = sim.measure_max_molecule_size() * this.spacingMult ;
        this.spacing = this.spacingMin;
        
        this.numX = Math.floor( wSim / this.spacing );
        this.numY = Math.floor( hSim / this.spacing );        
        this.numDomains = this.numX * this.numY;
        this.wDomain = wSim / this.numX ;
        this.hDomain = hSim / this.numY ;
        
        // Determine maximum number of molecules expected, so as to declare an initial array size.
        const avgMolArea = sim.measure_total_molecule_area() / sim.nMolecules;
        
        this.sizeMemInit = Math.ceil( this.sizeMemMult * this.wDomain * this.hDomain / avgMolArea );
        
        console.log( `Domain-decomposition setup computes a ${this.numX} x ${this.numY} division into ${this.numDomains} domains.` );
        console.log( `...This is based on a spacing of ${this.spacingMin} pm.` );
        this.declare_domains();
        
        this.bSet = true;
    }
    
    declare_domains() {
        
        var key;
        //Make
        const nX = this.numX, nY = this.numY ;
        for ( let i = 0; i < nX; i++ ) {
            for ( let j = 0; j < nY; j++ ) {
                key = `${i}:${j}`;
                this.domains[key] = new DomainObject({
                    key: key,
                    sizeMemInit: this.sizeMemInit,
                });
            }
        }
        
        var domA, domB;
        // Link using forward linking.
        for ( let i = 0; i < nX-1; i++ ) {
            for ( let j = 0; j < nY-1; j++ ) {
                domA = this.domains[`${i}:${j}`];                
                domB = this.domains[`${i+1}:${j}`];
                DomainObject.link( domA, domB );
                domB = this.domains[`${i+1}:${j+1}`];
                DomainObject.link( domA, domB );
                domB = this.domains[`${i}:${j+1}`];
                DomainObject.link( domA, domB );
                
                domB = this.domains[`${i-1}:${j+1}`];
                if ( undefined != domB ) { DomainObject.link( domA, domB ); }
            }
        }        
    }

    clear_domain_memory() {        
        Object.values( this.domains ).forEach( dom => { dom.clear_memory(); } );
    }

    // Where alll domains receive only the atoms that should belong to them.
    copy_simulation_data_to_domain_memory(){
        
        const sim = this.host;
        const nMol = sim.nMolecules;
        //const spacing = this.spacing;
        const wDom = this.wDomain;
        const hDom = this.hDomain;
        
        this.clear_domain_memory();
        
        let mol, pos, dom, dx, dy, x, y, s, id;
        for ( let i = 0; i < nMol; i++ ) {
            mol = sim.molecules[i]; pos = mol.p.vec;
            dx = Math.floor( pos[0] / wDom );
            dy = Math.floor( pos[1] / hDom );
            dom = this.domains[`${dx}:${dy}`];
            // Ignore all molecules which are out of bounds, rather than throwing an error. They should be corrected by boundary collisions instead.
            if ( undefined === dom ) {
                //console.log( `WARNING: molecule ${mol.name} has exited domain decomposition area! (${dx}:${dy}) versus (${this.numX}:${this.numY}`);
                continue;
            }
            dom.push_memory( pos[0], pos[1], mol.size, i );
        }
    }

    detect_potential_collisions() {

        this.copy_simulation_data_to_domain_memory();
        
        // Main Parallisable section where all the domains are independently computed.
        const molPairsAll = [];
        var molPairs, nPairs;
        Object.values( this.domains ).forEach( dom => {
            molPairs = dom.detect_potential_collisions();
            nPairs = molPairs.length;
            for (let i = 0; i < nPairs; i++ ) {
                molPairsAll.push( molPairs[i] );
            }
        });
        
        return molPairsAll;
    }
    
    remove() {        
        Object.values( this.domains ).forEach( dom => { delete dom.mem; });
        delete this.domains;
        delete this;
    }
    
    reset() {
        Object.values( this.domains ).forEach( dom => { delete dom.mem; });
        delete this.domains;
        this.domains = {};
        this.numDomains = 0;
        this.numX = undefined;
        this.numY = undefined;
        this.wDomain = undefined;
        this.hDomain = undefined;        
    }
}

class DomainObject {
    constructor( args ) {
        
        this.key = args.key;
        this.sizeMem = 0;
        this.sizeMemIncr = undefined;
        this.mem = undefined;
        
        //Don't link to own block by default. Prevents double-counting.
        this.neighboursBackward = [];
        this.neighboursForward  = []; 
        //DomainObject.link( this, this );
        
        this.nMols = undefined;
        
        if ( undefined != args.sizeMemInit ) {
            this.declare_memory( args.sizeMemInit );
        }
    }
    
    static link( a, b ) {
        a.neighboursForward.push(  b ); 
        b.neighboursBackward.push( a );
    }
    
    declare_memory( n ) {
        this.sizeMem = n;
        this.sizeMemIncr = n;
        this.mem = {};
        this.mem['xPos'] = new Float32Array(n);
        this.mem['yPos'] = new Float32Array(n);
        this.mem['size'] = new Float32Array(n);
        this.mem['index']   = new Int32Array(n);
    }

    expand_memory(){
        
        if ( this.sizeMem >= 10 * this.sizeMem ) {
            throw `Domain has already grown 10 times to ${this.sizeMem} entries. Further growth is prohibited as a safety check!`;
        }
        const sizeOld = this.sizeMem;
        const sizeNew = sizeOld + this.sizeMemIncr;        
        const mem = this.mem;
        
        var mNew = new Float32Array( sizeNew );
        for ( let i = 0; i < sizeOld; i++ ) { mNew[i] = mem.xPos[i]; }
        mem.xPos = mNew;
    
        var mNew = new Float32Array( sizeNew );
        for ( let i = 0; i < sizeOld; i++ ) { mNew[i] = mem.yPos[i]; }
        mem.yPos = mNew;
        
        var mNew = new Float32Array( sizeNew );
        for ( let i = 0; i < sizeOld; i++ ) { mNew[i] = mem.size[i]; }
        mem.size = mNew;

        var mNew = new Int32Array( sizeNew );
        for ( let i = 0; i < sizeOld; i++ ) { mNew[i] = mem.index[i]; }
        mem.index = mNew;
        
    }
    
    clear_memory() { this.nMols = 0; }
    reset_memory() {
        this.sizeMem = this.sizeMemIncr = 0;
        delete this.mem; this.mem = {};
    }
    
    push_memory(x, y, s, id) {        
        if ( this.sizeMem === this.nMols ) {
            this.expand_memory();
            console.log("Note: Domain memory has been expanded to accomodate a dense location.");
        }
        const i = this.nMols, mem = this.mem;
        mem.xPos[i] = x;
        mem.yPos[i] = y;
        mem.size[i] = s;
        mem.index[i] = id;
        this.nMols++;
    }

    // Assume all prep has been done.
    detect_potential_collisions() {

        const molPairs = [];
        const nMolA = this.nMols;
        if ( 0 === nMolA ) { return molPairs; }
        const xA = this.mem.xPos, yA = this.mem.yPos, sA = this.mem.size, idA = this.mem.index ;
        let dx, dy, ss;
        //Self.
        for (let i = 0; i < nMolA-1; i++) {
            for (let j = i + 1; j < nMolA; j++ ) {
                dx = xA[j]-xA[i]; dy = yA[j]-yA[i]; ss = sA[j]+sA[i];
                if ( dx*dx + dy*dy < ss*ss ) {
                    molPairs.push( [ idA[i], idA[j] ] );
                }
            }
        }
        // Neighbours
        const nDest = this.neighboursForward.length ;
        let xB, yB, sB, idB;
        for ( let b = 0; b < nDest; b++ ) {
            const domB = this.neighboursForward[b] ;
            const nMolB = domB.nMols;
            if ( 0 === nMolB ) { continue; }
            xB = domB.mem.xPos, yB = domB.mem.yPos, sB = domB.mem.size, idB = domB.mem.index ;
            for (let i = 0; i < nMolA; i++) {
                for (let j = 0; j < nMolB; j++ ) {
                    dx = xB[j]-xA[i]; dy = yB[j]-yA[i]; ss = sB[j]+sA[i];
                    if ( dx*dx + dy*dy < ss*ss ) {
                        molPairs.push( [ idA[i], idB[j] ] );
                    }
                }
            }
        }
        
        return molPairs;
    }
    
}