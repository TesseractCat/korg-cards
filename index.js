var express = require('express')
var app = express()
var fs = require('fs')
var path = require('path')
const filenamify = require('filenamify');

const notebook_directory = path.join(__dirname, 'notebooks');

app.get('/notebooks/list', function (req, res) {
    fs.readdir(notebook_directory, function (err, files) {
        files.sort();
        res.json({"list":files});
    });
});
app.get('/notebooks/create/:notebook', function (req, res) {
    var filepath = path.join(__dirname, 'notebooks/' + filenamify(req.params.notebook) + ".org");
    fs.closeSync(fs.openSync(filepath, 'a'));
    res.sendStatus(200);
});
app.get('/notebooks/delete/:notebook', function (req, res) {
    var filepath = path.join(__dirname, 'notebooks/' + filenamify(req.params.notebook) + ".org");
    fs.unlinkSync(filepath);
    res.sendStatus(200);
});
app.get('/notebooks/read/:notebook', function (req, res) {
    var filepath = path.join(__dirname, 'notebooks/' + filenamify(req.params.notebook) + ".org");
    fs.readFile(filepath, {encoding:'utf8'}, function (err, data) {
        res.json({"data":data.replace(new RegExp("\\r\\n","gi"),"\n")});
    });
});

app.use(express.json());

app.post('/notebooks/update/:notebook', function (req, res) {
    var filepath = path.join(__dirname, 'notebooks/' + filenamify(req.params.notebook) + ".org");
    //console.log(req.body.data);
    fs.writeFileSync(filepath, req.body.data, {encoding:'utf8',flag:'w'});
    res.sendStatus(200);
});

app.use('/', express.static('static'));

app.listen(3000)