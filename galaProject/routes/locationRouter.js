/// <reference path="../model/locationmodel.js" />
var express = require('express');
var router = express.Router();
var app = express();
var mongoose = require('mongoose');
var formidable = require('express-formidable');
app.use(formidable());
var locationModel = require('../model/locationModel.js');
var boardModel = require('../model/boardModel.js');
router.get('/location/search', locationFindCircle);  //맵 뷰 만들기

function locationFindCircle(req, res, next) {
    var long = req.query.long;
    var lat = req.query.lat;
    var radius = 3000;  //반경 3000m 보기(3km)
    var boardContent = null;
    boardContent = req.query.boardContent;

    if (boardContent) {
        locationModel.locationFindCircle_Content(long, lat, radius, boardContent, function (err, result) {
            if (err) {
                res.json({ msg: err });
            }
            else {
                res.json({ searchPoiInfo: { msg: 'find success', data: { "detail": result } } });
            }
        });
    }
    else {
        locationModel.locationFindCircle(long, lat, radius, function (err, result) {
            if (err) {
                res.json({ msg: err });
            }
            else {
                res.json({ searchPoiInfo: { msg: 'find success', data: { "detail": result } } });
            }
        });
    }
}

function locationAdd(req, res, next) {
    var locationNum = req.fields.locationNum;
    var locationName = req.fields.locationName;
    var locationRadius = req.fields.locationRadius;
    var locationSameLocation = req.fields.locationSameLocation;
    var locationSub = req.fields.locationSub;
    var localGrade = req.fields.localGrade;
    var type = req.fields.type;
    var longitude = req.fields.longitude;	//127
    var latitude = req.fields.latitude;	//37
    locationModel.locationAdd(locationNum, locationName, locationRadius, locationSameLocation, locationSub, localGrade, longitude, latitude, function (err, result) {
        if (err) {
            console.log('faiaaff');
            res.json({ err: err });
        }
        else {
            console.log('success');
            res.json({ result: result });
        }
    });
}

function locationNear(req, res, next) {
    var long = parseFloat(req.params.long);
    var lat = parseFloat(req.params.lat);
    var maxDistance = 1000;
    locationModel.locationNear1(long, lat, maxDistance, function (err, result) {
        if (err) {
            res.json({ msg: 'fail' });
        }
        else {
            res.json({ msg: 'location success', result: result });
        }
    });
}

function locationSearch(req, res, next) {
    var search = req.query.search;
    locationModel.locationSearch(search, function (err, result) {
        if (err) {
            res.json({ msg: 'search fail', err: err });
        }
        else {
            res.json({ msg: 'search success', data: result });
        }
    });
}

module.exports = router;