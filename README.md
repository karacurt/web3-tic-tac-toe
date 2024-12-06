# On Chain Tic Tac Toe

This is a simple implementation of a Tic Tac Toe game on Ethereum. It is built with Solidity and deployed to the Game7 blockchain.
It is a fork of the [Tic Tac Toe](https://github.com/ethereum-optimism/supersim/blob/main/contracts/src/tictactoe/TicTacToe.sol) example from Optimism. But with some changes to the code structure to mint a NFT for each game table, and to dynamically updates the on-chain NFT metadata with the current game state.

## Try it out

Tic Tac Toe is deployed to the Game7 blockchain at the following addresses:

- Tic Tac Toe: [0xF656230Ec5dB327b0a0350EEd061C2aFBd57810D](https://testnet.game7.io/address/0xF656230Ec5dB327b0a0350EEd061C2aFBd57810D)
- Tic Tac Toe Metadata: [0x11FfC4Da54662a14834c9cEb84954823e2bCFF94](https://testnet.game7.io/address/0x11FfC4Da54662a14834c9cEb84954823e2bCFF94)

## Install dependencies

```shell
npm install
```

## Compile and test

```shell
npx hardhat compile
npx hardhat test
```
