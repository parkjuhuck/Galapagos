var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var async = require('async');
var userModel = require('../model/userModel');
var locationModel = require('../model/locationModel');
var boardModel = require('../model/boardModel');
var commentModel = require('../model/commentModel');


router.get('/userInput', userInput);
router.get('/boardInput', boardInput);
router.get('/boardList', boardList);

function userInput(req, res, next) {
    res.render('userInput.pug');  
}

function boardInput(req, res, next) {
    userModel.find({}, function (err, result) {
        locationModel.aggregate({ $unwind: "$locationSub" } , function (err, locationSub) {
            if (err) {
                return;
            }
            else {
                console.log(locationSub);
                res.render('boardInput.pug', { results: result, locationSub: locationSub });
            }
            console.log(result);
        });
    });
    
}


function boardList(req, res, next) {
    var boardData = new Object();
    async.waterfall([
        function (callback) {
            locationModel.find({}, { locationNum: 1, locationName : 1 }, function (err, result) {
                if (err) {
                    console.log('errer');
                    callback(new Error('지역검색 실패'));
                }
                else {
                    callback(null, result);
                    console.log('locationModel.find() success'); 
                }
            });
        }, function (locationData, callback) {
            var location = new Object();
            async.mapSeries(locationData, function (location, next) {
                boardModel.find({ boardLocationNum: { $in: [location.locationNum] } }, function (err, result) {
                    if (err) {
                        callback(new Error('지역검색 실패'));
                    }
                    else {
                        console.log(location);
                        var locationName = location.locationName;                    
                        result.boardLocation = locationName;       
                        location = result;
                    }
                    next(null, location);
                });
            },
            function (err, results) {
                if (err) {
                    console.log('게시글 데이터 가져오기 실패');
                    callback(new Error('게시글 데이터 가져오기 실패'));
                }
                else {
                    console.log('모든 게시글 가져오기 성공입니다.!');
                    console.log('async.mapSeries Done : ', results);
                    callback(null, results);
                }
            }
           )
        }], function (err, results) {
            if (err) {
                res.json({ err: err.message });
            }
            else {
                locationModel.find({}, { locationNum: 1, locationName: 1 }, function (err, result) {
                    if (err) {
                        callback(new Error('마지막에서 pug전에서 error'))
                        }
                    else {
                        res.render('boardList.pug', { location : result, results: results});
                        }
                    });
            }
        });
}
module.exports = router;