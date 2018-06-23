from shwop.__main__ import COMMANDS

# Necessary to fix PyInstaller native library detection bug
import Crypto.Hash.keccak

COMMANDS.main()
