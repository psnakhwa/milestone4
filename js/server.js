var helper = require("./helper.js")
var mysql = require("./mysql.js")
var ngrok = require('ngrok');
var request = require('request');
var express = require('express');
var _ = require('underscore');
var fs = require('fs');
var app = express();

ngrok.connect(8080, function (err, url) {
    console.log(url);
});

app.post('/payload', function(req, res){
    var body = "";
    req.on('data', function (chunk){
        body += chunk;
    });
    req.on('end', function(){
        var jsonObj = JSON.parse(body);  
	dict = {};
    arr_assignees = [];
	arr_labels = [];
	obj_labels = jsonObj.issue.labels;

	if(jsonObj.action == "closed")
	{
		// Getting title, description, labels and assignee for an issue
		dict["title"]=jsonObj.issue.title;
        	dict["desc"]=jsonObj.issue.body;
        	var issueNumber=jsonObj.issue.number;
                for(var i=0; i<obj_labels.length; i++)
                {
                    arr_labels.push(obj_labels[i].name);
                }
		dict["labels"]=arr_labels;

		for(var i=0; i<jsonObj.issue.assignees.length;i++)
		{
			arr_assignees.push(jsonObj.issue.assignees[i].login);
		}
        	var assignee=arr_assignees[0]; // Considering only one assignee for our testcase
        
		
        helper.getIssueTags(dict["title"]+ " "+ dict["desc"]).then(function(response){
            
	    // Entry in issue_assignee
            var issue_assignee_data = [issueNumber,assignee];
            mysql.insertIssueAssignee(issue_assignee_data);
            
	    // Entry in issue_tags
            var tagsFromPy = response;
            var tagsFromLabels = dict["labels"];
            for (var tag of tagsFromLabels){
                tagsFromPy.push(tag);                
            }
		
            for (var tag of tagsFromPy){
                var data = [issueNumber,tag];
                console.log("data is:"+data);
                mysql.insertIssueTags(data);                
            }
		// Entry in user_tags
            for (var tag of tagsFromPy){
                var data = [assignee,tag];
                console.log("data is:"+data);
                mysql.insertUserTags(data);                
            }
        });
	}
    })
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end('thanks');
});

port = 8080;
app.listen(port);
console.log('Listening at : ' + port)
