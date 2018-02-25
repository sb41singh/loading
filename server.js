//

var express = require('express');
var app = express();
var path = require("path");
var bodyParser = require('body-parser');


app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.listen(5000, function () {
    console.log('Server is running');
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.post('/save', function (req, res) {
    var r = req.body;
    var o = getQueryObj({
        collection: 'loadingData',
        q: r
    });
    saveData(o);
});

var MongoClient = require('mongodb').MongoClient;
var inProgress = false;

// dal dependent parameters
global.dbConnectionPool = {};
global.defaultPoolSize = 10;

global.mongoUrl = 'mongodb://localhost:27017/';
global.dbName = 'rb_exp';

function getDBConnection(url, dbName, cb) {

    if (!inProgress) {
        //check if connection already present in app global conn pool
        var dbBase = global.dbConnectionPool[url + dbName];

        if (dbBase === undefined) {
            inProgress = true;
            if (url && dbName && cb) {
                MongoClient.connect(url + dbName, {
                        poolSize: global.defaultPoolSize
                    },
                    function (err, _db) {
                        if (err) {
                            cb(null);
                        } else {
                            console.log('DB connected successfully');
                            dbBase = _db;
                            global.dbConnectionPool[url + dbName] = _db;
                            cb(dbBase);
                        }
                        inProgress = false;
                    });

            } else {
                cb(false);
                inProgress = false;
            }
        } else {
            cb(dbBase);
        }
    } else {
        setTimeout(function () {
            getDBConnection(url, dbName, cb);
        }, 5000);
    }
}

function saveData(req, cb) {
    try {
        var o = req.options;
        if (o.params == undefined)
            o.params = {}

        getDBConnection(o.server, o.source, function (db) {

            db.collection(o.type).save(o.query, {
                w: 1
            }, function (err, r) {
                if (err)
                    throw err;
                else if (cb)
                    cb(true);
            });
        });

    } catch (err) {
        console.log(err);
        if (cb)
            cb(false);
    }
}

function getQueryObj(req) {
    return {
        options: {
            server: req.mongoUrl || global.mongoUrl,
            source: req.db || global.dbName,
            type: req.collection,
            query: req.q || {},
            params: req.p || {},
            sort: req.s || {}
        }
    }
}