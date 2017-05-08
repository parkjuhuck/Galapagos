var mongoose = require('mongoose');
var express = require('express');
const fs = require('fs');
const pathUtil = require('path');
const easyimg = require('easyimage');
const async = require('async');
const randomstring = require('randomstring');
const AWS = require('aws-sdk');
var locationModel = require('../model/locationModel.js');  //locationModel-
var userModel = require('../model/userModel.js')
var Schema = mongoose.Schema;
var ObjectId = require('mongodb').ObjectID;

AWS.config.region = 'us-west-2';
AWS.config.accessKeyId = 'AKIAIZM2JUQWA4BLVKUQ';
AWS.config.secretAccessKey = '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';
var s3 = new AWS.S3();
var bucketName = 'galra';
var BoardSchema = mongoose.Schema({
    boardUserId: String,
    boardUserName: String, 
    boardUserNicName: String, 
    boardUserPicture: String, 
    boardContentPicture1: String, 
    boardCategory: Number,
    boardLocationNum: {type:[Number], 'default':[]},
    boardLocationName: { type: [String], 'default': [] },
    boardContent: String,
    boardLike: { type: [String], 'default': [] }, 
    boardLikeCount: { type: Number, 'default': 0 },
    boardTag: String,
    boardIsAnomynity: { type: String, 'default': 'false' },
    boardDate: String,
    boardRevision: { type: [String], 'default': [] },
    boardRevisionCount: { type: Number, 'default': 0 },
    boardStar: { type: [String], 'default': [] },
    boardCommentCount: { type: Number, 'default': 0 },
    boardLong: { type: Number, 'default': 0 },
    boardLat: { type: Number, 'default': 0 },
    boarditemKey : String,
    geometry: {
        'type': { type: String, 'default': 'Point' },
        coordinates: { type: [Number], 'default': [] },
    }
});

BoardSchema.index({ geometry: '2dshere' });
var BoardModel = mongoose.model('boards', BoardSchema);
var distance = function (currentLong, currentLat, spotLong, spotLat) {
    var distance = 0;
    var x = (currentLong - spotLong) * 100000.0 * 1.110;
    var y = (currentLat - spotLat) * 100000.0 * 0.884;
    distance = Math.sqrt(((x * x) + (y * y)));
    return distance;
}

BoardModel.locationFindCircle_Content = function (long, lat, radius, boardContent, callback) {
    BoardModel.find({ 'boardContent': { "$regex": boardContent, "$options": "i" } }, { 'geometry': 0 }).where('geometry').within(
       {
           center: [parseFloat(long), parseFloat(lat)],
           radius: parseFloat(radius / 6371000),
           unique: true, spherical: true
       }).then(function fullfiled(result) {
           callback(null, result);
       }, function rejected(err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
       });
}

BoardModel.locationFindCircle = function (long, lat, radius, callback) {
    BoardModel.find({}, { 'geometry': 0 }).where('geometry').within(
         {
             center: [parseFloat(long), parseFloat(lat)],
             radius: parseFloat(radius / 6371000),
             unique: true, spherical: true
         }).then(function fullfiled(result) {
             callback(null, result);
         }, function rejected(err) {
     	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
         });
}

BoardModel.showBoardList = function (userId,page, count, long, lat, maxDistance, callback) {
    var pageCount = (page - 1) * count;
    async.waterfall(
	[
       function (callback) {
           locationModel.find({}, { locationName: 1, locationNum: 1, locationSameLocation: 1, locationRadius: 1, geometry: 1 }).where('geometry').near(
                {
                    center: {
                        type: 'Point',
                        coordinates: [parseFloat(long), parseFloat(lat)]
                    },
                    maxDistance: maxDistance
                }).limit(2).then(function fullfiled(result) {
                    if (result.length == 0) {
                        callback(new Error('에러발생'));
                    }
                    var checkDistance = distance(long, lat, result[0].geometry.coordinates[0], result[0].geometry.coordinates[1]);
                    if (checkDistance < result[0].locationRadius) { callback(null, result[0].locationNum, result[0].locationName, result[0].locationSameLocation); }
                    else { callback(null, result[1].locationNum, result[1].locationName, result[1].locationSameLocation); }
                }, function rejected(err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                })
       },
       function (locationNum, locationName, locationSameLocation, callback) {
           BoardModel.showBoardList_location(userId,locationNum, locationName, locationSameLocation, pageCount, count, function (err, result) {  
               if (err) {
					err.code = 500;
					console.log(err);
					callback(new Error('에러발생'));
               }else {
            	   console.log('result :',result);
                   callback(null, result);
               }
           })
       }
   ],function (err, result){
       if (err) {
       	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
       }
       else {
           console.log('waterfall 성공!');
           callback(null, result);
       }
   });
}

