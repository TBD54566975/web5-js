# Web5 Agent Example

## Installation

To run this example you'll need at least one instance of [dwn-server](https://github.com/TBD54566975/dwn-server)
running locally.

### Start DWN Server

The server can be run in a Docker container or as a Node.js process.  By default, the server listens on
`http://localhost:3000`.  Refer to the `dwn-server` [README](https://github.com/TBD54566975/dwn-server#README) for more detail on configuration options.

**Using Docker**

```shell
docker run -p 3000:3000 ghcr.io/tbd54566975/dwn-server:main
```

**Using a Local Repository Clone**

```shell
git clone https://github.com/TBD54566975/dwn-server.git
cd dwn-server/
npm install && npm run server
```

### Start the Web5 Agent

Start a web server that serves the in-browser Web5 Agent HTML and JS files from disk.

```shell
cd examples/web5-agent/
npm install && npm run server
```

The Web5 Agent is now accessible at `http://localhost:8080`.

## Usage

Navigate to [http://localhost:8080/](http://localhost:8080/) in a web browser.

When you load (or refresh) the page, you'll see the result of the CRUD operations happening live with the in-browser
DWN and the `dwn-server` instance over HTTP.

## Local Development

If you want to use a local clone of the `web5-js` repository with the Web5 Agent example instead of a published
package follow the steps below.

### Build Web5 JS Bundles

First, build the `web5-js` bundles for node and browser environments:

```shell
cd web5-js/
npm install
npm run build
```

The bundles are output to the `dist/` sub-directory.

### Use Package Linking

To enable use of the local `web5-js` package by `web5-agent`,
use package linking.  Package linking is a two-step process:

1. First `npm link` in the `web5-js` package to create a symlink
in the global folder `{prefix}/lib/node_modules/web5-js`:
    ```shell
    cd web5-js/
    npm link
    ```

2. Next, in the `web5-agent` directory, run the commands below to install package dependencies, and create a symbolic
    link from the globally-installed `web5-js` package to the `node_modules/` of the current directory:
    ```shell
    cd examples/web5-agent/
    npm install
    npm link @tbd54566975/web5
    ```

Then comment out the import of the published package and uncomment the local import, such that it reads:
```javascript
// import { Web5 } from 'https://unpkg.com/@tbd54566975/web5@0.6.0/dist/browser.mjs';
import { Web5 } from './browser.mjs';
```

Now, whenever you use the `web5-agent` example it will use the local development instance of `web5-js`.
