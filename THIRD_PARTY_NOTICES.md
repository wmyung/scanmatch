# Third-party notices

ScanMatch embeds the following software inside `index.html` (`src/engine.html`):

| Component | Version | License | Source |
|---|---|---|---|
| zxing-wasm (JavaScript wrapper and WebAssembly build) | 2.2.4 | MIT, © Ze-Zheng Wu | https://github.com/Sec-ant/zxing-wasm |
| zxing-cpp (barcode decoding library compiled into the WebAssembly module) | commit fba4e95 | Apache License 2.0, © ZXing authors | https://github.com/zxing-cpp/zxing-cpp |

The full Apache License 2.0 text is in [`licenses/Apache-2.0.txt`](licenses/Apache-2.0.txt).
No other third-party code, fonts or network resources are used; the app works offline once loaded.
