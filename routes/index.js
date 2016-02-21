var express = require('express');
var router = express.Router();
var redis = require('redis');
var Promise = require('bluebird');
client = redis.createClient();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index');
});
/* GET home data */
router.get('/topic', function(req, res, next) {
    getTopicMaxID().then(function(maxid) {
        var promises = [];
        for (var i = 1; i <= maxid; i++) {
            promises.push(getTopicInfo(i));
        }
        Promise.all(promises).then(function (data) {
            res.json(data);
        });
    });
});
function getTopicMaxID() {
    return new Promise(function(resolve) {
        client.get("topic:nextid", function(err, reply) {
            resolve(reply);
        });
    });
}
function getTopicInfo(topicid) {
    var topicinfo = {}
    return (new Promise(function(resolve) {
        client.get("topic:" + topicid + ":name", function(err, reply) {
            topicinfo.topic = reply;
            resolve();
        });
    })).then(function() {
        return new Promise(function(resolve) {
            client.zcard('topic:' + topicid + ':joblist', function(err, reply) {
                topicinfo.total = reply;
                resolve();
            });
        });
    }).then(function() {
        return new Promise(function(resolve) {
            client.zrevrange('topic:' + topicid + ':joblist', 0, 4, function(err, jobids) {
                topicinfo.jobids = jobids;
                resolve();
            });
        });
    }).then(function() {
        var promises = [];
        for (var i = 0; i < topicinfo.jobids.length; i++) {
            promises.push(getJobInfo(topicinfo.jobids[i]));
        }
        return Promise.all(promises);
    }).then(function(jobinfos) {
        delete topicinfo.jobids;
        topicinfo.jobs = jobinfos;
        return new Promise(function(resolve) {
            resolve(topicinfo);
        })
    });
}
function getJobInfo(jobid) {
    var p = new Promise(function(resolve) {
        client.mget(["job:" + jobid + ":title", "job:" + jobid + ":url", "job:" + jobid + ":source"], function(err, reply) {
            resolve({"title": reply[0], "url": reply[1], "source": reply[2]});
        });
    });
    return p;
}

module.exports = router;
