import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("TicTacToe", function () {
  async function deployGameFixture() {
    // Deploy the metadata contract first
    const TicTacToeMetadata = await hre.ethers.getContractFactory("TicTacToeMetadata");
    const [owner, playerOne, playerTwo] = await hre.ethers.getSigners();
    
    // Deploy main game contract
    const TicTacToe = await hre.ethers.getContractFactory("TicTacToe");
    const metadata = await TicTacToeMetadata.deploy(); // Temporary address, will update
    const game = await TicTacToe.deploy(await metadata.getAddress());
    
    // Update metadata with correct game address
    const updatedMetadata = await TicTacToeMetadata.deploy();
    
    return { game, metadata: updatedMetadata, owner, playerOne, playerTwo };
  }

  describe("Game Creation", function () {
    it("Should create a new game", async function () {
      const { game, playerOne } = await loadFixture(deployGameFixture);
      
      await expect(game.connect(playerOne).newGame())
        .to.emit(game, "NewGame")
        .withArgs(0, playerOne.address);
      
      const gameState = await game.gameState(0);
      expect(gameState.player).to.equal(playerOne.address);
      expect(gameState.movesLeft).to.equal(9);
    });

    it("Should allow opponent to accept game", async function () {
      const { game, playerOne, playerTwo } = await loadFixture(deployGameFixture);
      
      await game.connect(playerOne).newGame();
      
      await expect(game.connect(playerTwo).acceptGame(0))
        .to.emit(game, "AcceptedGame")
        .withArgs(0, playerTwo.address, playerOne.address);
    });

    it("Should not allow game creator to accept their own game", async function () {
      const { game, playerOne } = await loadFixture(deployGameFixture);
      
      await game.connect(playerOne).newGame();
      
      await expect(game.connect(playerOne).acceptGame(0))
        .to.be.revertedWithCustomError(game, "SenderIsOpponent");
    });
  });

  describe("Gameplay", function () {
    async function setupGame() {
        const { game, playerOne, playerTwo } = await loadFixture(deployGameFixture);
        await game.connect(playerOne).newGame();
        await game.connect(playerTwo).acceptGame(0);
        return { game, playerOne, playerTwo };
    }

    it("Should allow valid moves", async function () {
        const { game, playerOne, playerTwo } = await setupGame();
        
        // First move by player one
        await expect(game.connect(playerOne).makeMove(0, 0, 0))
            .to.emit(game, "MovePlayed")
            .withArgs(0, playerOne.address, 0, 0);

        // Second move by player two
        await expect(game.connect(playerTwo).makeMove(0, 1, 0))
            .to.emit(game, "MovePlayed")
            .withArgs(0, playerTwo.address, 1, 0);
    });

    it("Should not allow moves on taken spaces", async function () {
        const { game, playerOne, playerTwo } = await setupGame();
        
        // First move
        await game.connect(playerOne).makeMove(0, 0, 0);
        // Second move - try same spot
        await expect(game.connect(playerTwo).makeMove(0, 0, 0))
            .to.be.revertedWithCustomError(game, "MoveTaken");
    });

    it("Should detect a win condition", async function () {
        const { game, playerOne, playerTwo } = await setupGame();
        
        // Simulate a diagonal win for player one
        // Player 1: top left
        await game.connect(playerOne).makeMove(0, 0, 0);
        // Player 2: top middle
        await game.connect(playerTwo).makeMove(0, 1, 0);
        // Player 1: middle
        await game.connect(playerOne).makeMove(0, 1, 1);
        // Player 2: top right
        await game.connect(playerTwo).makeMove(0, 2, 0);
        // Player 1: bottom right (winning move)
        await expect(game.connect(playerOne).makeMove(0, 2, 2))
            .to.emit(game, "GameWon")
            .withArgs(0, playerOne.address, 2, 2);
    });

    it("Should enforce alternating turns", async function () {
        const { game, playerOne, playerTwo } = await setupGame();
        
        // Player 1's first move
        await game.connect(playerOne).makeMove(0, 0, 0);
        
        // Player 1 tries to go again (should fail)
        await expect(game.connect(playerOne).makeMove(0, 1, 0))
            .to.be.revertedWithCustomError(game, "MoveNotForwardProgressing");
        
        // Player 2's turn (should succeed)
        await expect(game.connect(playerTwo).makeMove(0, 1, 0))
            .to.emit(game, "MovePlayed")
            .withArgs(0, playerTwo.address, 1, 0);
    });

    it("Should not allow moves after game is finished", async function () {
        const { game, playerOne, playerTwo } = await setupGame();
        
        // Play a winning game
        await game.connect(playerOne).makeMove(0, 0, 0); // X
        await game.connect(playerTwo).makeMove(0, 1, 0); // O
        await game.connect(playerOne).makeMove(0, 1, 1); // X
        await game.connect(playerTwo).makeMove(0, 2, 0); // O
        await game.connect(playerOne).makeMove(0, 2, 2); // X - wins

        // Try to make a move after game is won
        await expect(game.connect(playerTwo).makeMove(0, 0, 2))
            .to.be.revertedWithCustomError(game, "GameFinished");
    });
  });

  describe("Metadata & SVG", function () {
    async function playPartialGame() {
        const { game, metadata, playerOne, playerTwo } = await loadFixture(deployGameFixture);
        
        // Create and start game
        await game.connect(playerOne).newGame();
        await game.connect(playerTwo).acceptGame(0);
        
        // Make some moves to create an interesting board
        await game.connect(playerOne).makeMove(0, 0, 0); // X in top left
        await game.connect(playerTwo).makeMove(0, 1, 0); // O in middle left
        await game.connect(playerOne).makeMove(0, 2, 0); // X in bottom left
        
        return { game, metadata, playerOne, playerTwo };
    }

    function convertGameState(gameState: any) {
        // Create a deep copy of the game state with all required fields
        return {
            player: gameState.player,
            opponent: gameState.opponent,
            gameId: gameState.gameId,
            moves: gameState.moves.map((row: any) => [...row]),
            movesLeft: gameState.movesLeft,
            opponentBlockNumber: gameState.opponentBlockNumber || 0,
            playerBlockNumber: gameState.playerBlockNumber || 0,
            isFinished: gameState.isFinished,
            winner: gameState.winner
        };
    }

    it("Should generate valid token URI", async function () {
        const { game, metadata } = await playPartialGame();
        
        // Get the game state and convert it
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        
        expect(tokenUri).to.include('data:application/json;base64,');
        
        // Decode the base64 JSON
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        
        // Check metadata structure
        expect(parsedMetadata).to.have.property('name', 'Game #0');
        expect(parsedMetadata).to.have.property('description', 'On-chain Tic Tac Toe game');
        expect(parsedMetadata).to.have.property('image').that.includes('data:image/svg+xml;base64,');
    });

    it("Should generate valid SVG with game state", async function () {
        const { game, metadata } = await playPartialGame();
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        
        // Decode the SVG
        const svgBase64 = parsedMetadata.image.split(',')[1];
        const svg = Buffer.from(svgBase64, 'base64').toString();
        
        // Debug the SVG content
        console.log('SVG Content:', svg);
        
        // Check SVG content
        expect(svg).to.include('<svg xmlns="http://www.w3.org/2000/svg"');
        expect(svg).to.include('width="300"');
        expect(svg).to.include('height="300"');
        
        // Check game board elements - looking for style definitions
        expect(svg).to.include('.cell{'); // Should have cell styling in style tag
        expect(svg).to.include('class="x"'); // Should have X moves
        expect(svg).to.include('class="cell o"'); // Should have O moves with both classes
    });

    it("Should reflect empty board for new game", async function () {
        const { game, metadata, playerOne } = await loadFixture(deployGameFixture);
        await game.connect(playerOne).newGame();
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        const svgBase64 = parsedMetadata.image.split(',')[1];
        const svg = Buffer.from(svgBase64, 'base64').toString();
        
        // Should only have the grid, no X's or O's
        expect(svg).to.not.include('class="x"');
        expect(svg).to.not.include('class="o"');
        expect(svg).to.include('rect'); // Should still have grid lines
    });

    it("Should show winning game state", async function () {
        const { game, metadata, playerOne, playerTwo } = await loadFixture(deployGameFixture);
        
        // Play a winning game
        await game.connect(playerOne).newGame();
        await game.connect(playerTwo).acceptGame(0);
        
        // Create a diagonal win
        await game.connect(playerOne).makeMove(0, 0, 0); // X top left
        await game.connect(playerTwo).makeMove(0, 0, 1); // O top middle
        await game.connect(playerOne).makeMove(0, 1, 1); // X center
        await game.connect(playerTwo).makeMove(0, 1, 0); // O middle left
        await game.connect(playerOne).makeMove(0, 2, 2); // X bottom right
        
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        const svgBase64 = parsedMetadata.image.split(',')[1];
        const svg = Buffer.from(svgBase64, 'base64').toString();
        
        // Should have both X's and O's
        expect(svg).to.include('class="x"');
        expect(svg).to.include('class="cell o"');
        
        // Count the moves
        const xMoves = (svg.match(/class="x"/g) || []).length;
        const oMoves = (svg.match(/class="cell o"/g) || []).length;
        expect(xMoves).to.equal(6); // 3 X's with 2 lines each = 6 lines
        expect(oMoves).to.equal(2); // 2 O's
    });

    it("Should include game details in metadata", async function () {
        const { game, metadata, playerOne, playerTwo } = await loadFixture(deployGameFixture);
        
        // Create and play a game
        await game.connect(playerOne).newGame();
        await game.connect(playerTwo).acceptGame(0);
        
        // Make some moves
        await game.connect(playerOne).makeMove(0, 0, 0);
        
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        
        // Check metadata structure
        expect(parsedMetadata).to.have.property('attributes');
        const attributes = parsedMetadata.attributes;
        
        // Find attributes by trait_type
        const findAttribute = (traitType: string) => 
            attributes.find((attr: any) => attr.trait_type === traitType)?.value;
        
        expect(findAttribute('Game ID')).to.equal('0');
        expect(findAttribute('Player')).to.equal(playerOne.address.toLowerCase());
        expect(findAttribute('Opponent')).to.equal(playerTwo.address.toLowerCase());
        expect(findAttribute('Status')).to.equal('In Progress');
        expect(findAttribute('Winner')).to.equal('None');
        expect(findAttribute('Moves Left')).to.equal(8); // 9 - 1 move
    });

    it("Should update metadata when game is won", async function () {
        const { game, metadata, playerOne, playerTwo } = await loadFixture(deployGameFixture);
        
        // Play a winning game
        await game.connect(playerOne).newGame();
        await game.connect(playerTwo).acceptGame(0);
        
        // Create a diagonal win for player one
        await game.connect(playerOne).makeMove(0, 0, 0);
        await game.connect(playerTwo).makeMove(0, 1, 0);
        await game.connect(playerOne).makeMove(0, 1, 1);
        await game.connect(playerTwo).makeMove(0, 2, 0);
        await game.connect(playerOne).makeMove(0, 2, 2);
        
        const rawGameState = await game.gameState(0);
        const gameState = convertGameState(rawGameState);
        const tokenUri = await metadata.tokenURI(gameState);
        const json = Buffer.from(tokenUri.split(',')[1], 'base64').toString();
        const parsedMetadata = JSON.parse(json);
        
        const findAttribute = (traitType: string) => 
            parsedMetadata.attributes.find((attr: any) => attr.trait_type === traitType)?.value;
        
        expect(findAttribute('Status')).to.equal('Finished');
        expect(findAttribute('Winner')).to.equal(playerOne.address.toLowerCase());
        expect(findAttribute('Moves Left')).to.equal(4);
    });
  });
});
