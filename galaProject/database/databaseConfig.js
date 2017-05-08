var mongoose = require('mongoose');

mongoose.set('debug', true);
var database = {};

database.connect = function(app){
   console.log('Database 호촐');
   var db_url = "mongodb://localhost/galaDB";
   connect(app, db_url);
}

function connect(app, db_url){
   console.log('connect() 호출됨.');
   mongoose.connect(db_url);
   database.db = mongoose.connection;
   database.db.on('err',function(err){
      console.err(err);
   });

   database.db.on('open',function(){
      console.log('connect success');
   });
}

module.exports = database;