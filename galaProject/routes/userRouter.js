var async = require('async');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var userModel = require('../model/userModel.js');
var BoardModel = require('../model/boardModel.js');

router.post('/user/edit', userEdit); //7.회원프로필 수정
router.post('/user/checkList', userCheckList); //4.즐겨찾기 보기
router.post('/user/myList', userMyList); //6.내가 작성한글 보기 (o)
router.post('/user/:boardId/checkListAdd', userCheckAdd); //3.즐겨찾기 추가
router.post('/user/:boardId/delete', userCheckDelete); //5.즐겨찾기 삭제 
router.post('/user', userRegister); //1.회원가입
router.get('/user', userList); //2. 회원가입 유저보기 
router.post('/user/push', userPush); //8. 푸쉬 설정
//회원가입
function userRegister(req, res, next) {
    var userNicName = req.fields.userNicName;
    var userId = req.fields.userId;
    var fileinfo = req.files.file;  //사진관련
    var token = req.fields.token;
    userModel.userRegister(userNicName, userId, token, fileinfo, function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('회원가입 실패');
            console.log(err);
        }
        else {
            res.json({ msg: 'register success', data: result });
            console.log('회원가입 성공');
        }
    });
}//1
//유저 리스트 보기 
function userList(req, res, next) {
    userModel.userListShow(function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('사용자 작성 보기 실패');
            console.log(err);
        }
        else {
            res.json({ msg: 'register success', data: result });
            console.log('사용자 작성 보기 성공 ');
        }
    });
}//2
//즐겨찾기 추가 
function userCheckAdd(req, res, next) {
    var userId = req.fields.userId;
    var boardId = req.params.boardId;
    userModel.userCheckAddsave(boardId, userId, function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('사용자 즐겨찾기 실패');
            console.log(err);
        }
        else {
            res.json({ msg: '즐겨찾기 추가 success', data: result });
            console.log('사용자 즐겨찾기 ');
        }
    });
}//3
//즐겨찾기 보기
function userCheckList(req, res, next) {
    var userId = req.fields.userId;
    userModel.userCheckBoard(userId, function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('사용자 즐겨찾기 보기실패');
            console.log(err);
        }
        else {
            res.json({ msg: 'register success', data: result });
            console.log('사용자 즐겨찾기 보기성공 ');
        }
    });
}//4
//즐겨찾기 삭제
function userCheckDelete(req, res, next) {
    var userId = req.fields.userId;
    var boardId = req.params.boardId;
    userModel.userCheckDelete(boardId, userId, function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('사용자 즐겨찾기 삭제 실패');
            console.log(err);
        }
        else {
            res.json({ msg: '즐겨찾기 삭제 success', data: result });
            console.log('사용자 즐겨찾기 삭제 성공');
        }
    });
}//5
//내가 작성한글 보기
function userMyList(req, res, next) {
    var userId = req.fields.userId;
    console.log('userMyList :', userId);
    BoardModel.userBoardList(userId, function (err, result) {
        if (err) {
            res.json({ msg: 'register error', data: err.message });
            console.log('내가 작성 보기 실패');
            console.log(err);
        }
        else {
            res.json({ msg: 'register success', data: result });
            console.log('내가 작성 보기 성공 ');
        }
    });
}//6
//유저 닉네임 및 프로필 사진 변경
function userEdit(req, res, next) {
    var userId = req.fields.userId;
    var useritemKey = req.fields.useritemKey;
    var userNicName = req.fields.userNicName;  
    var fileInfo = req.files.file;
    userModel.userEdit(userId, useritemKey, userNicName, fileInfo, function (err, result) {
        if (err) {
            res.json({ msg: '개인정보 수정 실패', data: err.message });
            console.log('개인정보 수정 실패');
            console.log(err);
        }else{
            userModel.find({ userId: userId }, function (err, result) {
                var output = new Object();
                output.msg = '개인정보 수정 성공'
                output.data = result[0]
                res.json(output);
            })
            console.log('개인정보 수정 성공');
        }
    });
}
//푸쉬설정
function userPush(req, res, next) {
    var userId = req.fields.userId;
    userModel.find({ userId: userId }, function (err, result) {
        if (err) {
            res.send({ msg: 'pushSettingFail' });
        }
        else {
            if (result[0].userPush == true) {
                userModel.update({ userId: userId, userPush: true }, { $set: { userPush: false } }, function (err, result) {
                    res.send({ msg: 'pushOff' });
                });
            }
            else {
                userModel.update({ userId: userId, userPush: false }, { $set: { userPush: true } }, function (err, result) {
                    res.send({ msg: 'pushOn' });
                });
            }
        }
    })
}
module.exports = router;