var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'CSC_510_Project'
});

function getConnection(){
    connection.connect();
}
function getIssueTags(issueNumber){
    //connection.connect();
    var query;
    connection.query('select Issue_tags from issue_table where Issue_ID=' +issueNumber+ ';', function(err, rows, fields) {
        if (!err){
            var data = rows;
            console.log(data);
            for(var i=0;i<data.length;i++){
                console.log(data[i].Issue_tags.split(','));
            }
        }
        else
            console.log(err);
    });
    //connection.end();
}

function getReviewerTags(userId){
    //connection.connect();
    console.log('here 1');
    var query;
    connection.query('select User_tags from user_table where User_ID=\'' + userId + '\';', function(err, rows, fields) {
        if (!err){
            var data = rows;
            console.log(data);
            for(var i=0;i<data.length;i++){
                console.log(data[i].User_tags.split(','));
            }
        }
        else
            console.log(err);
    });
    //connection.end();
}

exports.getReviewerTags = getReviewerTags;
exports.getIssueTags = getIssueTags;
exports.getConnection = getConnection;