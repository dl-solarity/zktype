pragma circom 2.1.8;

template EnhancedMultiplier() {
   signal input in1[1][2][3];
   signal input in2;

   signal output out <== in2 * in2;
}

component main {public [in1,in2]} = EnhancedMultiplier();
