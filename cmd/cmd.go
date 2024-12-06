package main

import (
	"os"
	"tictactoe/bindings/TicTacToe"
	"tictactoe/bindings/TicTacToeMetadata"
	"tictactoe/cmd/version"

	"github.com/spf13/cobra"
)

func CreateRootCommand() *cobra.Command {
	rootCmd := &cobra.Command{
		Use:   "tictactoe",
		Short: "tictactoe: CLI to the TicTacToe Game",
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Help()
		},
	}

	rootCmd.AddCommand(CreateCompletionCommand(rootCmd))
	rootCmd.AddCommand(CreateVersionCommand())
	rootCmd.AddCommand(TicTacToe.CreateTicTacToeCommand())
	rootCmd.AddCommand(TicTacToeMetadata.CreateTicTacToeMetadataCommand())

	// By default, cobra Command objects write to stderr. We have to forcibly set them to output to
	// stdout.
	rootCmd.SetOut(os.Stdout)

	return rootCmd
}

func CreateCompletionCommand(rootCmd *cobra.Command) *cobra.Command {
	completionCmd := &cobra.Command{
		Use:   "completion",
		Short: "Generate shell completion scripts for tictactoe",
		Long: `Generate shell completion scripts for tictactoe.

The command for each shell will print a completion script to stdout. You can source this script to get
completions in your current shell session. You can add this script to the completion directory for your
shell to get completions for all future sessions.

For example, to activate bash completions in your current shell:
		$ . <(tictactoe completion bash)

To add tictactoe completions for all bash sessions:
		$ tictactoe completion bash > /etc/bash_completion.d/tictactoe_completions`,
	}

	bashCompletionCmd := &cobra.Command{
		Use:   "bash",
		Short: "bash completions for tictactoe",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenBashCompletion(cmd.OutOrStdout())
		},
	}

	zshCompletionCmd := &cobra.Command{
		Use:   "zsh",
		Short: "zsh completions for tictactoe",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenZshCompletion(cmd.OutOrStdout())
		},
	}

	fishCompletionCmd := &cobra.Command{
		Use:   "fish",
		Short: "fish completions for tictactoe",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenFishCompletion(cmd.OutOrStdout(), true)
		},
	}

	powershellCompletionCmd := &cobra.Command{
		Use:   "powershell",
		Short: "powershell completions for tictactoe",
		Run: func(cmd *cobra.Command, args []string) {
			rootCmd.GenPowerShellCompletion(cmd.OutOrStdout())
		},
	}

	completionCmd.AddCommand(bashCompletionCmd, zshCompletionCmd, fishCompletionCmd, powershellCompletionCmd)

	return completionCmd
}

func CreateVersionCommand() *cobra.Command {
	versionCmd := &cobra.Command{
		Use:   "version",
		Short: "Print the version of tictactoe that you are currently using",
		Run: func(cmd *cobra.Command, args []string) {
			cmd.Println(version.TicTacToeVersion)
		},
	}

	return versionCmd
}
