import click

from .htlc.cli import COMMANDS as HTLC_COMMANDS

COMMANDS = click.Group('commands')
COMMANDS.add_command(HTLC_COMMANDS, "htlc")

if __name__ == "__main__":
    COMMANDS.main()
