.PHONY: clean generate hardhat bindings

build: hardhat bindings bin/tictactoe

rebuild: clean generate build

clean:
	rm -rf bin/* bindings/*

hardhat:
	npm install && npx hardhat compile

bin/tictactoe:
	mkdir -p bin
	go mod tidy
	go build -o bin/tictactoe ./cmd

bindings/TicTacToe/TicTacToe.go: hardhat
	mkdir -p bindings/TicTacToe
	seer evm generate --package TicTacToe --output bindings/TicTacToe/TicTacToe.go --hardhat artifacts/contracts/TicTacToe.sol/TicTacToe.json --cli --struct TicTacToe

bindings/TicTacToeMetadata/TicTacToeMetadata.go: hardhat
	mkdir -p bindings/TicTacToeMetadata
	seer evm generate --package TicTacToeMetadata --output bindings/TicTacToeMetadata/TicTacToeMetadata.go --hardhat artifacts/contracts/TicTacToeMetadata.sol/TicTacToeMetadata.json --cli --struct TicTacToeMetadata

bindings: bindings/TicTacToe/TicTacToe.go bindings/TicTacToeMetadata/TicTacToeMetadata.go