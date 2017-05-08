var express = require('express');
var router = express.Router();
var app = express();
var mongoose = require('mongoose');
var commentModel = require('../model/commentModel.js');
var format = require('format-date');
var formidable = require('express-formidable');
app.use(formidable());

router.post('/board/:commentBoardId/comment', commentAdd);
router.get('/board/:commentBoardId/comment', commentShow);
router.post('/board/:commentBoardId/comment/:commentId/delete',commentDelete);  // 댓글 삭제하기
router.post('/board/:commentBoardId/comment/:commentId/like', commentLike);

function commentAdd(req, res) {
    var commentBoardId = req.params.commentBoardId;
    var userId = req.fields.userId;
    var commentUserId = req.fields.commentUserId;
    var commentUserPicture = req.fields.commentUserPicture;
    var commentUserNicName = req.fields.commentUserNicName;
    var commentContent = req.fields.commentContent;
    var commentBoardTag = req.fields.commentBoardTag;
    var loadDt = new Date(); //현재 날짜 및 시간   //현재시간 기준 계산
    var commentDate  = format('{year}.{month}.{day} {hours}:{minutes}', new Date(Date.parse(loadDt) + 9 * 1000 * 60 * 60)); //한시간 전
    commentModel.commentAdd(commentBoardId, userId, commentUserPicture, commentUserId, commentBoardTag, commentUserNicName, commentContent, commentDate, function (err, result) {
 	   if(err){
	       console.log('comment register fail');
	       res.json({ err: err.message});
	   }
	   else{
	       console.log('comment register success');
	       res.json({msg : 'comment register success',data : result});
	   }
   });
   
}
   

function commentRevise(req, res, next){	
	var boardId = parseInt(req.params.boardid);
	var commentId = parseInt(req.params.commentid);
	var commentUserPicture = req.fields.commentUserPicture;
	var commentContent = req.fields.commentContent;
	var commentDate = Date();
	
	commentModel.commentRevise(boardId, commentId, commentContent, commentDate, function (err, result) {
		 if(err) {
	            err.code = 500;
	            next(err);
	         }
		 if(result){console.log('success');
     	res.json({msg:'edit Success', result:result});}
	        else{
	        	res.send('data 없음');}
	      });	   
}



function commentShow(req, res, next){
	var commentBoardId = req.params.commentBoardId;
	commentModel.commentShow(commentBoardId, function (err, result) {
		if(err) {
            err.code = 500;
            next(err);
         }
        else{
        	res.json({msg:'comment list', result :  result});
        }
	});   
}

function commentDelete(req, res, next){
    var commnetBoardId = req.params.commentBoardId;
    var commentId = req.params.commentId;
    commentModel.commentDelete(commnetBoardId, commentId, function (err, result) {
        if (err) {
            console.log('comment delete fail');
            res.send({ err: err.message });
        }
        else {
            console.log('comment delete successs');
            res.json({ msg: 'comment delete success', data: result });
        }
        	});	
}


function commentLike(req, res, next){
	var boardId = parseInt(req.params.boardid);
	var commentId = parseInt(req.params.commentid);
	var boardUserId = parseInt(req.fields.boardUserId);
	commentModel.commentLike(boardId, commentId, boardUserId, function (err, result) {
		if(err) {
            err.code = 500;
            next(err);
         }
        else{
        	res.json({msg:'like success', result:result});
        	}
	});
	
}
module.exports = router;