BoardModel.showBoardList_location = function (userId,locationNum, locationName, locationSameLocation, pageCount, count, callback) {
	console.log("count :",count);
	console.log("locationNum :",locationNum);
	BoardModel.aggregate(
		[
		   { $project : {
		        boardContent:1,
		        boardLike:1,
		        boardUserId :  1, 
		        boardUserName : 1, 
		        boardUserNicName : 1, 
		        boardUserPicture : 1, 
		        boardContentPicture1 : 1, 
		        boardCategory : 1, 
		        boardLocationNum : 1,
		        boardLocationName : 1,
		        boardContent : 1, 
		        boardLikeCount : 1,
		        boardTag : 1, 
		        boardIsAnomynity : 1, 
		        boardDate : 1, 
		        boardRevision : 1, 
		        boardRevisionCount : 1,
		        boardCommentCount : 1, 
		        boardLong : 1,
		        boardLat : 1,
		        boarditemKey : 1,
		        boardIsLike : { $in: [userId, "$boardLike"] },
		        boardIsRevision : { $in: [userId, "$boardRevision"] },
		        boardIsStar : { $in: [userId, "$boardStar"] },
		      }
		   },
			  { $match :{ boardLocationNum : { $in:[locationNum] }}},
		   	  { $skip : pageCount },
		   	  { $limit: count },
		   	  { $sort: { boardDate: -1 }}
		]).then(function fulfilled(result){
		    if (result.length == 0) {
		        callback(new Error('No data'))
		    }
	    	callback(null, result);
		},function rejected(err){
	    	    err.code = 500;
				console.log(err);
				callback(new Error('에러발생')); 
		});  
}
//주혁5 칸텐츠로 검색하기
BoardModel.locationNear = function(long,lat,maxDistance,boardContent,page,count,userId,callback){
	var maxDistance = 10000; 
	var locationModel = require('./locationModel.js');
    locationModel.find({}, { locationName: 1, locationNum: 1, locationSameLocation: 1, locationRadius: 1, geometry: 1 }).where('geometry').near(
    		{
                center: {
                    type: 'Point',
                    coordinates: [parseFloat(long), parseFloat(lat)],
                },
                maxDistance: maxDistance  
            }).limit(2).then(function fullfiled(result) {
            	console.log("지역명 결과: ",result);
                var checkDistance = distance(long, lat, result[0].geometry.coordinates[0], result[0].geometry.coordinates[1]);
                if (checkDistance < result[0].locationRadius){ 
                	console.log(result[0].locationNum)
                	BoardModel.boardContentSearch(long,lat,boardContent,page,count,userId,result[0].locationNum,function(err,result){
                		if(err){
                    	    err.code = 500;
                			console.log(err);
                			callback(new Error('에러발생'));
                		}else{
                			callback(null,result);
                		}
                	})
            	}else{ 
            		console.log('성공2');
                	console.log(result[1].locationNum)
                	BoardModel.boardContentSearch(long,lat,boardContent,page,count,userId,result[1].locationNum,function(err,result){
                		if(err){
                    	    err.code = 500;
                			console.log(err);
                			callback(new Error('에러발생'));
                		}else{
                			callback(null,result);
                		}
                	})
            		//callback(null, result[1].locationNum, result[1].locationName, result[1].locationSameLocation); 
        		}
            },function rejected(err) {
            	console.log(result);
            	console.log('실패?');
                err.code = 500;
                callback(err, null);
            });
}

