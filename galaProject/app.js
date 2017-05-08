var morgan = require('morgan');
var express = require('express');
var path = require('path');
var app = express();
app.use(morgan('dev'));
var formidable = require('express-formidable');
app.use(formidable());
app.use(require('./routes/boardRouter'));
app.use(require('./routes/commentRouter')); 
app.use(require('./routes/userRouter'));
app.use(require('./routes/locationRouter'));
app.use(require('./routes/form.js'));
var database = require('./database/databaseConfig.js');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

database.connect(app);
app.use(handleError);
app.listen(3000,function(){
   console.log('node connect Success');
});
function handleError(err, req, res, next) {
	if(err.code)
		res.status(err.code);
	else
		res.status(500);
		console.log(err);
		res.send({msg:err.message});
}
