var mongoose = require('mongoose');
var async = require('async');
var boardModel = require('../model/boardModel');
var distance = function (currentLong, currentLat, spotLong, spotLat) {
    var distance = 0;
    var x = (currentLong - spotLong) * 100000.0 * 1.110;
    var y = (currentLat - spotLat) * 100000.0 * 0.884;
    distance = Math.sqrt(((x * x) + (y * y)));

    return distance;
}

mongoose.Promise = global.Promise;
var locationSchema = new mongoose.Schema({
    locationNum: { type: Number },
    locationName: { type: String },
    locationRadius: { type: Number },
    locationSameLocation: [{ type: Number }],
    locationSub: [{ type: String }],
    locationGrade: { type: Number },
    geometry: {
        'type': { type: String, 'default': 'Point' },
        coordinates: [{ type: Number, 'dafault': 0 }]
    }
});

locationSchema.index({ geometry: '2dsphere' });
var locationModel = mongoose.model('locations', locationSchema);

locationModel.locationFindCircle = function (long, lat, radius, callback) {
    boardModel.find({}, { 'geometry': 0, '_id': 0 }).where('geometry').within(
			{
			    center: [parseFloat(long), parseFloat(lat)],
			    radius: parseFloat(radius / 6371000),
			    unique: true, spherical: true
			}).then(function fullfiled(result) {
			    callback(null, result);
			}, function rejected(err) {
			    err.code = 500;
			    callback(err, null);
			});
}

locationModel.locationFindCircle_Content = function (long, lat, radius, boardContent, callback) {
    boardModel.find({ 'boardContent': { "$regex": boardContent, "$options": "i" } }, { 'geometry': 0, '_id': 0 }).where('geometry').within(
			{
			    center: [parseFloat(long), parseFloat(lat)],
			    radius: parseFloat(radius / 6371000),
			    unique: true, spherical: true
			}).then(function fullfiled(result) {
			    callback(null, result);
			}, function rejected(err) {
			    err.code = 500;
			    callback(err, null);
			});
}

locationModel.locationAdd = function (locationNum, locationName, locationRadius, locationSameLocation, locationSub, localGrade, longitude, latitude, callback) {
    var location = {
        locationNum: locationNum,
        locationName: locationName,
        locationRadius: locationRadius,
        locationSameLocation: locationSameLocation,
        locationSub: locationSub,
        localGrade: localGrade,
        geometry: {
            coordinates: [longitude, latitude]
        }

    }
    locationModel.create(location, function (err, result) {
        if (err) {
            err.code = 500;
            callback(err, null);
        }
        else {
            callback(null, result);
        }

    });

}

//현재 기반 지역찾기
locationModel.searchNearLocation = function (long, lat, maxDistacne, callback) {
    console.log('locationModel.searchNearLocation');
    maxDistacne = 10000; //maxdistance의 단위는 미터(m)
    locationModel.find({}, { locationName: 1, locationNum: 1, locationSameLocation: 1, locationRadius: 1, geometry: 1 }).where('geometry').near(
                {
                    center: {
                        type: 'Point',
                        coordinates: [parseFloat(long), parseFloat(lat)]
                    },
                    maxDistance: maxDistacne
                }).limit(2).then(function fullfiled(result) {
                    console.log('locationModel.find - fullfilled');
                    // Todo : result 값이 0 나오면 처리하자
                    var checkDistance = distance(long, lat, result[0].geometry.coordinates[0], result[0].geometry.coordinates[1]);
                    if (checkDistance < result[0].locationRadius) {
                        console.log('checkDistance < result[0].locationRadius(현재위치가 그 지역안에 있을때) -- true')
                        callback(null, [result[0].locationNum, result[0].locationName, result[0].locationSameLocation]);
                    }
                    else {
                        console.log('checkDistance < result[0].locationRadius(현재위치가 그 지역 밖에 있을때) -- false')
                        console.log('result[0].geometry.coordinates : ', result[0].geometry.coordinates);
                        callback(null, [result[1].locationNum, result[1].locationName, result[1].locationSameLocation]);
                    }

                }, function rejected(err) {
                    err.code = 500;
                    callback(err, null);
                });


}

//이거 지역 찾기 테스트용위에 함수
locationModel.locationNear1 = function (long, lat, maxDistance, callback) {
    async.waterfall([
        function (callback) {
            maxDistacne = 10000; //maxdistance의 단위는 미터(m)
            locationModel.find({}, { locationName: 1, locationNum: 1, locationSameLocation: 1, locationRadius: 1, geometry: 1 }).where('geometry').near(
                        {
                            center: {
                                type: 'Point',
                                coordinates: [parseFloat(long), parseFloat(lat)]
                            },
                            maxDistance: maxDistacne
                        }).limit(2).then(function fullfiled(result) {
                            var checkDistance = distance(long, lat, result[0].geometry.coordinates[0], result[0].geometry.coordinates[1]);
                            if (checkDistance < result[0].locationRadius) { callback(null, result[0].locationNum, result[0].locationName, result[0].locationSameLocation); }
                            else { callback(null, result[1].locationNum, result[1].locationName, result[1].locationSameLocation); }

                        }, function rejected(err) {
                            err.code = 500;
                            callback(err, null);
                        });
        }, function (locationNum, locationName, locationSameLocation, callback) {
            boardModel.showBoardList_location(locationNum, locationName, locationSameLocation, function (err, result) {

                if (err) {
                    callback(err, '지역검색실패');
                }
                else {
                    callback(null, result);
                }
            })

        }], function (err, result) {
            if (err) {
                callback(err, err.message);
            }
            else {
                callback(null, result);
            }
        }
)

}
locationModel.locationSearch = function (search, callback) {
    locationModel.aggregate({ $unwind: "$locationSub" }, { $match: { 'locationSub': { "$regex": search, "$options": "i" } } }, function (err, result) {
        if (err) {
            callback(err, null);
        }
        else {
            callback(null, result);
        }
    });
}

locationModel.locationContent = function (location, search, callback) {
    locationModel.find({})
}

module.exports = locationModel;
