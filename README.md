# Companion Surface Plugin: iDisplay KT043

Bitfocus Companion surface plugin for the iDisplay KT043 5x3 LCD button keypad.

## Features

- 15 programmable LCD buttons (72x72 pixels each)
- Brightness control via Companion surface settings
- Button press/release detection

## Installation

```bash
# Clone the repository
git clone https://github.com/MRmP/companion-surface-kt043.git

# Enter the directory
cd companion-surface-kt043

# Install dependencies
yarn install

# Build the plugin
yarn build
```

Then copy the plugin to your Companion plugins folder:

**Windows:**
```bash
xcopy /E /I . "%APPDATA%\companion-plugins\idisplay-kt043"
```

**macOS:**
```bash
cp -r . ~/Library/Application\ Support/companion-plugins/idisplay-kt043
```

**Linux:**
```bash
cp -r . ~/.config/companion-plugins/idisplay-kt043
```

Restart Companion for the plugin to load.

## Requirements

- Node.js 22+
- Yarn
- Windows (64-bit) or Linux (64-bit)

## Support

Maintained by [beleven.no](https://www.beleven.no)
