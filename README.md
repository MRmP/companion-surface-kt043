# Companion Surface Plugin: iDisplay KT043

Bitfocus Companion surface plugin for the iDisplay KT043 5x3 LCD button keypad.

## Features

- 15 programmable LCD buttons (72x72 pixels each)
- Brightness control via Companion surface settings
- Button press/release detection

## Installation

### Option 1: Import Package (Recommended)

1. Download the latest `.tgz` package from the [Releases](https://github.com/MRmP/companion-surface-kt043/releases) page
2. In Companion, go to **Connections** → **Import module package**
3. Select the downloaded `.tgz` file
4. Restart Companion

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/MRmP/companion-surface-kt043.git
cd companion-surface-kt043

# Install dependencies
yarn install

# Build and package
yarn package
```

Then import the generated `idisplay-kt043-x.x.x.tgz` file into Companion.

### Option 3: Manual Installation

```bash
# Clone and build
git clone https://github.com/MRmP/companion-surface-kt043.git
cd companion-surface-kt043
yarn install
yarn build
```

Copy the entire folder to your Companion plugins directory:

- **Windows:** `%APPDATA%\companion-plugins\idisplay-kt043`
- **macOS:** `~/Library/Application Support/companion-plugins/idisplay-kt043`
- **Linux:** `~/.config/companion-plugins/idisplay-kt043`

Restart Companion.

## Requirements

- Node.js 22+
- Yarn 4.x
- Windows (64-bit) or Linux (64-bit)

## Support

Maintained by [beleven.no](https://www.beleven.no)
