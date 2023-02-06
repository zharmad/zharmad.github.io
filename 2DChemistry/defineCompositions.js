/*    
    Comes in a new different types. Raw counts and proportions.   
*/
    
class GasComposition {
    constructor(type) {
        if ( undefined === type ) { type = 'count'; }
        
        this.nComponents = 0;
        this.data = {};
        this.type = type;
        
        // the target total number of molecules to generate
        this.nTotal = undefined ;
        this.reset_nTotal();
    }

    reset_nTotal() {
        switch ( this.type ) {
            case 'count':
                this.nTotal = 0;
                break;
            case 'ratio':
                this.nTotal = 0.0;
                break;
            case 'random':
                this.nTotal = 0;
                break;
            default:
                throw `Unrecognised type ${this.type} within GasComposition constructor!`;
        }        
    }
       
    reset() {
        this.data = {};
        this.reset_nTotal();
    }   
        
    get_component_names()  { return Object.keys(this.data); }
    get_component_values() { return Object.values(this.data); }
    get_components() { return Object.entries(this.data); }
        
    add_component(name, val) {
        if ( undefined === this.data[name] ) {
            this.data[name] = val;
            this.nComponents++ ;
        } else {
            this.data[name] += val;
        }
        this.nTotal += val ;
    }
    
    remove_component(name) {
        if ( undefined === this.data[name] ) { return; }
        this.nTotal -= this.data[name] ;
        this.nComponents-- ;
        delete this.data[name];
    }
        
    //Variant with safety Check 
    set_component(name, val) {
        if ( undefined === this.data[name] ) { throw `Gas composition does not have component named ${name}!`; }
        const temp = this.data[name];
        this.data[name] = val;
        this.nTotal += ( val - temp ) ;
    }
    
    add_components_via_array(arrIDs, arrRatios) {
        const n = arrIDs.length;
        //if ( n == undefined arrRatios.length ) {throw "ERROR: The  arrays to add_components_via_array() do not have the same length!"; }
        var temp = undefined;
        for ( let i = 0; i < n; i++ ) {
            temp = (arrRatios[i] != undefined) ? arrRatios[i] : 0.0;
            this.add_component( arrIDs[i], temp );
        }
    }

    debug() {
        console.log( `= = = Gas composition contents: = = =` );
        Object.entries(this.data).forEach( ([key, val]) => {
            console.log(`${key} : ${val}` );
        });
    }
   
    check_against_library(molLib) {
        const arr = molLib.get_defined_molecules();
        Object.keys(this.data).forEach( name => {
            if ( !(name in arr) ) { throw `Molecules ${name} is not defined in the library!`; }
        });
    }
    //const arrMoles = moleculeLibrary.get_moltype_array();
    
    normalise() {
        if ( this.type == 'ratio' ) {
            this.nTotal = 0.0;
            Object.values(this.data).forEach( val => { this.nTotal += val; });
            if ( this.nTotal > 0.0 ) {
                //for ( key in Object.keys(this.data) ) { this.data[key] /= this.nTotal ; }
                Object.keys(this.data).forEach( key => { this.data[key] /= this.nTotal; });
            } else {
                Object.keys(this.data).forEach( key => { this.data[key] = 1.0 / this.nComponents; });
            }
            this.nTotal = 1.0;
        }
        // Else do nothing. Raw counts do not need normalisation.
    }
    
    // Use 0.1% tolerance since we're not using more than 1000 molecules.
    convert_ratio_to_count( nTotal ) {
        if ( this.type != 'ratio' ) { throw "Can only operate on composition ratios!"; }
        if ( (this.nTotal - 1.0) > 0.001 ) { this.normalise(); }
        this.type = 'count';
        this.nTotal = 0;
        Object.entries(this.data).forEach( ([name, val]) => {
            const c = Math.round( val * this.nTotal );
            this.nTotal += c ;
            this.data[name] = c;
        });
    }
    
    convert_count_to_ratio() {
        if ( this.type != 'count' ) { throw "Can only operate on explicit counts!"; }
        this.type = 'ratio';
        Object.entries(this.data).forEach(([name, val]) => {
            this.data[name] = val / this.nTotal ;
        });
        this.nTotal = 1.0;
    }
    
    export_array( bSort ) {
        const arr = [];
        // TODO
        return arr
    }
}