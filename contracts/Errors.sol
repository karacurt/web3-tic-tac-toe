/// @notice Thrown when a player tries to play themselves;
error SenderIsOpponent();

/// @notice Thrown when the caller is not allowed to act
error InvalidPlayer();

/// @notice Thrown when the game has already been started
error GameStarted();

/// @notice Thrown when the game has already been finished
error GameFinished();

/// @notice Thrown when a game does not exist
error GameNotExists();

/// @notice Thrown when the player makes an invalid move
error MoveInvalid();

/// @notice Thrown when the consumed event is not forward progressing the game.
error MoveNotForwardProgressing();

/// @notice Thrown when the player makes a move that's already been played
error MoveTaken();

/// @notice Thrown when the game has not been started
error GameNotStarted();