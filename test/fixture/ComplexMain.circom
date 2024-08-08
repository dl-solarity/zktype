pragma circom 2.1.8;

function someFunction(a, b) {
    return a + b;
}

template ComplexMain(a, b) {
   //Declaration of signals
   signal input in1;
   signal input in2;
   signal output out <== in1 * in2;
}

component main {public [in1]} = ComplexMain(someFunction(1, 2), 5 * 5);
