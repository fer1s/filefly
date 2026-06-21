# README OF SITO FILE BROWSER

# 1. Clone the project

```
git clone https://github.com/sito8943/sito-file-browser.git
```

# 2. Requirements:

1. Node https://nodejs.org/en/blog/release/v18.18.0/

_if you are on windows just download the binary and install it_

_if you are on linux or macos use NVM_

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

_you can use NVM on windows if you wish too [here](https://github.com/coreybutler/nvm-windows/releases/download/1.2.2/nvm-setup.exe)_

2. Rust https://www.rust-lang.org/tools/install

```
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

_if you are on windows just click here [Rust windows binary](https://translate.google.com/website?sl=en&tl=es&hl=es&client=srp&u=https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe)_

_and optional if you don't have curl_ 3. Curl https://curl.se/windows/

# 3. How to run?

To install all dependencies, only one time per clone

```
npm install
```

To run frontend and desktop app

```
npm run tauri dev
```

This will install rust packages if they are not in hard drive yet, this will happen one time only
