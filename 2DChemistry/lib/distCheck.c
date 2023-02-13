#include <stdio.h>
#include <emscripten.h> // note we added the emscripten header

int test (int * a) {
    a[0]+=1;
    return a[0];
}

int check_distance(float x1, float y1, float r1, float x2, float y2, float r2) {
    float dx = x2-x1;
    float dy = y2-y1;
    float  r = r2+r1;
    return dx*dx+dy*dy < r*r ;
}

void detect_collisions(int n, float* x, float* y, float* r, int* nPairs, int* pairs) {
    int k = 0;
    nPairs[0] = 0;
    for ( int i = 0; i < n-1; i++ ) {
        for ( int j = i + 1 ; j < n; j++ ) {
            if ( check_distance( x[i], y[i], r[i], x[j], y[j], r[j]) ) {
                nPairs[0]++;                
                pairs[k]   = i;
                pairs[k+1] = j;
                k += 2;
            }                        
        }
    }
}
