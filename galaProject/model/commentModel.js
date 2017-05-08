var mongoose = require('mongoose');
var express = require('express');
var moment = require('moment');
var FCM = require('fcm-push');
var database = require('../database/databaseConfig.js');
var boardModel = require('./boardModel.js');
var userModel = require('./userModel.js');
var async = require('async');
console.log(moment().startOf('hour').fromNow());       // 9분 전
const apiKey = 'AIzaSyCV7f2UFdhrasvTBoQaNOz9XoLAlr6qMPw';

var commentSchema = new mongoose.Schema({
    commentBoardId: { type: mongoose.Schema.Types.ObjectId },
   commentUserId : {type : String},
   commentUserNicName: { type: String },
   commentContent: {type : String},
   commentDate: { type: String },
   commentUserPicture: {type:String}
});
var commentModel = mongoose.model('comments', commentSchema);

commentModel.commentAdd = function (commentBoardId, userId, commentUserPicture, commentUserId, commentBoardTag, commentUserNicName, commentContent, commentDate, callback) {
    var userId = userId;
    var commentdata = {
        commentBoardId: commentBoardId,
        commentUserId: commentUserId,
        commentUserPicture : commentUserPicture,
        commentUserNicName: commentUserNicName,
        commentContent: commentContent,
        commentDate: commentDate
    };
    async.series([

    function (callback) {

        commentModel.create(commentdata, function (err, result) {

            if (err) {
                callback(new Error('댓글 등록 실패'));
            }
            else {
                callback(null, result);
            }
        });
    }, function (callback) {
        var boardModel = require('./boardModel.js');
        
        boardModel.update({ _id : commentBoardId }, { $inc: { boardCommentCount: 1 } }, function (err, result) {
            if (err) {

                callback(new Error('댓글갯수 증가 실패'));
            }
            else {
                callback(null);
            }
        });
    }, function (callback) {//댓글 등록 완료 후 푸쉬알람하기
        var userModel = require('./userModel.js');
        userModel.find({ userId: userId }, { userPush: 1, userToken: 1 }, function (err, result) {
            if (err) {
            	
                callback(new Error('작성자가 회원 탈퇴한 글 입니다.'))
            }	
            
            if (result[0].userPush == true) {
                console.log(result[0]);
                var userToken = result[0].userToken;
                var title = '댓글 등록 되었습니다.';
                var text = commentUserNicName + '님이 \''+ commentBoardTag+'\'글에 댓글을 등록했습니다.';
                console.log(text);
                var  message = {
                        to : userToken, // required fill with device token or topics
                        notification: {
                            title: title,
                            body: text
                        },
                        data: {
                            boardId: commentBoardId
                        },
                        "delay_while_idle": true,
                        "time_to_live": 86400

                        
                    };
                    var fcm = new FCM(apiKey);
                    fcm.send(message, function (err, response) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Push기능 사용!!!!");
                            callback(null, "Push기능 사용");
                        }
                    });
               
            }
            else{
                console.log("Push기능 미사용!!!!");
                callback(null, "Push기능 미사용");
                 }
       });
        
    },
], function (err, result) {
        if (err) {
            callback(err, err);
        }
        else {
            callback(null, result[0]);
        }
    });
}

commentModel.commentDelete = function (commentBoardId, commentId, callback) {
    var commentBoardId = commentBoardId;
    async.series([
        function (callback) {
        commentModel.remove({ commentBoardId: commentBoardId, _id: commentId }, function (err, result) {
            if (err) {
                err.code = 500;
                callback(err, null);
            }
            else {
                console.log('댓글 삭제 성공 ');
                callback(null, result);
            }
        })
        }, function (callback) {
            var boardModel = require('./boardModel.js');
            boardModel.update({ _id : commentBoardId }, { $inc: { boardCommentCount: -1 } }, function (err, result) {
                if (err) {
                    callback(new Error('댓글갯수 감소 실패'));
                }
                else {
                    callback(null);
                }
            });
        }
    ], function (err, result) {
        if (err) {
            callback(err, err);
        }
        else {
            callback(null, result[0]);
        }
    });
}

commentModel.commentShow = function (commentBoardId, callback) {
	console.log(commentBoardId);
	   commentModel.find({commentBoardId:commentBoardId},{_id:0},function(err, result){
	        if(err) {
	            err.code = 500;
	            callback(err, null);
	         }
	        else{
	           console.log('Comment list: ');
	            callback(null, result);
	       
	        }
	        });
	}
module.exports = commentModel;
