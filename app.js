var express = require('express'),
	app = express(),
	bodyparser = require('body-parser');

// Configuration
// use jade
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// nowadays specify the parser and extended true or false must be specified
app.use(bodyparser.urlencoded({
  extended: true
}));

// serve up javascript and sounds
app.use(express.static('lib'));
app.use(express.static('public'));

app.get('/test', function (req, res) {
    res.render('index', {
    	title: 'AudioM',
        layout: true
    });
});

var server = app.listen(5101, function () {
	console.log('AudioM test app listening at http://%s:%s', server.address().address, server.address().port)
});

