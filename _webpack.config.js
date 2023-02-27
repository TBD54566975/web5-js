const path = require('path');

module.exports = {
  mode: 'development',
  entry: './main.js',
  // watch: true,
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'web5-sdk.js',
    library: {
      type: 'module'
    }
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['', '.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
    ],
  }
};
