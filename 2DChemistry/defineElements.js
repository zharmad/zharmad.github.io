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
        this.image = undefined;
        this.imageOffset = undefined;
    }
    
    parse_colourVec() {
        return `rgb(${this.colourVec[0]},${this.colourVec[1]},${this.colourVec[2]})`
    }
    
    // To prep for the fast-display update.
    // Use drawImage rather than putImageData(), in order to include transparency.
    create_image( canvas, ctx, scale ) {
        const r = this.radius * scale ;
        const lineWidth = 0.5;
        const d = Math.ceil( 2.0 * (r + lineWidth) );

        canvas.width = canvas.height = d;
        // Draw circle to fill up this canvas.
        ctx.beginPath();
        
        const xCent = d/2, yCent = d/2;        
        const rI = 0.5 * r;
        // Use shading to make the circles pop a little more.
        const colourGradient = ctx.createRadialGradient(xCent, yCent, rI, xCent, yCent, r);
        colourGradient.addColorStop(0, this.parse_colourVec() );
        colourGradient.addColorStop(1, 'black');
        ctx.fillStyle = colourGradient;
        ctx.lineWidth   = lineWidth;
        ctx.strokeStyle = 'black';
        
        ctx.arc( xCent, yCent, r, 0, 2 * Math.PI );
        ctx.fill();
        ctx.stroke();
        // Copy circle to 
        //const imageData = ctx.getImageData(0, 0, d, d);        
        this.image = new Image( d, d );
        this.image.src = canvas.toDataURL('img/png');
        this.imageOffset = -d/2;
        
        ctx.clearRect( 0, 0, d, d );
    }
    
    draw(ctx, x, y) {
        const off = this.imageOffset ;
        ctx.drawImage( this.image, x - this.imageOffset, y - this.imageOffset );
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
        e = new Element( 35, "Br", 79.904, 185, [172,  48,  32] );
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
    
    //Creates a temporary canvas to draw on and obtain.
    create_all_images( scale ) {
        if ( undefined === scale ) { scale = 1; }
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        for (const e of this.elements) {
            e.create_image( canvas, ctx, scale );
        }
        canvas.remove();
    }
}

