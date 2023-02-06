/*
    Handler to setup and return the elements. 
    Automatically creates a global instance tableOfElements for use.
    
    Default conversion rate from atomic radii to pixels:
    1 px = 0.1 Ang = 10 pm.
*/

class Element {
    
    constructor( n, name, mass, radius, colourVec ) {
        this.n    = n;
        this.name = name;
        this.mass = mass;
        this.radius = radius;
        this.colourVec = colourVec;
    }
    
    parse_colourVec() {
        return `rgb(${this.colourVec[0]},${this.colourVec[1]},${this.colourVec[2]})`
    }
}

class ElementList {
    
    constructor() {
        this.elements = [];
    }
    
    // take default radii values from Van der Waals: https://en.wikipedia.org/wiki/Van_der_Waals_radius
    add_all_known_elements() {
        var e = null;
        e = new Element(  1,  "H",  1.008, 120, [255, 255, 255] );
        this.elements.push(e);
        e = new Element(  2, "He",  4.003, 140, [221, 221, 221] );
        this.elements.push(e);
        e = new Element(  6,  "C", 12.011, 170, [ 72,  72,  72] );
        this.elements.push(e);
        e = new Element(  7,  "N", 14.007, 155, [ 64,  64, 255] );
        this.elements.push(e);
        e = new Element(  8,  "O", 15.999, 152, [255,  64,  64] );
        this.elements.push(e);
        e = new Element(  9,  "F", 18.998, 147, [  0, 255,  42] );
        this.elements.push(e);
        e = new Element( 10, "Ne", 20.180, 154, [204, 204, 204] );
        this.elements.push(e);
        e = new Element( 16,  "S", 32.07 , 180, [212, 212,  64] );
        this.elements.push(e);        
        e = new Element( 17, "Cl", 35.45 , 175, [  0, 179,  30] );
        this.elements.push(e);
        e = new Element( 18, "Ar", 39.95 , 188, [187, 187, 187] );
        this.elements.push(e);
        e = new Element( 36, "Kr", 83.798, 202, [170, 170, 170] );
        this.elements.push(e);
        e = new Element( 53,  "I", 126.90, 198, [172,   0, 192] );
        this.elements.push(e);
        e = new Element( 54, "Xe", 131.29, 216, [153, 153, 153] );
        this.elements.push(e);
    }
    
    reset_table() {
        delete this.elements;
        this.elements = [];
        this.add_all_known_elements();
    }
    
    get_by_name(name) {
        for (const e of this.elements) {
            if (name == e.name) {
                return e
            }
        }        
        return null;
    }
    
    get_by_num(n) {
        for (const e of this.elements) {
            if (n == e.n) {
                return e
            }
        }        
        return null;
    }

    rescale_radii(r) {
        for (const e of this.elements) {
            e.radius *= r;
        }
    }
}

