/**
 * Created by tangf on 2017/7/31.
 */
require('./check-versions')()

process.env.NODE_ENV = 'production'

var fs = require("fs")
var gulp = require("gulp")
var ora = require('ora') //命令行环境的 loading效果
var rm = require('rimraf') //删除文件的模块
var path = require('path')
var chalk = require('chalk') //颜色插件
var webpack = require('webpack')
var config = require('../config')
var webpackConfig = require('./webpack.prod.conf')
var merge = require('webpack-merge')
var utils = require("./utils")
var async = require("async")

var HtmlWebpackPlugin = require('html-webpack-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var CopyWebpackPlugin = require('copy-webpack-plugin')
var project = require("./project");
var project_name = project.project_name;
var projects = project.projects;

/**
 * 编译单个项目
 * @param {string} item 项目名称
 * @param {function} callback 回调结果
 */
var buildItem = function (item, callback) {
    var app_dir = "../src/projects/" + item;
    var app_entry = path.resolve(__dirname, app_dir + '/index.ts');
    var app_html_entry = path.resolve(__dirname, app_dir + '/index.html');
    var app_config_entry = path.resolve(__dirname, app_dir + '/config.json');
    var app_config = project.get_config(item);

    if (!fs.existsSync(app_entry)) {
        // throw '  游戏「' + item + '」入口文件 index.js 不存在，请检查项目。\n';
        console.log(chalk.red('\n  项目「' + item + '」入口文件 index.ts 不存在，请检查项目。'));
        if (callback) {
            callback();
        }
        return true;
    }
    if (!fs.existsSync(app_html_entry)) {
        // throw '  游戏「' + item + '」入口文件 index.html 不存在，请检查项目。\n';
        console.log(chalk.red('\n  项目「' + item + '」入口文件 index.html 不存在，请检查项目。'));
        if (callback) {
            callback();
        }
        return true;
    }
    var plugins = [
        new ExtractTextPlugin({
            filename: path.posix.join(item, '/css/' + app_config['css-name'])
        }),
        new HtmlWebpackPlugin({
            filename: path.resolve(__dirname, '../dist/' + item + '/index.html'),
            template: app_html_entry,
            inject: true,
            minify: {
                removeComments: true,
                collapseWhitespace: true,
                removeAttributeQuotes: true
                // more options:
                // https://github.com/kangax/html-minifier#options-quick-reference
            },
            // necessary to consistently work with multiple chunks via CommonsChunkPlugin
            chunksSortMode: 'dependency'
        })
    ];
    var static_entry = path.resolve(__dirname, app_dir + '/static');
    if (fs.existsSync(static_entry)) {
        plugins.push(new CopyWebpackPlugin([
            {
                from: static_entry,
                to: path.resolve(__dirname, '../dist/' + item + '/static'),
                ignore: ['.*']
            }
        ]));
    }

    var currentWebpackConfig = merge(webpackConfig, {
        entry: {
            app: app_entry
        },
        output: {
            filename: path.posix.join(item, '/js/' + app_config['js-name'])
        },
        plugins: plugins
    });
    console.log(chalk.yellow('\n  正在编译项目「' + item + '」'));
    console.log(chalk.yellow('\n  入口「' + app_entry + '」'));
    webpack(currentWebpackConfig, function (err, stats) {
        if (err) throw err
        process.stdout.write(stats.toString({
            colors: true,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
        }) + '\n\n')
        console.log(chalk.cyan('  项目[' + item + ']编译完成。用时：' + (stats.endTime - stats.startTime) + 'ms\n'))
        if (callback) {
            callback();
        }
    })
    return true;
}

var spinner = ora('正在编译，请稍候...')

var build = function (items, cb) {
    async.eachSeries(items, function (item, callback) {
        buildItem(item, callback);
    }, function (err) {
        // spinner.stop();
        if (err) {
            console.log(chalk.red("  错误:" + err));
        } else {
            console.log(chalk.yellow(
                '  提示: 生成的文件只能在HTTP服务器上运行。\n' +
                '  直接打开 index.html 文件无效。\n'
            ))
        }
        // spinner.stop();
        if (cb) {
            cb(err);
        }
    })
}

async.waterfall([
    function (cb) {
        if (project_name) {
            var del = [
                path.join(config.build.assetsRoot, config.build.assetsSubDirectory, 'assets/projects/' + project_name),
                path.join(config.build.assetsRoot, config.build.assetsSubDirectory, project_name),
                path.join(config.build.assetsRoot, project_name),
            ];
            async.eachSeries(del, function (item, callback) {
                rm(item, err => {
                    callback(err);
                });
            }, function (err) {
                cb(err)
            });
        } else {
            rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
                cb(err);
            });
        }
    },
    function (data, cb) {
        if (project_name) {
            //  单项时
            projects = [project_name];
        }
        build(projects, cb);
    }
], function (err) {
    if (err) {
        console.log(chalk.red(err));
    }
});

// rm(path.join(config.build.assetsRoot, config.build.assetsSubDirectory), err => {
//     if (err) throw err
//     if (game) {
//         //  单项时
//         games = [game];
//     }
//     build(games);
// })
