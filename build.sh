#!/usr/bin/env bash

source .env

npm install
rm -f public/client.js public/test.js public/vendor.js
node node_modules/webpack/bin/webpack.js
cp -Rf node_modules/bootstrap/dist/ public/css/bootstrap
cp -Rf node_modules/alloyeditor/dist/alloy-editor public/css/alloy-editor

echo "You can run:"
echo "( cd public && php -S localhost:8082 )"
echo "node_modules/webpack/bin/webpack.js -w"
