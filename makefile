use this to verify the timeLock contract(it uses verification script verify.js) : npx hardhat run scripts/verify.js --network amoy 
use this to verify the GovernerContract: npx hardhat verify --network amoy 0xec0E8BCd8C99eE8dE312d310eB6396f03fc812CB "0x93746f1bfE6a43387C3bdB0293B8E7FA7Dc7D2C6" "0xD101eC91B5226cA24BDcdCAac5fFc103fC2b9762" "4" "450" "150"
For all other contracts use : npx hardhat verify --network amoy 0xec0E8BCd8C99eE8dE312d310eB6396f03fc812CB // contract address 
