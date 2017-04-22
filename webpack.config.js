var path = require('path');
var webpack = require('webpack');
var SplitByPathPlugin = require('webpack-split-by-path');

module.exports = {
    entry: {
        client: "src/client.js",
        test: "src/test.js"
    },
    output: {
        filename: "public/[name].js",
        chunkFilename: "public/[name].js"
    },
    module: {
        loaders: [
            {
                test: path.join(__dirname, 'src'),
                loader: 'babel', // 'babel-loader' is also a legal name to reference
                query: {
                    presets: ['react', 'es2015'],
                    plugins: ['transform-class-properties']
                }
            },
            { test: /jquery\.js$/, loader: 'expose?$' },
            { test: /jquery\.js$/, loader: 'expose?jQuery' }
        ]
    },
    plugins: [
        new SplitByPathPlugin([
            {
                name: 'vendor',
                path: path.join(__dirname, 'node_modules')
            }
        ]),
        new webpack.DefinePlugin({
            API_HOST: "'" + process.env.API_HOST + "'",
            USE_BASIC: "'" + process.env.USE_BASIC + "'",
            BASIC_SERVER_USER: "'" + process.env.BASIC_SERVER_USER + "'",
            BASIC_SERVER_PASSWORD: "'" + process.env.BASIC_SERVER_PASSWORD + "'"
        })
    ],
    resolve: {
        root: [
            __dirname
        ]
    }
};