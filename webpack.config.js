const path = require('path')
const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = [
  {
    mode: 'development',
    entry: './index.js',
    output: {
      filename: 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.less$/,
          use: [
            'vue-style-loader',
            'css-loader',
            'less-loader'
          ]
        },
        {
          test: /\.(png|jpg|gif|svg)$/,
          loader: 'file-loader',
          options: {
            name: '[name].[ext]?[hash]'
          }
        }
      ]
    },
    plugins: [
      new VueLoaderPlugin(),
    ],
  },
];

// output: {
//   filename: 'my-first-webpack.bundle.js'
// },
// module: {
//   rules: [
//     { test: /\.txt$/, use: 'raw-loader' }
//   ]
// }