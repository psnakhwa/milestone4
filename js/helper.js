var data = require('../mock_data/mock.json'); 
var nock = require("nock");
var request = require("request");
var Promise = require("bluebird"); 
var token = "token " + process.env.GITHUB_TOKEN;
var urlRoot = "https://github.ncsu.edu/api/v3";

var repo = "Sample-mock-repo";
var owner = "dupandit";

var issuedetails = nock("https://github.ncsu.edu/api/v3")
.persist()
.get("/repos/dupandit/Sample-mock-repo/issues/1")
.reply(200, JSON.stringify(data.issueList[0]) );

var mockCollaborators = nock("https://github.ncsu.edu/api/v3")
.persist()
.get("/repos/dupandit/Sample-mock-repo/collaborators")
.reply(200, JSON.stringify(data.collaborators) );

var mockCommits = nock("https://github.ncsu.edu/api/v3")
.persist()
.get("/repos/dupandit/Sample-mock-repo/commits")
.reply(200, JSON.stringify(data.commits_of_a_file) );


/**
 * @desc this will assign userId to issueNumber
 * @param userId emp to whom we will assign an issue
 * @param issueNumber issue to assigned
 * @return 
 */
 // Use Case 1
function getIssueDetails(owner,repo,number){

    var options = {
        url: urlRoot + "/repos/" + owner + "/" + repo + "/issues/"+number,
        method: 'GET',
        headers: {
                    "User-Agent": "EnableIssues",
                    "content-type": "application/json",
                    "Authorization": token
               }
        };

    return new Promise(function (resolve, reject)
    {
            request(options, function (error, response, body) {
                var obj = JSON.parse(body);
                resolve(obj);
            });
    });
}

function getCollaborators(owner,repo){    
    var options = { 
        url: urlRoot + "/repos/" + owner + "/" + repo + "/collaborators",  
        method: 'GET',
        headers: {
                        "User-Agent": "EnableIssues",
                        "content-type": "application/json",
                        "Authorization": token
                }
        };
        
    return new Promise(function (resolve, reject)
    {
            // Send a http request to url and specify a callback that will be called upon its return.
            request(options, function (error, response, body) {
                var obj = JSON.parse(body);
                resolve(obj);
            });
    });
}

var getPossibleAssignees = function getPossibleAssignees(issueNumber){
    //console.log("still here only");
    getIssueDetails(owner, repo, issueNumber);
    getCollaborators(owner, repo);
    var assignees = data.users;
    return assignees;
}

function assignIssueToEmp(userId, issueNumber){
    return new Promise(function(resolve, reject){
        resolve("Issue " + issueNumber + " assigned to " + userId);
    });
} 

// Usecase 2 :
function listOfCommits(owner,repo) {
    var options = {
        url: urlRoot + "/repos/" + owner + "/" + repo + "/commits",
        method: 'GET',
        headers: {
                     "User-Agent": "EnableIssues",
                     "content-type": "application/json",
                     "Authorization": token
                 }
        };
  
        return new Promise(function (resolve, reject)
        {
             // Send a http request to url and specify a callback that will be called upon its return.
             request(options, function (error, response, body) {
                 var obj = JSON.parse(body);
                 resolve(obj);
             });
        });
}

// Usecase 3:
function getPossibleReviewers(issueNumber){
    var reviewers = data.reviewers;
    return reviewers;
}

function assignReviewerForIssue(userId, issueNumber){
    return new Promise(function(resolve, reject){
        resolve("Reviewer " + userId + " assigned to issue #" + issueNumber);
    });
}


// Utilities

function isValidUser(userId, userList){
    return new Promise(function (resolve, reject)
	{
         if(userList.indexOf(userId)>-1){
            resolve(userId);
        }
        reject(userId);
    });
}

function isValidReviwer(userId, userList){
    return new Promise(function (resolve, reject)
	{
        var users = userId.split(",");
        users.forEach(function(user) {
            if(userList.indexOf(user.trim())<0){
                reject(user);
            } 
        });
        resolve(userId);
    });
}

exports.getCollaborators = getCollaborators;
exports.assignIssueToEmp = assignIssueToEmp;
exports.isValidUser = isValidUser;
exports.getPossibleAssignees = getPossibleAssignees;
exports.assignReviewerForIssue = assignReviewerForIssue;
exports.listOfCommits = listOfCommits
exports.getPossibleReviewers = getPossibleReviewers;
exports.isValidReviwer = isValidReviwer;
exports.getIssueDetails = getIssueDetails

