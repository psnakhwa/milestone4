var helper = require("./helper.js")
var mysql = require("./mysql.js")
var os = require('os');
var fs = require('fs');
var _ = require("underscore");
var request = require("request");
var querystring = require('querystring');
var Promise = require("bluebird");

var repo = "";
var owner = "";

if (!process.env.BOT_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var controller = Botkit.slackbot({
    debug: false

});

controller.spawn({
    token: process.env.BOT_TOKEN,
  }).startRTM()
  var checkRepo = '';
  var checkOwner = '';

  controller.hears(['hello','hi','Hello','Hi','Hey','hey'],['mention','direct_mention','direct_message'],function(bot,message) {
    if(repo!="" || owner!=""){
        bot.api.users.info({user:message.user}, function(err, response) {
            bot.startConversation(message, function(response, convo){
                convo.say("Hi, please type in 1 of the 3 usecases:\n"+
                "1. find assignee for issue [issue number]]\n"+
                "2. find contributors for file [file name]\n"+
                "3. find reviewers for issue [issue number]");
            });
    });
    }  
    else{
        findOwnerRepo(bot,message,true).then(function(flag){
        });
    }
  });

function findOwnerRepo(bot,message,flag){
    return new Promise(function (resolve, reject){
        bot.api.users.info({user:message.user}, function(err, response) {
              let {name, real_name} = response.user;
              console.log("user: " + response.user);
              bot.startConversation(message, function(response, convo){
                    convo.ask("Hi " + real_name + " Please enter the repository name to work with.", function(response, convo) {
                    checkRepo = response.text;
                    console.log("bot in ask: ", bot);
                    convo.stop();
                    askOwner(checkRepo, bot, message, flag).then(function(flag){
                        //convo.next();
                        resolve(true);
                    });
                  });
              });
              });
    });
}

function askOwner(checkRepo, bot, message, flag) {
    return new Promise(function (resolve, reject){
        console.log("bot is" + bot);
        bot.startConversation(message, function(response, convo){
            convo.ask("Please enter the owner name of the repo?", function(response, convo) {
              checkOwner = response.text;
              console.log("repo to check is: " + checkRepo);
              console.log("Owner to check is: " + checkOwner);
              helper.doesRepoAndOwnerExist(checkRepo,checkOwner).then(function (statusReport)
              {
                  console.log("statusReport is: " + statusReport);
                  if(statusReport === 1 || statusReport == '1'){
                      repo = checkRepo;
                      owner = checkOwner;
                      console.log("repo: " + repo);
                      console.log("owner: " + owner);
                      if(flag){ 
                          bot.reply(message, "The repo: " + repo + " and the owner: " + owner + " is set, please type in 1 of the 3 usecases:\n"+
                            "1. find assignee for issue [issue number]]\n"+
                            "2. find contributors for file [file name]\n"+
                            "3. find reviewers for issue [issue number]");
                      }
                      resolve(true);
                      convo.stop();        
                  }else{
                    convo.say("undefined");
                  }  
              }).catch(function(err){
                  console.log("the function reaches here");
                  bot.reply(message, err);
              });
              //convo.next();
            });
        });
    });
}
/**
 * Use Case 1
 * @desc Finding assignee for given issue
 * @param issueNumber issue for which assinee suggestion is required
 */
controller.hears('find assignee for issue (.*)',['mention', 'direct_mention','direct_message'], function(bot,message) 
{ 
    if(repo=="" || owner==""){
        findOwnerRepo(bot,message,false).then(function(flag1){
            useCase1(bot,message).then(function(flag2){
            });
        });
    }
    else{
        useCase1(bot,message).then(function(flag){
            });
    }
});

function useCase1(bot,message){
    return new Promise(function (resolve, reject){
        var issueNumber = message.match[1];
        controller.storage.users.get(message.user, function(err, user) {
            bot.startConversation(message, function(err, convo) {
                helper.getPossibleAssignees(issueNumber,repo,owner).then(function(assigneeList){
                    var userList = [];
                    console.log("Assignee: "+assigneeList);
                    var result = Object.keys(assigneeList).sort(function(a, b) {
                        return assigneeList[b] - assigneeList[a];
                    });
                    if(result.length==0){
                        console.log("REACHING HERE")
                        convo.say("There is not enough data in the database to make accurate predictions. I am sorry");
                    }
                    else{
                        convo.say("The list of users in the prefered order is:");
                        for(var i=0; i<result.length && i<3;i++){
                            userList.push(result[i]);
                            convo.say("Emp Id: " + result[i]);
                        }
                        convo.ask("Whom do you want to assign this issue?", function(response, convo) {
                            helper.isValidUser(response.text, userList).then(function (userId){
                                convo.ask('Do you want to assign issue to ' + userId + '? Please confirm', [
                                {
                                    pattern: 'yes',
                                    callback: function(response, convo) {
                                        helper.assignIssueToEmp(userId, repo, owner, issueNumber).then(function(response){
                                            console.log("issue assign true");
                                            bot.reply(message, response);
                                            var subjectToSend = 'Notification from TraziBot';
                                            var textToSend = 'Hi, This is TraziBot. Issue ' + issueNumber + ' in repo ' + repo + ' is assigned to you';
                                            mysql.getEmail([userId]).then(function(emailId){
                                                console.log("Email is: "+emailId[0])
                                                helper.emailing(emailId[0], subjectToSend, textToSend);
                                            });
                                        }).catch(function(err){
                                            bot.reply(message, error);
                                        });
                                        convo.next();
                                    }
                                },
                                {
                                    pattern: 'no',
                                    callback: function(response, convo) {
                                        bot.reply(message,"Ok! Ping me if you need anything!");
                                        convo.stop();
                                    }
                                },
                                {
                                    default: true,
                                    callback: function(response, convo) {
                                        convo.repeat();
                                        convo.next();
                                    }
                                }]);
                                resolve(true);
                                convo.next();
                            }).catch(function (err){
                                bot.reply(message, err);
                            }); 
                        });
                    }
                }).catch(function(err){
                    bot.reply(message, err);
                });
            });
        });
    });
}

/**
 * Use Case 2
 * @desc Finding major contributors for a file
 * @param filename for which contributors have to be found
 */
controller.hears('find contributors for file (.*)',['mention', 'direct_mention','direct_message'], function(bot,message){   
    if(repo=="" || owner==""){
        findOwnerRepo(bot,message,false).then(function(flag1){
            useCase2(bot,message).then(function(flag2){
            });
        });
    }
    else{
        useCase2(bot,message).then(function(flag){
            });
    }
});

function useCase2(bot,message){
    return new Promise(function (resolve, reject){
        var fileName = message.match[1];    
        bot.startConversation(message, function(err,convo){
        var userList = [];    
        helper.listOfCommits(owner,repo,fileName).then(function (commits_of_a_file)
            {
                if(commits_of_a_file.length == 0){
                    bot.reply(message, "Enter a valid file name with extention. It is case sensitive");
                    convo.stop();

                }else {
                    var comm = _.pluck(commits_of_a_file,"commit");
                    var dict = {}; // creating a dict to store the key value pairs with aggregation
                    var result = '';
                    comm.forEach(function(e){
                        userList.push(e.author.name);
                        result += "\nUser: "+e.author.name + "\nDate: " + e.committer.date + "\nMessage: "+e.message +"\n";
                        });
                    
                        comm.forEach(function(e){
                        if(dict.hasOwnProperty(e.author.name)){
                            dict[e.author.name] = dict[e.author.name] + 1;
                        } else{
                            dict[e.author.name] = 1;
                        }

                        console.log ("making a dictionary:");
                        console.log(dict);             
                    });
                    result += "\nSummary\n";
                    var res = [];
                    for(var prop in dict){
                        res.push({user: prop, TotalCommits: dict[prop]});
                        result += "User: " + prop + " has: " + dict[prop] + " commits in all \n";
                    }

                bot.reply(message, "The major contributors are: "  + result);
                convo.ask("\nWhom do you want to send a notification to ?", function(response, convo) {
                    helper.isValidUser(response.text, userList).then(function (userId){
                        convo.ask('Do you want notify ' + userId + '? Please confirm', [
                        {
                            pattern: 'yes',
                            callback: function(response, convo) {
                                var count = 0;
                                comm.forEach(function(e){
                                    if(e.author.name === userId && count ===0){
                                    count = 1;
                                    console.log ("finding email id");
                                    var subjectToSend = 'Notification from Trazi bot';
                                    var textToSend = 'Hi ' + e.author.name + ', This is TraziBot. A file that you previously worked on is .'+
                                    'being modified by some other user. You may be contacted regarding it soon';
                                    var sendTo= e.author.email;
                                    helper.emailing(sendTo, subjectToSend, textToSend);
                                    bot.reply(message,"The email is sent to " + e.author.email);
                                    }
                                }, this);
                                count =0;
                                
                                convo.next();
                            }
                        },
                        {
                            pattern: 'no',
                            callback: function(response, convo) {
                                bot.reply(message,"Ok! Ping me if you need anything!");
                                convo.stop();
                            }
                        },
                        {
                            default: true,
                            callback: function(response, convo) {
                                convo.repeat();
                                convo.next();
                            }
                        }]);
                        convo.next();
                    }).catch(function (e){
                        bot.reply(message, "User not from given recommendations, enter valid user id.");
                    }); 
                });
            
                }
            });
        });
    });
}

/**
 * Use Case 3
 * @desc Finding reviewers for given issue
 * @param issueNumber issue for which reviewer suggestion is required
 */
controller.hears('find reviewers for issue (.*)',['mention', 'direct_mention','direct_message'], function(bot,message) 
{
    if(repo=="" || owner==""){
        findOwnerRepo(bot,message,false).then(function(flag1){
            useCase3(bot,message).then(function(flag2){
            });
        });
    }
    else{
        useCase3(bot,message).then(function(flag){
            });
    }
});

function useCase3(bot,message){
    return new Promise(function (resolve, reject){
        var issueNumber = message.match[1];
        controller.storage.users.get(message.user, function(err, user) {
            bot.startConversation(message, function(err, convo) {
                helper.getIssueDetails(owner,repo,issueNumber).then(function(response){ 
                    if(response.assignees.length==0){
                        convo.say("Please assign the issue to someone before searching for reviewers")
                    }
                    else{
                        helper.getPossibleReviewers1(issueNumber,repo,owner).then(function(reviewertable){
                        helper.getPossibleReviewers2(issueNumber,repo,owner).then(function(assigneetable){
                            var userList = [];
                            var result_assignee_table = Object.keys(assigneetable).sort(function(a, b) {
                                return assigneetable[b] - assigneetable[a];
                            });
                            var result_review_table = Object.keys(reviewertable).sort(function(a, b) {
                                return reviewertable[b] - reviewertable[a];
                            });
                            result_assignee_table = result_assignee_table.filter(function (item) {
                            return result_review_table.indexOf(item) === -1;
                            });
                            if(result_assignee_table.length==0 && result_review_table==0){
                                convo.say("There is not enough data in the database to make accurate predictions. I am sorry");
                            }
                            else{
                                if(result_review_table.length!=0){
                                    convo.say("Users who have experience in reviewing similar types of issue in order of preference");
                                    for(var i=0; i<result_review_table.length && i<3;i++){
                                        userList.push(result_review_table[i]);
                                        convo.say("Emp Id: " + result_review_table[i]);
                                    }
                                }
                                if(result_assignee_table.length!=0){
                                    convo.say("These users have not reviewed similar type of issues but have some experience in working with similar issues");
                                    for(var i=0; i<result_assignee_table.length && i<3;i++){
                                        userList.push(result_assignee_table[i]);
                                        convo.say("Emp Id: " + result_assignee_table[i]);
                                    }
                                }
                                convo.ask("Whom do you want to select as a reviewer? Provide comma separated ids", function(response, convo) {
                                    helper.isValidReviwer(response.text, userList).then(function (users){
                                        console.log("assigning issue");
                                        convo.ask('Do you want to assign ' + users + ' as a reviewer for issue #?' + issueNumber + ' Please confirm', [
                                        {
                                            pattern: 'yes',
                                                callback: function(response, convo) {
                                                    helper.assignReviewerForIssue(users, issueNumber).then(function(response){
                                                        console.log("issue reviewer true");
                                                        var subjectToSend = 'Notification from TraziBot';
                                                        var textToSend = 'Hi, This is TraziBot. You have been assigned as a reviewer for issue '+issueNumber+' in repo ' +repo;
                                                        mysql.getEmail(userList).then(function(emailId){
                                                            for(var i=0;i<emailId.length;i++){
                                                                helper.emailing(emailId[i], subjectToSend, textToSend);
                                                            }
                                                        });
                                                        bot.reply(message, response);
                                                    }).catch(function(err){
                                                        bot.reply(message, error);
                                                    });
                                                    convo.next();
                                            }
                                        },
                                        {
                                            pattern: 'no',
                                            callback: function(response, convo) {
                                                bot.reply(message,"Ok! Ping me if you need anything!");
                                                convo.stop();
                                            }
                                        },
                                        {
                                            default: true,
                                            callback: function(response, convo) {
                                                convo.repeat();
                                                convo.next();
                                            }
                                        }]);
                                        convo.next();
                                    }).catch(function (e){
                                        bot.reply(message, "User "+e+" not from given recommendations, enter valid id.");
                                    });       
                                });
                    }
                    });
                });
                    }
                });         
            });
        });
    });
}

controller.hears(['.*'],['mention', 'direct_mention','direct_message'], function(bot,message) 
{
    console.log(message);

    bot.reply(message, "Wrong command! Valid commands are as follows:\n"+
    "find assignee for issue [issue number]\n"+
    "find contributors for file [file name]\n"+
    "find reviewers for issue [issue number]");
});