BoardModel.boardContentSearch = function (long,lat,boardContent,page,count,userId,boardLocationNum,callback) {
	var pageCount = (page - 1) * count;
	var count = count
	BoardModel.aggregate([
		   { $project : {
		        boardContent:1,
		        boardLike:1,
		        boardUserId :  1, 
		        boardUserName : 1, 
		        boardUserNicName : 1, 
		        boardUserPicture : 1, 
		        boardContentPicture1 : 1, 
		        boardCategory : 1, 
		        boardLocationNum : 1,
		        boardLocationName : 1,
		        boardContent : 1, 
		        boardLikeCount : 1,
		        boardTag : 1, 
		        boardisAnomynity : 1, 
		        boardDate : 1, 
		        boardRevision : 1, 
		        boardRevisionCount : 1,
		        boardCommentCount : 1, 
		        boardLong : 1,
		        boardLat : 1,
		        boarditemKey : 1,
		        boardIsLike : { $in: [userId, "$boardLike"] },
		        boardIsRevision : { $in: [userId, "$boardRevision"] },
		        boardIsStar : { $in: [userId, "$boardStar"] },
		      }
		   },
		  { $match :{ boardLocationNum : {$in: [boardLocationNum] }}},
		  { $skip : pageCount },
		  { $limit: count  },
		  { $sort: { boardDate: -1 }},
		  { $match : { boardContent : { $regex: boardContent, $options: "i"}}} 
		  ]).then(function fulfilled(result){
		    if (result.length == 0) {
		        console.log("데이터 0");
		    }
		    	callback(null,result);
			},function rejected(err){
	    	    err.code = 500;
				console.log(err);
				callback(new Error('에러발생'));
			});  
}

//사진있을때 데이터 Insert 
BoardModel.saveBoardData1 = function (board, fileInfo, callback) {
    async.waterfall(
			[
				function (callback) {
				    var randomStr = randomstring.generate(10);
				    var newFileName = 'image_' + randomStr; //
				    var extname = pathUtil.extname(fileInfo.name);
				    var contentType = fileInfo.type;  //
				    var readStream = fs.createReadStream(fileInfo.path);
				    var itemKey = 'BoardImg/' + newFileName + extname;
				    var params = {
				        Bucket: bucketName,
				        Key: itemKey,
				        ACL: 'public-read',
				        Body: readStream,
				        ContentType: contentType
				    }
				    s3.putObject(params, function (err, data) {
				        if (err) {
				            console.error('s3 PutObject Error', err);
				            callback(err);
				        }
				        else {
				            var imageUrl = s3.endpoint.href + bucketName + '/' + itemKey;
				            var imageSigenedURL = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: itemKey });
				            callback(null, imageUrl,itemKey); //부분1
				            
				        }
				    });
				},
				function (imageUrl,itemKey,callback) {
					board.boarditemKey = itemKey ; //부분2
				    board.boardContentPicture1 = imageUrl;
				    board.save(function (err, result) {
				        if (err) {
				            callback(new Error(err))
				            console.log("Same went wrong while saving the thing");
				        }
				        else {
				            callback(null, result);
				        }
				    });
				    fs.unlink(fileInfo.path, function (err) {
				        if (err) console.log(err);
				        console.log('successfully');
				    });
				},
			],
			function (err, result) {
			    if (err) {
		    	    err.code = 500;
					console.log(err);
					callback(new Error('에러발생'));
			    }
			    else {
			        callback(null, result);
			    }
			});
}

// 사진없을때 insert
BoardModel.saveBoardData2 = function (board, callback) {
    async.waterfall(
          [
             function (callback) {
                 board.save(function (err, result) {
                     if (err) {
                 	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                     }
                     else {
                         callback(null, result);
                     }
                 });
             },
          ],
          function (err, result) {
              if (err) {
          	    err.code = 500;
    			console.log(err);
    			callback(new Error('에러발생'));
              }
              else {

                  callback(null, result);
              }
          });
}
//게시글 삭제
BoardModel.deleteBoard = function (board, callback) {
    BoardModel.remove({ _id: board.boardId }).then(function fulfilled(result) {
        callback(null, result);
    }, function rejected(err) {
	    err.code = 500;
		console.log(err);
		callback(new Error('에러발생'));
    });
}
// 공감 기능
BoardModel.likeSave = function (board, callback) {
    BoardModel.update({ _id: board.boardId }, { $push: { boardLike: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
            BoardModel.find({ _id: board.boardId }, function (err, result1) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }
                if (result1) {
                    var length = result1[0].boardLike.length;
                } else {
                    console.log('게시글이 존재하지 않습니다.')
                }
                BoardModel.update({ _id: board.boardId }, { $set: { boardLikeCount: length } }, function (err, result) {
                    if (err) {
                	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                    }
                    if (result) {
                        callback(null, result);
                        console.log('Like Success');
                    }
                });
            });
        }
    });
}

