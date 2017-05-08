var fs = require('fs');
var pathUtil = require('path');
var async = require('async');
var mongoose = require('mongoose');
var express = require('express');
var easyimg = require('easyimage');
var randomstring = require('randomstring');
var boardModel = require('./boardModel.js');
var commentModel = require('./commentModel.js');
var app = express();

var AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';
AWS.config.accessKeyId = 'AKIAIZM2JUQWA4BLVKUQ';
AWS.config.secretAccessKey = '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';
var s3 = new AWS.S3();
var formidable = require('express-formidable');
app.use(formidable({
    encoding: 'utf-8',
    uploadDir: '/upload',
    multiples: true, // req.files to be arrays of files 
}));
var user = {};
var userSchema = new mongoose.Schema({
    userIsLogin	: String,
    userSex	: String,
    userId : String,
    userPassword : String,
    userName : String,
    userPhoneNumber : String,
    userNicName : String,
    userBirthday : Date,
    userPicture : String,
    userResidence : Number,
    userSchool : Number,
    userWorkPlace : Number,
    userOtherPlace : Number,
    userIsAuthentication : Boolean,
    userFriends: { type: [String], 'default': [] },
    userSearchList: { type: [String], 'default': [] },
    userCheck: { type: [String], 'default': [] },
    userIntro : String,
    userPush : {type : Boolean, 'default' : true},
    userToken : String,
    useritemKey : String
});
var userModel = mongoose.model('users', userSchema);

