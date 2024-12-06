// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {TicTacToe} from "./TicTacToe.sol";

contract TicTacToeMetadata {
    using Strings for uint256;
    
    TicTacToe public immutable game;
    
    constructor(address _game) {
        game = TicTacToe(_game);
    }

    function tokenURI(uint256 _gameId) external view returns (string memory) {
        TicTacToe.Game memory gameState = game.gameState(_gameId);
        
        bytes memory image = abi.encodePacked(
            'data:image/svg+xml;base64,',
            Base64.encode(
                bytes(
                    abi.encodePacked(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" style="background:#fff">',
                        _generateBoard(gameState),
                        '</svg>'
                    )
                )
            )
        );

        return string(
            abi.encodePacked(
                'data:application/json;base64,',
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name": "Game #',
                            _gameId.toString(),
                            '", "description": "On-chain Tic Tac Toe game", "image": "',
                            image,
                            '"}'
                        )
                    )
                )
            )
        );
    }

    function _generateBoard(TicTacToe.Game memory _game) internal pure returns (string memory) {
        bytes memory svg = abi.encodePacked(
            '<style>.cell{stroke:#000;stroke-width:2;fill:none;}.x{stroke:#ff0000;}.o{stroke:#0000ff;}</style>',
            '<rect x="100" y="0" width="2" height="300" fill="black"/>',
            '<rect x="200" y="0" width="2" height="300" fill="black"/>',
            '<rect x="0" y="100" width="300" height="2" fill="black"/>',
            '<rect x="0" y="200" width="300" height="2" fill="black"/>'
        );

        for (uint8 i = 0; i < 3; i++) {
            for (uint8 j = 0; j < 3; j++) {
                if (_game.moves[i][j] == 1) {
                    // Draw X
                    svg = abi.encodePacked(
                        svg,
                        _drawX(i * 100, j * 100)
                    );
                } else if (_game.moves[i][j] == 2) {
                    // Draw O
                    svg = abi.encodePacked(
                        svg,
                        _drawO(i * 100, j * 100)
                    );
                }
            }
        }
        
        return string(svg);
    }

    function _drawX(uint256 x, uint256 y) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<line x1="',
                (x + 20).toString(),
                '" y1="',
                (y + 20).toString(),
                '" x2="',
                (x + 80).toString(),
                '" y2="',
                (y + 80).toString(),
                '" class="x"/>',
                '<line x1="',
                (x + 80).toString(),
                '" y1="',
                (y + 20).toString(),
                '" x2="',
                (x + 20).toString(),
                '" y2="',
                (y + 80).toString(),
                '" class="x"/>'
            )
        );
    }

    function _drawO(uint256 x, uint256 y) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<circle cx="',
                (x + 50).toString(),
                '" cy="',
                (y + 50).toString(),
                '" r="30" class="cell o"/>'
            )
        );
    }
}
