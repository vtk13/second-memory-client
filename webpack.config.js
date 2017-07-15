var path = require('path');
var webpack = require('webpack');
var SplitByPathPlugin = require('webpack-split-by-path');

module.exports = {
    entry: {
        client: "client.js",
        test: "test.js"
    },
    output: {
        filename: "public/[name].js",
        chunkFilename: "public/[name].js"
    },
    module: {
        rules: [
            {
                test: path.join(__dirname, 'src'),
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['react', 'es2015'],
                        plugins: ['transform-class-properties']
                    }
                }
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery'
        }),
        new SplitByPathPlugin([
            {name: 'vendor', path: path.join(__dirname, 'node_modules')}
        ]),
        new webpack.DefinePlugin({
            API_HOST: "'" + process.env.API_HOST + "'",
            USE_BASIC: "'" + process.env.USE_BASIC + "'",
            BASIC_SERVER_USER: "'" + process.env.BASIC_SERVER_USER + "'",
            BASIC_SERVER_PASSWORD: "'" + process.env.BASIC_SERVER_PASSWORD + "'"
        })
    ],
    resolve: {modules: [path.join(__dirname, 'src'), "node_modules"]}
};