//비공감 기능
BoardModel.revisionSave = function (board, callback) {
    BoardModel.update({ _id: board.boardId }, { $push: { boardRevision: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
            BoardModel.find({ _id : board.boardId }, function (err, result) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }
                if (result) {
                    var length = result[0].boardRevision.length;
                }else{
                    console.log('정정요청 취소 에러')
                }

                BoardModel.update({ _id: board.boardId },{ $set: { boardRevisionCount: length } }, function (err, result) {
                    if (err) {
                	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                    }
                    if (result) {
                        callback(null, result);
                        console.log('Hate Success');
                    }
                });
            });
        }
    });
}
// 게시글 전문보기
BoardModel.showBoardDetail = function (board,userId,callback) {
    async.series(
          [
             function (callback) {
            	 console.log(board.boardId)
            		BoardModel.aggregate(
            			{$match :{_id :ObjectId(board.boardId) }},
            		    { $project : {
            		        boardContent:1,
            		        boardLike:1,
            		        boardUserId :  1, 
            		        boardUserName : 1, 
            		        boardUserNicName : 1, 
            		        boardUserPicture : 1, 
            		        boardContentPicture1 : 1, 
            		        boardCategory : 1, 
            		        boardLocationNum : 1,
            		        boardLocationName : 1,
            		        boardContent : 1, 
            		        boardLikeCount : 1,
            		        boardTag : 1, 
            		        boardIsAnomynity : 1, 
            		        boardDate : 1, 
            		        boardRevision : 1, 
            		        boardRevisionCount : 1,
            		        boardCommentCount : 1, 
            		        boardLong : 1,
            		        boardLat : 1,
            		        boarditemKey : 1,
            		        boardIsLike : { $in: [userId, "$boardLike"] },
            		        boardIsRevision : { $in: [userId, "$boardRevision"] },
            		        boardIsStar : { $in: [userId, "$boardStar"] }
            		      }
            		    }
            		).then(function fulfilled(result) {
            	        callback(null, result[0]);
            	    }, function rejected(err) {
                	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
            	    });
            },
             function (callback) {
                 const commentModel = require('./commentModel');
                 commentModel.find({ commentBoardId: board.boardId }).exec(function (err, result) {
                     if (err) {
                 	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                     }
                     callback(null, { comment: result });
                 })
             }
          ],
          function (err, result) {
              if (err) {
          	    err.code = 500;
    			console.log(err);
    			callback(new Error('에러발생'));
              }
              else {
                  callback(null, result);
              }
          });
}

