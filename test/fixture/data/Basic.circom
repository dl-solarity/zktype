pragma circom 2.1.8;

template Multiplier2() {
   //Declaration of signals
   signal input in1;
   signal input in2;
   signal output out <== in1 * in2;
}