//회원가입
userModel.userRegister = function (userNicName, userId, token, fileinfo, callback) {
    async.series([
        function (callback) {
            userModel.count({ userId: userId }, function (err, result) {
                if (err) {
                    check = -1;  //error!
                    callback(new Error('아이디 이상!'));
                }
                if (result == 1) {
                    check = 0;  // userID중복!!
                    callback(new Error('id 중복'));
                }
                else {
                    check = 1;  //userID중복안됨       
                    console.log('아이디 사용가능');
                    callback(null);
                }
            });    
        }, function (callback) {
            if (!fileinfo || fileinfo.size == 0) {
                console.log('asdhasks');
                userModel.userRegisterNoPic(userNicName, userId, token, function (err, result) {
                    if (err) {
                        console.log('회원가입 오류');
                        callback(new Error('회원가입 오류!'));
                    }
                    else {
                        console.log('회원가입 성공');
                        callback(null, result);
                    }
                });
            }
            else {
                userModel.userRegisterPic(userNicName, userId, token, fileinfo, function (err, result) {
                    if (err) {
                        console.log('회원가입 오류');
                        callback(new Error('회원가입 오류'));
                    }
                    else {
                        console.log('회원가입 성공');
                        callback(null, result);
                    }
                }); 	
            }
        }    
    ],function(err, result) {
        if ( err ) {
            console.error('에러 : ', err.message);
            callback(err);
            return;
        }
        console.log('모든 태스크 종료, 결과 : ', result[1]);
        
        callback(null, result[1])
    });
}
//회원가입 사진 있을 떄
userModel.userRegisterPic = function (userNicName, userId, token, fileInfo, callback) {  //사진 등록하는 경우
  var uploadDir = __dirname + '/upload';

  if (!fs.existsSync(uploadDir)) {
      console.error('upload, thumbnail 폴더 없음! ');
      process.exit();
  }
  var bucketName = 'galra';
  var resources = [];

  async.waterfall(
    [
       function (callback) {
           var randomStr = randomstring.generate(10); //랜덤넣고
           var newFileName = 'image_' + randomStr; //
           var extname = pathUtil.extname(fileInfo.name);
           var contentType = fileInfo.type;  //컨텐츠 타입
           var readStream = fs.createReadStream(fileInfo.path); //파일읽기 
           var itemKey = 'BoardImg/' + newFileName + extname;
           console.log(fileInfo.path);
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
                   callback(new Error('s3 PutObject Error'));
               }
               if (!data) {
                   console.error('s3 PutObject Error', err);
                   callback(new Error('s3 PutObject Error'));
               }
               else {
                   var imageUrl = s3.endpoint.href + bucketName + '/' + itemKey;
                   var imageSigenedURL = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: itemKey });
                   callback(null, imageUrl, itemKey);
                   console.log('imageurl :', imageUrl);
               }
           });
       },
       function (imageUrl, itemKey, callback) {
           var userData = {
    		   userNicName: userNicName,
               userId: userId,
               userToken : token,
               userPicture : imageUrl,
               useritemKey: itemKey
           };

           userModel.create(userData, function (err, result) {
               if (err) {
                   callback(new Error('데이터베이스 회원정보 저장 오류'));
                   console.log("Same went wrong while saving the thing");
               }
               else {
                   callback(null, result);
                   console.log("데이터베이스 저장 성공");
               }
           });
           fs.unlink(fileInfo.path, function (err) {
               if (err) throw err;
               console.log('임시 파일 삭제성공');
           });
       },
    ],
    function (err, result) {
        if (err) {
            console.log('waterfall 마지막 error', err);
            callback(new Error('waterfall 마지막 error'));
        }
        else {
            console.log('waterfall 마지막');
            callback(null, result);
        }
    });
}
//회원가입 사진없을 떄 
userModel.userRegisterNoPic = function (userNicName, userId,token, callback) {    //사진 등록 안하는 경우
  var uploadDir = __dirname + '/upload';
  if (!fs.existsSync(uploadDir)) {
      console.error('upload, thumbnail 폴더 없음! ');
      process.exit();
  }
  var bucketName = 'galra';
  var resources = [];

  async.waterfall(
    [
       function (callback) {
			 var randomStr = randomstring.generate(10); //랜덤넣고
			 var newFileName = 'image_' + randomStr; //
          //로컬서버 사용시
//           var extname = '.jpg';
//           var contentType = 'image/jpeg';  //컨텐츠 타입
//           console.log('---------------');
//           var readStream = fs.createReadStream('C:\\Users\\사용자\\AppData\\Local\\Temp\\default'); //파일읽기 
        
           //aws서버 사용시
           var extname = '.jpg';
			 var contentType = 'image/jpeg';
			 var readStream = fs.createReadStream('/tmp/default');
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
               if (!data) {
                   console.error('s3 PutObject Error', err);
                   callback(err);
               }
               else {
                   var imageUrl = s3.endpoint.href + bucketName + '/' + itemKey;
                   var imageSigenedURL = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: itemKey });
                   callback(null, imageUrl, itemKey);
                   console.log('imageurl :', imageUrl);
                   console.log('itemKey : ', itemKey);
                   console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
               }
           });
       },
       function (imageUrl, itemKey, callback) {
           var userData = {
          	 userNicName: userNicName,
               userId: userId,
               userToken : token,
               userPicture: imageUrl,
               useritemKey: itemKey
           };
           userModel.create(userData, function (err, result) {
               if (err) {
                   callback(new Error('데이터베이스 회원정보 저장 오류'));
                   console.log("Same went wrong while saving the thing");
               }
               else {
                   callback(null, result);
                   console.log("데이터베이스 저장 성공");
               }          
           });            
       }
    ],
     function (err, result) {
         if (err) {
             console.log('waterfall 마지막 error', err);
             callback(new Error('waterfall 마지막 error'));
         }
         else {
             console.log('waterfall 마지막');
             callback(null, result);
         }
     });
}
//회원가입한 유저 보기 
userModel.userListShow = function(callback){
	
	userModel.find({}).then(function fulfilled(result){
		
		callback(null, result);
	},function rejected(err){
		err.code = 500;
		callback(err, null);
	});	
}
//즐겨찾기 추가
userModel.userCheckAddsave =  function(boardId, userId,callback){
	userModel.update({ userId: userId },{$push:{userCheck:boardId}}, function (err, result) {
        if (err) {
            //res.send({ err: err.message });
            callback(err, '즐겨찾기 추가 에러');
        }
        else {
            callback(null, result);
        }
    });
}
//즐겨찾기보기
userModel.userCheckBoard =  function(userId,callback){
	//userModel.userCheckBoard =  function(userId,page,count,callback){
	userModel.find({ userId: userId },{_id : 0 ,userCheck:1}, function (err, result) {
        if (err) {
            console.log('userModel.find err :',err)
            callback(err, '즐겨찾기 보기 에러');
        }else {
        	console.log('result :',result)
        	//console.log("userCheck 값 :",result[0].userCheck);
        	if(result[0].userCheck.length > 0){
        		console.log('성공')
        		//BoardModel.showUserCheck_BoardList(userId,page,count,result, function (err, result) {
        		var BoardModel = require('./boardModel.js');
        		BoardModel.showUserCheck_BoardList(userId,result, function (err, result) {
	            if (err) {
	            	console.log('BoardModel.showUserCheck_BoardList err :',err)
	                return callback(err, '즐겨찾기 보기 실패');
	            }
	            else {
	                callback(null, result);
	            	}  
	        	});	
        	}else{
        		console.log('userCheck 길이 :',result[0].userCheck.length)
        		callback(new Error('데이터가 존재하지 않습니다.'))
        	}
        }
	})
}
//즐겨찾기 삭제
userModel.userCheckDelete =  function(boardId, userId,callback){
	userModel.update({ userId: userId },{$pull:{userCheck:boardId}}, function (err, result) {
        if (err) {
            callback(err, '즐겨찾기 삭제 에러');
        }
        else {
            callback(null, result);
        }
    });
}
//user사진 및 닉네임 변경
userModel.userEdit = function (userId, useritemKey, userNicName, fileInfo, callback) {
    var boardModel = require('./boardModel.js');
    var commentModel = require('./commentModel.js');
	  var bucketName = 'galra';
	  if (!fileInfo) {//닉네임만 변경하려고 할 때
	      console.log('닉네임만 변경');
	      userModel.findOneAndUpdate({ userId: userId }, { $set: { userNicName: userNicName } }, function (err, result) {
	          if (err) {
	              callback(new Error('닉네임 수정 실패'));
	          }
	          else {
	              boardModel.update({ boardUserId: userId }, { $set: { boardUserNicName: userNicName } }, function (err, result1) {
	                  if (err) {
	                      callback(new Error('모든 데이터에 닉네임 변경 실패'))
	                      console.log('모든 데이터 변경 실패');
	                  }
	                  else {
	                      console.log('모든 데이터 변경 성공');
	                  }
	              });
	              commentModel.update({ commentUserId: userId }, { $set: { commentUserNicName: userNicName } }, function (err, result1) {
	                  if (err) {
	                      callback(new Error('모든 데이터에 닉네임 변경 실패'))
	                      console.log('모든 데이터 변경 실패');
	                  }
	                  else {
	                      console.log('모든 데이터 변경 성공');
	                  }
	              });
	          }
	          callback(null, result);
	      });
	  }
	  else {//사진 및 닉네임 변경하려고 할 때
	      async.waterfall(
             [
                function (callback) {
                    var randomStr = randomstring.generate(10); //랜덤넣고
                    var contentType = fileInfo.type;  //컨텐츠 타입
                    var readStream = fs.createReadStream(fileInfo.path); //파일읽기 
                    var params = {
                        Bucket: bucketName,
                        Key: useritemKey,
                        ACL: 'public-read',
                        Body: readStream,
                        ContentType: contentType
                    }
                    s3.putObject(params, function (err, data) {
                        if (err) {
                            console.error('s3 PutObject Error', err);
                            callback(new Error('s3 PutObject Error'));
                        }
                        if (!data) {
                            console.error('s3 PutObject Error', err);
                            callback(new Error('s3 PutObject Error'));
                        }
                        else {
                            var imageUrl = s3.endpoint.href + bucketName + '/' + useritemKey;
                            var imageSigenedURL = s3.getSignedUrl('getObject', { Bucket: bucketName, Key: useritemKey });
                            callback(null, imageUrl);
                            console.log('imageurl :', imageUrl);
                        }
                    });
                },
                function (imageUrl, callback) {
                    if (userNicName == null) {	//사진만 변경하는 경우
                        console.log('사진만 변경');
                        userModel.findOneAndUpdate({ userId: userId }, { $set: { userPicture: imageUrl } }, function (err, result) {
                            if (err) {
                                callback(new Error('데이터베이스 회원정보 수정 오류(사진변경)'));
                                console.log("Same went wrong while saving the thing");
                            }
                            else {
                                
                                boardModel.update({ boardUserId: userId }, { $set: { boardUserPicture: imageUrl } }, function (err, result1) {
                                    if (err) {
                                        callback(new Error('모든 데이터에 사진 변경 실패'))
                                        console.log('모든 데이터 변경 실패');
                                    }
                                    else {
                                        console.log('모든 데이터 변경 성공');
                                    }
                                });
                                commentModel.update({ commentUserId: userId }, { $set: { boardUserPicture: imageUrl } }, function (err, result1) {
                                    if (err) {
                                        callback(new Error('모든 데이터에 사진 변경 실패'))
                                        console.log('모든 데이터 변경 실패');
                                    }
                                    else {
                                        console.log('모든 데이터 변경 성공!!!!!!!!!!!!!!!!!');
                                    }
                                });
                                console.log("개인정보 수정 성공");
                                callback(null, result);
                                
                            }
                        });
                    }
                    else {			//사진 과 닉네임변경
                        console.log('사진과 닉네임 변경');
                        userModel.findOneAndUpdate({ userId: userId }, { $set: { userPicture: imageUrl, userNicName: userNicName } }, function (err, result) {
                            if (err) {
                                callback(new Error('데이터베이스 회원정보 수정 오류(사진 및 닉네임 변경)'));
                                console.log("Same went wrong while saving the thing");
                            }
                            else {

                                boardModel.update({ boardUserId: userId }, { $set: { boardUserNicName: userNicName, boardUserPicture: imageUrl } }, function (err, result1) {
                                    if (err) {
                                        callback(new Error('모든 데이터에 사진 변경 실패'))
                                        console.log('모든 데이터 변경 실패');
                                    }
                                    else {
                                        console.log('모든 데이터 변경 성공');
                                    }
                                });
                                commentModel.update({ commentUserId: userId }, { $set: { commentUserNicName: userNicName, boardUserPicture: imageUrl } }, function (err, result1) {
                                    if (err) {
                                        callback(new Error('모든 데이터에 사진 변경 실패'))
                                        console.log('모든 데이터 변경 실패');
                                    }
                                    else {
                                        console.log('모든 데이터 변경 성공!!!');
                                    }
                                });
                                console.log("개인정보 수정  성공");
                                callback(null, result)
                            }
                        });
                    }
                    fs.unlink(fileInfo.path, function (err) {
                        if (err) throw err;
                        console.log('임시 파일 삭제성공');
                    });
                },
             ],
             function (err, result) {
                 if (err) {
                     console.log('waterfall 개인정보 수정 마지막 error', err);
                     callback(new Error('waterfall 마지막 error'));
                 }
                 else {
                     console.log('waterfall 개인정보 수정 마지막');
                     callback(null, result);
                 }
             });
	  }
}
module.exports = userModel;