//즐겨찾기 보기 //async map 있음 지우지 말것.
BoardModel.showUserCheck_BoardList = function (userId,result, callback) {
	const boardIds = result[0].userCheck;
	console.log('boardIds :',boardIds);
	console.log('boardIds.length :',boardIds.length);
	var boardId = [] 
	
	for(var i = 0; i < boardIds.length; i++){
		boardId.push(ObjectId(result[0].userCheck[i]));
	}
	console.log('boardId :',boardId);
	BoardModel.aggregate([
		{$match :{_id : {$in:boardId } } },
	    { $project : {
	        boardContent:1,
	        boardLike:1,
	        boardUserId :  1, 
	        boardUserName : 1, 
	        boardUserNicName : 1, 
	        boardUserPicture : 1, 
	        boardContentPicture1 : 1, 
	        boardCategory : 1, 
	        boardLocationNum : 1,
	        boardLocationName : 1,
	        boardContent : 1, 
	        boardLikeCount : 1,
	        boardTag : 1, 
	        boardIsAnomynity : 1, 
	        boardDate : 1, 
	        boardRevision : 1, 
	        boardRevisionCount : 1,
	        boardCommentCount : 1, 
	        boardLong : 1,
	        boardLat : 1,
	        boarditemKey : 1,
	        boardIsLike : { $in: [userId, "$boardLike"] },
	        boardIsRevision : { $in: [userId, "$boardRevision"] },
	        boardIsStar : { $in: [userId, "$boardStar"] }
	      }
	    },
	    { $sort: { boardDate: -1 }},
	]).then(function fulfilled(result) {
        callback(null, result);
    }, function rejected(err) {
	    err.code = 500;
		console.log(err);
		callback(new Error('에러발생'));
    });
}
//본인이 작성한글보기
BoardModel.userBoardList = function (userId,callback) {
	BoardModel.aggregate([
		   { $project : {
		        boardContent:1,
		        boardLike:1,
		        boardUserId :  1, 
		        boardUserName : 1, 
		        boardUserNicName : 1, 
		        boardUserPicture : 1, 
		        boardContentPicture1 : 1, 
		        boardCategory : 1, 
		        boardLocationNum : 1,
		        boardLocationName : 1,
		        boardContent : 1, 
		        boardLikeCount : 1,
		        boardTag : 1, 
		        boardIsAnomynity : 1, 
		        boardDate : 1, 
		        boardRevision : 1, 
		        boardRevisionCount : 1,
		        boardCommentCount : 1, 
		        boardLong : 1,
		        boardLat : 1,
		        boarditemKey : 1,
		        boardIsLike : { $in: [userId, "$boardLike"] },
		        boardIsRevision : { $in: [userId, "$boardRevision"] },
		        boardIsStar : { $in: [userId, "$boardStar"] }
		      } 
		   },
		    { $sort: { boardDate: -1 }},
		    { $match : { boardUserId : userId }}
		]).then(function fulfilled(result){
			console.log(result.length);
		    if (result.length == 0) {
		        callback(new Error('No data'))
		    }
		    callback(null, result);
		},function rejected(err){
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생')); 
		});
}

BoardModel.likeCancelSave = function (board, callback) {
    BoardModel.update({ _id: board.boardId }, { $pull: { boardLike: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
            BoardModel.find({ _id: board.boardId }, function (err, result1) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }
                if (result1) {
                    var length = result1[0].boardLike.length;
                }else {
                    console.log('데에터 존재하지 않습니다.')
                }
                BoardModel.update({ _id: board.boardId }, { $set: { boardLikeCount: length } }, function (err, result) {
                    if (err) {
                	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                    }
                    if (result) {
                        callback(null, result);
                        console.log('LikeCancel Success');
                    }
                });
            });
        }
    });
}

