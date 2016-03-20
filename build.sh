#!/bin/sh
rm -f public/client.js public/test.js public/vendor.js
node_modules/webpack/bin/webpack.js
cp -Rf node_modules/bootstrap/dist/ public/css/bootstrap

echo "You can run:"
echo "( cd public && php -S localhost:8082 )"
echo "node_modules/webpack/bin/webpack.js -w"
