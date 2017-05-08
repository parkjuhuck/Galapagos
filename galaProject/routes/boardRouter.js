//==============================================================================================================//
var express = require('express');																				//
var router = express.Router();																					//
var mongoose = require('mongoose');																				//
var BoardModel = require('../model/boardModel.js');																//
var locationModel = require('../model/locationModel.js');														//
const async = require('async');																					//		
var format = require('date-format');																			//
//=========================================라우터 정리==============================================================//
router.get('/boards/location/:long/:lat/Circle', locationFindCircle); //1. (맵뷰)위도,경도로 지역찾기 or 컨텐츠로 찾기 (O)	//
router.post('/boards/:long/:lat/content', boardContentSearch);//6.게시글 컨텐츠 검색  (O)								//
router.get('/boards/localSearch', locationSearch);  //2. (게시글 등록시)검색으로 지역찾기 (O)  							//
router.post('/boards/nopermission', showBoardListNotGPS); //4. 피드화면 보기(GPS X) (O)								//
router.post('/boards/permission', showBoardList); //5. 피드화면 보기(GPS O) (O)										//
router.post('/boards/category', boardCategorySearch); //7. 게시글 카테고리 검색 (x)										//
router.post('/boards/:boardId/delete', deleteBoard);  //9. 게시판 삭제 (o)											//		
router.post('/boards/:boardId/revise', editBoard); //게시판 수정													//	
router.post('/boards/:boardId/like', LikeBoard);  //10. 좋아요 기능  (o)												//
router.post('/boards/:boardId/likeCancel', LikeCancelBoard);  //13. 좋아요 취소 (o)									//
router.post('/boards/:boardId/revision', hateBoard); //11. 정정요청기능 (o)											//
router.post('/boards/:boardId/revisionCancel', hateCancelBoard); //14. 정정요청 취소 (o)								//
router.post('/boards/:boardId/star', starBoard); //11. 즐겨찾기 on (o)												//
router.post('/boards/:boardId/starCancel', starCancelBoard); //14. 즐겨찾기 off (o)									//
router.post('/boards', addBoard); //8. 게시판 추가 (O)																//			
router.post('/boards/:boardId', showBoardDetail); //12. 게시판 상세보기 (O)											//
//==============================================================================================================//
//맵뷰에서 GPS로 찾기 ,컨첸츠로 찾기 (위도,경도 필수)
function locationFindCircle(req, res, next) {
    var long = req.params.long;
    var lat = req.params.lat;
    var radius = 3000;  //반경 3000m 보기(3km)
    var boardContent = null;
    boardContent = req.query.boardContent;
    if (boardContent) {
        //맵뷰에서 컨텐츠로 검색해서 찾기
        BoardModel.locationFindCircle_Content(long, lat, radius, boardContent, function (err, result) {
            if (err) {
                res.json({ msg: err });
            }
            else {
                res.json({ searchPoiInfo: { msg: 'find success', data: { "detail": result } } });
            }
        });
    }
    else {
        //맵뷰에서 위도 경도로만 찾기
        BoardModel.locationFindCircle(long, lat, radius, function (err, result) {
            if (err) {
                res.json({ msg: err });
            }
            else {
                res.json({ searchPoiInfo: { msg: 'find success', data: { "detail": result } } });
            }
        });
    }
} //1
//게시판 등록 시 지역 검색으로 찾기
function locationSearch(req, res, next) {
    var search = req.query.search;
    locationModel.locationSearch(search, function (err, result) {
        if (err) {
            res.json({ msg: 'search fail', err: result });
        }
        else {
            res.json({ msg: '지역 검색 성공', result});
            }
    });
}//2
//피드화면 보여주기 (GPS O) 
function showBoardList(req, res, next) {
    var long = req.query.long;
    var lat = req.query.lat;
    var maxDistance = 10000;
    var userId = req.fields.userId;
    //maxdistance의 단위는 미터(m)
    //10km이상 떨어진곳이면 못찾음
    var page = req.query.page || 1 ;
    var count = 20; //페이지당 갯수
    BoardModel.showBoardList(userId,page, count, long, lat, maxDistance, function (err, result) {
        if (err) {
            res.json({ msg: "boardList fail", err: err.message });
        }
        else {
            res.json({ msg: "boardList success", data: result });
        }
    });
} //5 
//게시글 컨텐츠 검색
function boardContentSearch(req, res, next) {
	var long = parseFloat(req.params.long);
	var lat = parseFloat(req.params.lat);
	var maxDistance = 10000;
    var boardContent = req.query.boardContent;
    var page = req.query.page || 1;
    var count = 20; //페이지당 갯수
    var userId = req.fields.userId;
    //var boardLocationNum = parseInt(req.fields.boardLocationNum);
    BoardModel.locationNear(long,lat,maxDistance,boardContent,page,count,userId, function (err, result) {
        if (err) {
        	console.log("실패결과 :",result);
            res.json({ msg: 'fail1' ,err : err});
        }
        else {
        	console.log("성공결과 :",result);
            res.json({ msg: 'boardList success', data: result });
        }
    });
} //6