BoardModel.revisionCancelSave = function (board, callback) {
    BoardModel.update({ _id: board.boardId }, { $pull: { boardRevision: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
            BoardModel.find({ _id: board.boardId }, function (err, result) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }
                if (result) {
                    var length = result[0].boardRevision.length;
                } else {
                    console.log('정정요청 에러');
                }
                BoardModel.update({ _id: board.boardId }, { $set: { boardRevisionCount: length } }, function (err, result) {
                    if (err) {
                	    err.code = 500;
            			console.log(err);
            			callback(new Error('에러발생'));
                    }
                    if (result) {
                        callback(null, result);
                        console.log('HateCancel Success');
                    }
                });
            });
        }
    });
}
// 즐겨찾기 추가 
BoardModel.starSave = function (board, callback){
    BoardModel.update({ _id: board.boardId }, { $push: { boardStar: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
        	var userModel = require('./userModel.js');  //locationModel-
            userModel.update({ userId: board.userId }, { $push: { userCheck: board.boardId } }, function (err, result1) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }else{
                	console.log(board.boardId)
                	console.log("result 결과값 :",result1);
                    callback(null, result1);
                    console.log('즐겨찾기 입력완료');
                }
            });	
        }
    });
    
}
//즐겨찾기 취소
BoardModel.starCancelSave = function (board, callback) {
    BoardModel.update({ _id: board.boardId }, { $pull: { boardStar: board.userId } }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
        	var userModel = require('./userModel.js');  //locationModel-
            userModel.update({ userId: board.userId }, { $pull: { userCheck: board.boardId } }, function (err, result1) {
                if (err) {
            	    err.code = 500;
        			console.log(err);
        			callback(new Error('에러발생'));
                }else{
                	console.log(board.boardId)
                	console.log("result 결과값 :",result1);
                    callback(null, result1);
                    console.log('즐겨찾기 삭제완료');
                }
            });	
        }
    });
}
//게시판 수정 (사진있을 때)
BoardModel.editBoard = function (board, fileInfo, callback) {
    async.waterfall(
			[
				function (callback) {
				    var randomStr = randomstring.generate(10);
				    var newFileName = 'image_' + randomStr; //
				    var extname = pathUtil.extname(fileInfo.name);
				    var contentType = fileInfo.type;  //
				    var readStream = fs.createReadStream(fileInfo.path);
				    var params = {
				        Bucket: bucketName,
				        Key: board.boarditemKey,
				        ACL: 'public-read',
				        Body: readStream,
				        ContentType: contentType
				    }
				    console.log('BoardModel.editBoard :', params);
				    s3.putObject(params, function (err, data) {
				        if (err) {
				            console.error('s3 PutObject Error', err);
				            callback(err);
				        }
				        else {
				            var imageUrl = s3.endpoint.href + bucketName + '/' + board.boarditemKey;
				            var imageSigenedURL = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: board.boarditemKey });
				            callback(null, imageUrl,board.boarditemKey); //부분1   
				        }
				    });
				},
				function (imageUrl,boarditemKey,callback){
				    BoardModel.findOneAndUpdate({ _id : board.boardId },
			    		{ $set: { 	boardContentPicture1: imageUrl,
			    					boardUserPicture :  board.boardUserPicture,
			    			    	boardUserNicName : board.boardUserNicName,
							    	boardCategory:  board.boardCategory,
							    	boardContent: board.boardContent,
							    	boardTag : board.boardTag,
							    	boardIsAnomynity : board.boardIsAnomynity
			    		} }
			    		,function (err, result) {
				        if (err) {
				        	console.log("board._id :",board._id);
				            callback(err,null)
				            console.log("Same went wrong while saving the thing");
				        }
				        else {
				        	console.log('result 결과값 :',result);
		                    fs.unlink(fileInfo.path, function (err) {
		                        if (err){ 
		                        	console.log('임시 파일 삭제 실패 :',err);
			                        callback(err,null);
		                        }
		                        else{
		                        	callback(null, result);
		                        }
		                    });
						    
				        }
				    });

				},
			],
			function (err, result) {
			    if (err) {
			    	console.log('err :',err);
			        callback(err, null);
			    }
			    else {
			        callback(null, result);
			    }
			});
}

//피드화면 GPS X 일때
BoardModel.showBoardListNotGPS = function (userId,page, count, callback) {
	var pageCount = (page - 1) * count;
	var count = count
	BoardModel.aggregate([
		   { $project : {
		        boardContent:1,
		        boardLike:1,
		        boardUserId :  1, 
		        boardUserName : 1, 
		        boardUserNicName : 1, 
		        boardUserPicture : 1, 
		        boardContentPicture1 : 1, 
		        boardCategory : 1, 
		        boardLocationNum : 1,
		        boardLocationName : 1,
		        boardContent : 1, 
		        boardLikeCount : 1,
		        boardTag : 1, 
		        boardIsAnomynity : 1, 
		        boardDate : 1, 
		        boardRevision : 1, 
		        boardRevisionCount : 1,
		        boardCommentCount : 1, 
		        boardLong : 1,
		        boardLat : 1,
		        boarditemKey : 1,
		        boardIsLike : { $in: [userId, "$boardLike"] },
		        boardIsRevision : { $in: [userId, "$boardRevision"] },
		        boardIsStar : { $in: [userId, "$boardStar"] },
		      }
		   },
	   	  { $skip : pageCount },
	   	  { $limit: count  },
	   	  { $sort: { boardDate: -1 }}
	   	  ]).then(function fulfilled(result){
		    if (result.length == 0) {
		        callback(new Error('No data'))
		    }
		    	console.log()
		    	callback(null, result);
			},function rejected(err){
	    	    err.code = 500;
				console.log(err);
				callback(new Error('에러발생'));
			});  
}

//카테고리로 검새하기 (기능 삭제 예정중)
BoardModel.boardCategorySearch = function (boardLocationNum, boardCategory, callback) {
    BoardModel.find({ boardLocationNum: boardLocationNum, boardCategory: boardCategory }, { 'geometry': 0, '_id': 0 }, function (err, result) {
        if (err) {
    	    err.code = 500;
			console.log(err);
			callback(new Error('에러발생'));
        }
        else {
            callback(null, result);
        }
    });
}

module.exports = BoardModel;