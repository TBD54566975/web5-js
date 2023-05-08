# Simple Agent Local and Remote DWN Example

## Installation

### Build Web5 JS Bundles

First, build the `web5-js` bundles for node and browser environments:

```shell
cd web5-js/
npm install
npm run build
```

The bundles are output to the `dist/` sub-directory.

### Use Package Linking

To enable use of the local `web5-js` package by `simple-agent`,
use package linking.  Package linking is a two-step process:

1. First `npm link` in the `web5-js` package to create a symlink
in the global folder `{prefix}/lib/node_modules/web5-js`:
    ```shell
    cd web5-js/
    npm link
    ```

2. Next, in the `simple-agent` directory, run the command below to create a symbolic link from the globally-installed `web5-js` package to the `node_modules/` of the current directory:
    ```shell
    cd examples/simple-agent/
    npm link @tbd54566975/web5
    ```

Now, whenever you start a `simple-agent` it will use the local
development of `web5-js`.

### Start Simple Agent(s)

To test with remote DWNs, start at least one agent:

```shell
cd examples/simple-agent/
npm install
npm run serve -p 8085
```

The agent will be accessible on `http://localhost:8085`.

If you want to test with multiple DWNs, start agents on ports `8086` and `8087`.

### Start Test Dashboard Web Server

To use the locally built bundles, a simple web server is started
that serves the HTML and JS files from disk.

```shell
cd examples/test-dashboard/
npm install
npm run serve
```

The test dashboard site is accessible at `http://localhost:8080`.


## Usage

Navigate to [http://localhost:8080/simple-agent.html](http://localhost:8080/simple-agent.html) in a web browser.

For Google Chrome,right-click somewhere in the page and select **Inspect** and then open your **Console**.

When you refresh the page, you'll see the result of the writes and queries to the in-browser DWN.

If you have at least one `simple-agent` running, you'll also see the result of writing to the "remote"
DWNs.

** Note that if you have the agent running on port 8085 shut down but one on ports 8086 or 8087 are up, the message
will be successfully processed on the first one that is available.  First 8085 is tried, then 8086, and finally 8087.
Even though the message may be successfully processed on the port 8086 instance, your web browser will still report an
`ERR_CONNECTION_REFUSED` message as a result of first trying 8085 before moving on to 8086.  There is no way to disable
this error reporting in a browser.