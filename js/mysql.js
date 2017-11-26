var mysql      = require('mysql');

var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'CSC_510_Project'
});

function getConnection(){
    connection.connect();
}

function getIssueTags(issueNumber){
    //connection.connect();
    var query = 'select tags from issue_tags where Issue_ID=' + issueNumber;//+ ';';
    connection.query(query, function(err, rows, fields) {
        if (!err){
            var data = rows;
            console.log(data);
            for(var i=0;i<data.length;i++){
                console.log(data[i].Issue_tags);
            }
        }
        else
            console.log(err);
    });
    //connection.end();
}

function getUserTagsCount(userList, tagsList,assignee){
    return new Promise(function(resolve, reject){
        var data = {};
        console.log("get tag count");
        var i=0;
        var userProcessed = 0;
        for(var i=0;i<userList.length;i++){
            UserTagsCount(userList[i], tagsList).then(function(userCount){
                if((userCount.split(":")[1] != 0) && (userCount.split(":")[0] != assignee)){
                    data[userCount.split(":")[0]] = userCount.split(":")[1];
                }
                console.log("pushing data");
                console.log("user: ", userCount.split(":")[0]);
                console.log(data);
                userProcessed++;
                if(userProcessed == userList.length){
                    console.log("user: ", userProcessed);
                    resolve(data);
                }
            });
        }
        console.log("data: ", data);
        //resolve(data);
    });
}

function UserTagsCount(user, tagsList){
    return new Promise(function(resolve, reject){
        var query = "select count(distinct a.User_ID, b.Issue_ID) as numOfIssues from user_tags as a,"+
                    "(select Issue_ID, tags from issue_tags where Issue_id in "+
                    "(select Issue_ID from issue_assignee where User_Id='"+ user + "')) as b where a.skill=b.tags"+
                    " and User_Id='" + user + "' and b.tags in('" + tagsList.join("','") + "');";
        console.log(query);
        connection.query(query, function(err, rows, fields) {
            if (!err){
                console.log('in here');
                console.log(rows);
                resolve(user+":"+rows[0].numOfIssues);
            }
            else{
                console.log(err);
                reject("Error while fetching user-tags details");
            }   
        });
    });
}

function getReviewerTagsCount(userList, tagsList,assignee){
    return new Promise(function(resolve, reject){
        var data = {};
        console.log("get tag count");
        var i=0;
        var userProcessed = 0;
        for(var i=0;i<userList.length;i++){
            ReviewerTagsCount(userList[i], tagsList).then(function(userCount){
                if((userCount.split(":")[1] != 0) && (userCount.split(":")[0] != assignee)){
                    data[userCount.split(":")[0]] = userCount.split(":")[1];
                }
                console.log("pushing data");
                console.log("user: ", userCount.split(":")[0]);
                console.log(data);
                userProcessed++;
                if(userProcessed == userList.length){
                    console.log("user: ", userProcessed);
                    resolve(data);
                }
            });
        }
        console.log("data: ", data);
        //resolve(data);
    });
}

function ReviewerTagsCount(user, tagsList){
    return new Promise(function(resolve, reject){
        var query = "select count(distinct a.User_ID, b.Issue_ID) as numOfIssues from user_tags as a,"+
                    "(select Issue_ID, tags from issue_tags where Issue_id in "+
                    "(select Issue_ID from issue_reviewer where User_Id='"+ user + "')) as b where a.skill=b.tags"+
                    " and User_Id='" + user + "' and b.tags in('" + tagsList.join("','") + "');";
        console.log(query);
        connection.query(query, function(err, rows, fields) {
            if (!err){
                console.log('in here');
                console.log(rows);
                resolve(user+":"+rows[0].numOfIssues);
            }
            else{
                console.log(err);
                reject("Error while fetching user-tags details");
            }   
        });
    });
}

function insertIssueReviewers(users,issueNumber){
    return new Promise(function(resolve, reject){
        
        for(var i=0;i<users.length;i++){
            var query = {Issue_ID: issueNumber, User_ID: users[i]};
            console.log("ISSUE IS: "+issueNumber);
            console.log("USER IS: "+users[i]);
            
            connection.query('insert into issue_reviewer SET ?',query, function(err,rows,fields){
                if(!err){
                    console.log('Record inserted successfully');
                }
                else
                    console.log(err);
            });
        }
        resolve("Reviewers successfully inserted in the database");
    });
}

function getEmail(users){
    return new Promise(function(resolve, reject){
        var emailID = [];
        var userProcessed = 0;
        for(var i=0;i<users.length;i++){
            findEmail(users[i]).then(function(email){
                emailID.push(email);
                userProcessed++;
                if(userProcessed==users.length){
                    resolve(emailID);
                }
            });
        }
    });
}

function findEmail(user){
    return new Promise(function(resolve,reject){
        var query = "select Email_ID from user_info where User_ID='"+user+"';";
        console.log(query);
        connection.query(query,function(err,rows,fields){
        if (!err){
            resolve(rows[0].Email_ID);
        }
        else
            console.log(err);
        });
    });
}

function insertIssueAssignee(data){
    var query = 'insert into issue_assignee VALUES(' + data[0] + "," + "'" + data[1] + "'" + ')';
    connection.query(query, function(err, rows, fields) {
         if (!err){
             console.log('Record inserted successfully');
         }
         else
            console.log(err);
    });
}

function insertUserTags(data){
    var query = 'insert into user_tags VALUES(' + "'" + data[0] + "'" + "," + "'" + data[1] + "'" + ')';    
     connection.query(query, function(err, rows, fields) {
         if (!err){
           console.log('Record inserted successfully');
         }
         else
             console.log(err);
    });
}

function insertIssueTags(data){
    var query = 'insert into issue_tags VALUES(' + data[0] + "," + "'" + data[1] + "'" + ')';
    connection.query(query, function(err, rows, fields) {
         if (!err){
             console.log('Record inserted successfully');
         }
         else
             console.log(err);
     });
}

function updateUserTags(data){
    //var query = 'insert into User_tags values(' + data.issueNumber + "'" + data.userId + "'" + data.issueTags + ')';
    var data = {User_ID:'sbshete',User_tags:'Java, core java, Advanced java',Email_ID:'sbshete@ncsu.edu'};
    var query = "update user_table set User_tags='" + data.User_tags + "' where User_ID='" + data.User_ID + "'";
    connection.query(query, function(err, rows, fields) {
        if (!err){
            console.log('Record updated successfully');
        }
        else
            console.log(err);
    });
}

exports.insertIssueTags = insertIssueTags;
exports.insertUserTags = insertUserTags;
exports.insertIssueAssignee = insertIssueAssignee;
exports.getEmail = getEmail;
exports.getReviewerTagsCount = getReviewerTagsCount;
exports.insertIssueReviewers = insertIssueReviewers;
exports.getUserTagsCount = getUserTagsCount;
exports.getIssueTags = getIssueTags;
exports.getConnection = getConnection;
exports.insertIssueTags = insertIssueTags;
exports.insertUserTags = insertUserTags;
exports.updateUserTags = updateUserTags;