//게시글 추가
function addBoard(req, res, next) {
    var board = new BoardModel();    
    var loadDt = new Date(); //현재 날짜 및 시간   //현재시간 기준 계산
    var boardDate  = format('yyyy-MM-dd hh:mm', new Date(Date.parse(loadDt) +9 * 1000 * 60 * 60)); //한시간 전
    var boardContentPicture1 = req.files.boardContentPicture1;
    var boardLocationSub = req.fields.boardLocationSub;
    var boardLong = req.fields.boardLong;
    var boardLat = req.fields.boardLat;
    
    board.boardUserId = req.fields.boardUserId;
    if (!board.boardUserId) {
        return res.status(400).send('boardUserId must Insert!!!!!!!!!!!!');
    }
    
    board.boardUserNicName = req.fields.boardUserNicName;
    if (!board.boardUserNicName) {
        return res.status(400).send('boardUserNicName must Insert!!!!!!!!!!!!');
    }
    
    board.boardCategory = parseInt(req.fields.boardCategory);
    if (!board.boardCategory) {
        return res.status(400).send('boardCategory must Insert!!!!!!!!!!!!');
    }
    
    board.boardContent = req.fields.boardContent;
    if (!board.boardContent) {
        console.log('boardContent');
        return res.status(400).send('boardContent must Insert!!!!!!!!!!!!');
    }
 
    board.boardTag = req.fields.boardTag;
    if (!board.boardTag) {
        console.log('boardTag');
        return res.status(400).send('boardTag must Insert!!!!!!!!!!!!');
    }
    
    board.boardUserPicture = req.fields.boardUserPicture;
    board.boardIsAnomynity = req.fields.boardIsAnomynity;
    board.boardDate = boardDate;
    board.boardTag = req.fields.boardTag;
    board.boarditemKey;
    
    if (!boardLocationSub || boardLocationSub.length == 0) { boardLocationSub = 1; }
    async.series([
        function(callback){
            if (boardLocationSub == 1) {//좌표 기반 지역등록시
		        board.geometry.coordinates = [parseFloat(req.fields.boardLong), parseFloat(req.fields.boardLat)];
		        board.boardLong = parseFloat(req.fields.boardLong);
		        board.boardLat = parseFloat(req.fields.boardLat);
		        var boardlong = req.fields.boardLong;
		        var boardlat = req.fields.boardLat;

		        locationModel.searchNearLocation(boardlong, boardlat, 1000, function (err, result) {
			        if (err){
		                callback(new Error('지역기반 등록 error'));
		                return;
		            }else{
		                board.boardLocationNum[0] = result[0];
		                if (result[2] && result[2][0]) {
		                    board.boardLocationNum[1] = result[2][0];
		                    if (result[2][1]) {
		                        board.boardLocationNum[1] = result[2][1];
		                    }
		                }
		                board.boardLocationName[0] = result[1];
		                callback(null);
		            }
		        });
            }else{//지역 검색 등록시
		        locationModel.find({ locationSub: { $in: [boardLocationSub] } }, { locationName: 1, locationNum: 1 }, function (err, result) {
		            if (err) {
		                return;
		            }else {
		                console.log(result);
		                var count = result.length;
		                console.log('동의 갯수 : ', count);
		                board.geometry.coordinates[0] = 0;
		                board.geometry.coordinates[1] = 0;
		                for (var i = 0; i < count; i++) {
		                    board.boardLocationNum[i] = result[i].locationNum;
		                    board.boardLocationName[i] = result[i].locationName;  
		                }
		                callback(null);
		            }
		        });
            }
        }, 
        function(callback){
            if (!boardContentPicture1){
                BoardModel.saveBoardData2(board, function (err, result) {
                    if (err) {
                        callback(new Error('사진 등록 안 된 게시글 등록 실패'))
                        console.error('saveBoardDataError:', err);
                    } else {
                    	console.log('입력결과',result);
                        callback(null, result);
                    }
                });
            }else {
            	BoardModel.saveBoardData1(board, boardContentPicture1, function (err, result) {
                    if (err) {
                        console.error('saveBoardDataError:', err);
                        callback(new Error('사진 등록 된 게시글 등록 실패'))
                    } else {
                        callback(null, result);
                    }
                });
            }
        }
    ],
    function(err, result){
        if (err) {
            console.error('finall error:', err);
            //callback(new Error('사진 등록 된 게시글 등록 실패'))
            res.json({ msg: 'board regiter false', err: err.message });
        }else {
            //callback(null, result);
            console.error('finall success success:');
            res.json({ msg: 'board regiter success', data: result[1] });
        }
    })
    //acync each 
    //    var boardFile = [
    //        req.files.boardContentPicture1,
    //        req.files.boardContentPicture2,
    //        req.files.boardContentPicture3,
    //        req.files.boardContentPicture4 
    //    ];
    //사진개수 
}//8
//게시글 삭제
function deleteBoard(req, res, next){
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.deleteBoard(board, function (err, result) {
        if (err) {
            res.json({ msg: '삭제 실패', err: err });
        }
        else {
            res.json({ msg: '삭제 성공', data: result });
        }
    });
}// 9
//게시글 좋아요
function LikeBoard(req, res, next) {
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.likeSave(board, function (err, result){
        if (err) {
            res.json({ msg: 'failed', err: err });
        }
        else {
            res.json({ msg: 'success', data: result });
        }
    });
}//10
//게시글 정정요청
function hateBoard(req, res, next){
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.revisionSave(board, function (err, result) {
        if (err) {
            res.json({ msg: 'failed', err: err });
        }
        else {
            res.json({ msg: 'success', data: result });
        }
    });
}//11 게시글 전문보기
function showBoardDetail(req, res, next){
	var userId = req.fields.userId;
    var board = new BoardModel();
    var output = new Object();
    var output2 = []
    board.boardId = req.params.boardId;
    BoardModel.showBoardDetail(board,userId,function (err, result) {
		 if (err) {
		     res.json({ msg: '게시판 전문보기 실패', err: err });
		 }
		 else {           
			 output.msg = "게시판 전문보기 성공";
		     output.data = result[0];
		     output.data1 = result[1];
		     res.json(output);
		 }
     });
}//12
//게시글 좋아요 취소
function LikeCancelBoard(req, res, next) {
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.likeCancelSave(board, function (err, result) {
        if (err) {
            res.json({ msg: 'failed', err: err });
        }else {
            res.json({ msg: 'success', data: result });
        }
    });
}//13
//게시글 정정요청취소
function hateCancelBoard(req, res, next) {
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.revisionCancelSave(board, function (err, result) {
        if (err) {
            res.json({ msg: 'failed', err: err });
        }else {
            res.json({ msg: 'success', data: result });
        }
    });
}//14
//즐겨찾기  추가
function starBoard(req, res, next) {
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.starSave(board, function (err, result) {
        if (err) {
            res.json({ msg: 'failed', err: err });
        }else {
            res.json({ msg: 'success', data: result });
        }
    });
}// 즐겨찾기 취소
function starCancelBoard(req, res, next) {
    var board = new BoardModel();
    board.boardId = req.params.boardId;
    board.userId = req.fields.userId;
    BoardModel.starCancelSave(board, function (err, result) {
        if (err) {
            res.json({ msg: 'failed', err: err });
        }else {
            res.json({ msg: 'success', data: result });
        }
    });
}//16
//   board.boardLocationNum = parseInt(req.fields.boardLocationNum);
//   board.boardLocationName = req.fields.boardLocationName;
//주혁1
function editBoard(req, res) {
    var loadDt = new Date(); //현재 날짜 및 시간   //현재시간 기준 계산
    var boardDate  = format('yyyy-MM-dd hh:mm', new Date(Date.parse(loadDt) +9 * 1000 * 60 * 60)); //한시간 전
    var boardContentPicture1 = req.files.boardContentPicture1
    var ObjectId = require('mongodb').ObjectID;
    var boardId = req.params.boardId;   
    if(!boardContentPicture1){ //사진없을 떄
	    BoardModel.findOne({_id: ObjectId(boardId)}, (err, doc) => {
	    	doc.boardUserPicture= req.fields.boardUserPicture;
	    	doc.boardUserId=req.fields.boardUserId;
	    	doc.boardUserNicName=req.fields.boardUserNicName;
	    	
//	    	doc.boardCategory=  parseInt(req.fields.boardCategory);
//	        if (!board.boardCategory) {
//	            return res.status(400).send('boardCategory must Insert!!!!!!!!!!!!');
//	        }

	    	doc.boardCategory=  parseInt(req.fields.boardCategory);
	        if (!doc.boardCategory) {
	            return res.status(400).send('boardCategory must Insert!!!!!!!!!!!!');
	        }

	    	doc.boardContent=req.fields.boardContent;
	        if (!doc.boardContent) {
	            return res.status(400).send('boardContent must Insert!!!!!!!!!!!!');
	        }
	        
	    	doc.boardTag= req.fields.boardTag;
	        if (!doc.boardTag) {
	            return res.status(400).send('boardTag must Insert!!!!!!!!!!!!');
	        }
	        
	    	doc.boardIsAnomynity= req.fields.boardIsAnomynity;
	        if (!doc.boardIsAnomynity) {
	            return res.status(400).send('boardIsAnomynity must Insert!!!!!!!!!!!!');
	        }
	        
	    	doc.boardDate= boardDate
	    	doc.save( (err, ret) => {
	    		if(err){
	    			console.log('doc err1 :', result)
		    		console.log('doc err2 :', err)
	    			res.json({ msg: 'failed', err: result })
	    			//res.json({ msg: 'failed', err: err })
	    		}else{
	    			console.log('doc 성공 :', ret)
	    			res.json({ msg: 'success', data: ret });
	    		}
	    	});
	    });
    }else{ //사진있을떄
    	var board = new BoardModel();
    	board.boardId = ObjectId(boardId) //게시판 _id
    	board.boardUserPicture= req.fields.boardUserPicture;
    	board.boardUserId=req.fields.boardUserId;
    	board.boardUserNicName=req.fields.boardUserNicName;
    	
    	board.boardCategory=  parseInt(req.fields.boardCategory);
        if (!board.boardCategory) {
            return res.status(400).send('boardCategory must Insert!!!!!!!!!!!!');
        }
        
    	board.boardContent=req.fields.boardContent;
        if (!board.boardContent) {
            return res.status(400).send('boardContent must Insert!!!!!!!!!!!!');
        }
        
    	board.boardTag= req.fields.boardTag;
        if (!board.boardTag) {
            return res.status(400).send('boardTag must Insert!!!!!!!!!!!!');
        }
        
    	board.boardIsAnomynity= req.fields.boardIsAnomynity;
        if (!board.boardIsAnomynity) {
            return res.status(400).send('boardIsAnomynity must Insert!!!!!!!!!!!!');
        }
        
    	board.boarditemKey= req.fields.boarditemKey;
    	board.boardDate= boardDate;
    	BoardModel.editBoard(board,boardContentPicture1, function (err, result) {
	    	if(err){
	    		console.log('err2 :', result)
	    		console.log('err1 :', err)
	    		res.json({ msg: 'failed1', err: result })
	    		//res.json({ msg: 'failed2', err: err })
	    	}else{
	    		res.json({ msg: 'success', data: result });
	    	}
    	})	
    }	  	
}
module.exports = router;

//게시글 카테고리 검색					삭제예정
function boardCategorySearch(req, res, next) {
    var boardLocationNum = req.query.boardLocationNum;
    var boardCategory = req.query.boardCategory;
    console.log(boardLocationNum, boardCategory);
    //  var boardLocationNum = req.query.boardLocationnum;
    //  var boardCategory = req.query.boardcategory;
    BoardModel.boardCategorySearch(boardLocationNum, boardCategory, function (err, result) {
        if (err) {
            res.json({ msg: "category search fail", err: err });
        }
        else {
            res.json({ msg: "category search success", data: result });
        }
    });
}// 7
//피드화면 보여주기 (GPS X)			삭제예정
function showBoardListNotGPS(req, res, next) {
    var page = req.query.page || 1;
    var count = 20; //페이지당 갯수
    var userId = req.fields.userId;
    BoardModel.showBoardListNotGPS(userId,page, count, function (err, result) {
        if (err) {
            res.json({ msg: "boardList fail", err: err.message });
        }
        else {
            res.json({ msg: "boardList success", data: result });
        }
    });
} //4