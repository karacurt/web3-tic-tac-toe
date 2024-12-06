// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SenderIsOpponent, InvalidPlayer, GameStarted, GameFinished, GameNotExists, MoveInvalid, MoveNotForwardProgressing, MoveTaken, GameNotStarted} from "./Errors.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {TicTacToeMetadata} from "./TicTacToeMetadata.sol";

/// @title TicTacToe
/// @notice TicTacToe is a simple game where two players can play each other on the same chain
contract TicTacToe is ERC721 {
    uint256 public nextGameId;

    /// @notice Magic Square: https://mathworld.wolfram.com/MagicSquare.html
    uint8[3][3] private MAGIC_SQUARE = [[8, 3, 4], [1, 5, 9], [6, 7, 2]];
    uint8 private constant MAGIC_SUM = 15;

    /// @notice Structure for a local view of a game
    struct Game {
        address player;
        address opponent;
        uint256 gameId;
        // `1` for the player's moves, `2` opposing.
        uint8[3][3] moves;
        uint8 movesLeft;
        uint256 opponentBlockNumber;
        uint256 playerBlockNumber;
        bool isFinished;
        address winner;
    }

    /// @notice A game is identified from the (gameId) tuple from the chain it was initiated on
    ///         Since players on the same chain can play each other, we need to subspace by address as well.
    mapping(uint256 => Game) games;

    /// @notice Emitted when broadcasting a new game invitation. Anyone is allowed to accept
    event NewGame(uint256 gameId, address player);

    /// @notice Emitted when a player accepts an opponent's game
    event AcceptedGame(uint256 gameId, address opponent, address player);

    /// @notice Emitted when a player makes a move in a game
    event MovePlayed(uint256 gameId, address player, uint8 _x, uint8 _y);

    /// @notice Emitted when a player has won the game with their latest move
    event GameWon(uint256 gameId, address winner, uint8 _x, uint8 _y);

    /// @notice Emitted when all spots on the board were played with no winner with their lastest move
    event GameDraw(uint256 gameId, address player, uint8 _x, uint8 _y);

    TicTacToeMetadata public metadata;

    constructor(address _metadata) ERC721("TicTacToe", unicode"T³") {
        metadata = TicTacToeMetadata(_metadata);
    }   

    /// @notice Creates a new game that any player can accept
    function newGame() external {
        uint256 gameId = nextGameId;
        Game storage game = games[gameId];
        game.player = msg.sender;
        game.movesLeft = 9;
        game.gameId = gameId;
        
        // Mint the NFT with the current gameId before incrementing
        _mint(address(this), gameId);
        
        emit NewGame(gameId, msg.sender);
        nextGameId++;
    }

    /// @notice Send out an acceptance event for a new game
    function acceptGame(uint256 _gameId) external {
        if (games[_gameId].opponent != address(0)) revert GameStarted();
        if (games[_gameId].player == msg.sender) revert SenderIsOpponent();

        // Record Game Metadata (no moves)
        Game storage game = games[_gameId];
        game.opponent = msg.sender;

        emit AcceptedGame(_gameId, msg.sender, game.player);
    }

    /// @notice Make a move for a game.
    function makeMove(uint256 _gameId, uint8 _x, uint8 _y) external {
        Game storage game = games[_gameId];
        if (game.player == address(0)) revert GameNotExists();
        if (game.opponent == address(0)) revert GameNotStarted();
        if (game.isFinished) revert GameFinished();
        if (game.player != msg.sender && game.opponent != msg.sender)
            revert InvalidPlayer();

        // Check if it's the player's turn
        bool isPlayerTurn = (game.movesLeft % 2 == 1);
        if ((isPlayerTurn && msg.sender != game.player) || 
            (!isPlayerTurn && msg.sender != game.opponent)) {
            revert MoveNotForwardProgressing();
        }

        // Make a move
        if (_x >= 3 || _y >= 3) revert MoveInvalid();
        if (game.moves[_x][_y] != 0) revert MoveTaken();
        
        // Mark the move
        game.moves[_x][_y] = isPlayerTurn ? 1 : 2;
        game.movesLeft--;

        address winner = _isGameWon(game);

        if (winner != address(0)) {
            emit GameWon(_gameId, winner, _x, _y);
            _transfer(address(this), winner, _gameId);
            game.isFinished = true;
            game.winner = winner;
        } else if (game.movesLeft == 0) {
            emit GameDraw(_gameId, msg.sender, _x, _y);
            game.isFinished = true;
        } else {
            emit MovePlayed(_gameId, msg.sender, _x, _y);
        }
    }

    function gameState(uint256 _gameId) public view returns (Game memory) {
        return games[_gameId];
    }

    function getWinner(uint256 _gameId) public view returns (address) {
        return _isGameWon(games[_gameId]);
    }

    /// @notice helper to check if a game has been won and returns the winning player's address
    /// @return winner The address of the winning player, or address(0) if no winner
    function _isGameWon(Game memory _game) internal view returns (address) {
        // Check for a row/col win
        for (uint8 i = 0; i < 3; i++) {
            uint8 rowSum = (_game.moves[i][0] * MAGIC_SQUARE[i][0]) +
                (_game.moves[i][1] * MAGIC_SQUARE[i][1]) +
                (_game.moves[i][2] * MAGIC_SQUARE[i][2]);

            if (rowSum == MAGIC_SUM) return _game.player;
            if (rowSum == MAGIC_SUM * 2) return _game.opponent;

            uint8 colSum = (_game.moves[0][i] * MAGIC_SQUARE[0][i]) +
                (_game.moves[1][i] * MAGIC_SQUARE[1][i]) +
                (_game.moves[2][i] * MAGIC_SQUARE[2][i]);

            if (colSum == MAGIC_SUM) return _game.player;
            if (colSum == MAGIC_SUM * 2) return _game.opponent;
        }

        // Check for a diag win
        uint8 leftToRightDiagSum = (_game.moves[0][0] * MAGIC_SQUARE[0][0]) +
            (_game.moves[1][1] * MAGIC_SQUARE[1][1]) +
            (_game.moves[2][2] * MAGIC_SQUARE[2][2]);

        if (leftToRightDiagSum == MAGIC_SUM) return _game.player;
        if (leftToRightDiagSum == MAGIC_SUM * 2) return _game.opponent;

        uint8 rightToLeftDiagSum = (_game.moves[0][2] * MAGIC_SQUARE[0][2]) +
            (_game.moves[1][1] * MAGIC_SQUARE[1][1]) +
            (_game.moves[2][0] * MAGIC_SQUARE[2][0]);

        if (rightToLeftDiagSum == MAGIC_SUM) return _game.player;
        if (rightToLeftDiagSum == MAGIC_SUM * 2) return _game.opponent;

        return address(0);
    }

    function tokenURI(uint256 _gameId) public view override returns (string memory) {
        return metadata.tokenURI(games[_gameId]);
    }
}
