var helper = require("./helper.js")
var os = require('os');
var fs = require('fs');
var _ = require("underscore");
var request = require("request");
var querystring = require('querystring');
var Promise = require("bluebird");

var repo = "Sample-mock-repo";
var owner = "dupandit";

if (!process.env.BOT_TOKEN) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('botkit');
var controller = Botkit.slackbot({
    debug: false
//include "log: false" to disable logging
});

// connect the bot to a stream of messages
controller.spawn({
    token: process.env.BOT_TOKEN,
  }).startRTM()

  // Intro
controller.hears(['hello','hi','Hello','Hi','Hey'],['mention','direct_mention','direct_message'],function(bot,message)
{   
    bot.api.users.info({user:message.user}, function(err, response) {
        let {name, real_name} = response.user;        
        bot.startConversation(message, function(err, convo) {
            bot.reply(message,"Hello "+name+"! What can I do for you?");
            convo.stop();
        });
    });
});

/**
 * Use Case 1
 * @desc Finding assignee for given issue
 * @param issueNumber issue for which assinee suggestion is required
 */
controller.hears('find assignees for issue (.*)',['mention', 'direct_mention','direct_message'], function(bot,message) 
{   
    var issueNumber = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        bot.startConversation(message, function(err, convo) {
            var assignee = helper.getPossibleAssignees(issueNumber);
            var userList = [];
            assignee.forEach(function(element) {
                userList.push(element.id);
                convo.say("Emp Id: " + element.id + " Skills: " + element.skills);
            }, this);
            convo.ask("Whom do you want to assign this issue?", function(response, convo) {
                helper.isValidUser(response.text, userList).then(function (userId){
                    convo.ask('Do you want to assign issue to ' + userId + '? Please confirm', [
                    {
                        pattern: 'yes',
                        callback: function(response, convo) {
                            //convo.say("Issue assigned to " + userId);
                            helper.assignIssueToEmp(userId, issueNumber).then(function(response){
                                console.log("issue assign true");
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
                    bot.reply(message, "User not from given recommendations, enter valid id.");
                }); 
            });
        });
    });
});

// USE CASE 2
controller.hears('find contributors for file (.*)',['mention', 'direct_mention','direct_message'], function(bot,message) 
{   bot.startConversation(message, function(err,convo){
        helper.listOfCommits(owner,repo).then(function (commits_of_a_file)
        {
            var comm = _.pluck(commits_of_a_file,"commit");
            console.log("hi");
            bot.reply(message, "The major contributors are: ");
            setTimeout(function() {
                comm.forEach(function(e){
                    console.log("User: "+e.author.name+"\nDate: "+e.committer.date+"\nMessage: "+e.msg);
                    bot.reply(message, "User: "+e.author.name+
                                "\nDate: "+e.committer.date+
                                "\nMessage: "+e.message);
                });    
            }, 100);
        });
        convo.stop();
    });
});

// USE CASE 3
controller.hears('find reviewers for issue (.*)',['mention', 'direct_mention','direct_message'], function(bot,message) 
{
    var issueNumber = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        bot.startConversation(message, function(err, convo) {

            var reviewers = helper.getPossibleReviewers(issueNumber);
            var userList = [];
            reviewers.forEach(function(element) {
                userList.push(element.id);
                convo.say("Emp Id: " + element.id + " Skills: " + element.skills);
                //console.log(element.skills+ " "+element.id);
            }, this)
            convo.ask("Whom do you want to select as a reviewer? Provide comma separated ids", function(response, convo) {
                helper.isValidReviwer(response.text, userList).then(function (userId){
                    console.log("assigning issue");
                    convo.ask('Do you want to assign ' + userId + ' as a reviewer for issue #?' + issueNumber + ' Please confirm', [
                    {
                        pattern: 'yes',
                            callback: function(response, convo) {
                                //convo.say("Issue assigned to " + userId);
                                helper.assignReviewerForIssue(userId, issueNumber).then(function(response){
                                    console.log("issue reviewer true");
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
        });
    });
});

controller.hears(['.*'],['mention', 'direct_mention','direct_message'], function(bot,message) 
{
    console.log(message);

    bot.reply(message, "Wrong command! Valid commands are as follows:\n"+
    "find assignees for issue [issue number]\n"+
    "find contributors for file [file name]\n"+
    "find reviewers for issue [issue number]");

    // bot.startConversation(message, function(err, convo) {
    //     convo.say("Wrong command! Valid commands are as follows:\n"+
    //                 "find assignees for issue [issue number]\n"+
    //                 "find contributors for file [file name]\n"+
    //                 "find reviewers for issue [issue number]");
    // });
});