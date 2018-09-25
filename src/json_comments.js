////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// JSONS FOR POSTING COMMENTS TO STEEM
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/// For sending the challenge.
var jsonChallenge = {
    "parent_author": "",                ///Name of person getting challenged V
    "parent_permlink": "",              ///perm link to post of user getting challenged. V
    "author": "",                       ///challenger name V
    "permlink": "",                     ///perm link to post with challenge V
    "title": "",                        ///Always empty for comments. V
    "body": "",                         ///The actual challenge message in post. V
    "json_metadata": {
        "challenged": "",               ///Name of challenged. V
        "challenge_type": "",           ///The reason for making challenge. V
        "challenger_rpschoicemd5": "",  ///The RPS choice encrypted with md5. V
        "app": "smjnrps/0.1",           ///Name of this script. V
        "tags": ["smjnrps"]             ///Tags. V
    }
};

/// For sending the response to challenge.
var jsonResponse = {
    "parent_author": "",                ///Name of challenger V
    "parent_permlink": "",              ///perm link to post where challenged got challenged V
    "author": "",                       ///challenged name V
    "permlink": "",                     ///perm link to challenger response post V
    "title": "",                        ///Always empty for comments. V
    "body": "",                         ///The actual response to challenge message in post. V
    "json_metadata": {
        "challenger": "",               ///Name of challenger. V
        "winner": "",                   ///For the record... V
        "app": "smjnrps/0.1",           ///Name of this script. V
        "tags": ["smjnrps"]             ///Tags. V
    }
};


///////////////////////////////////////////////////////////////////////////////
// MODULE EXPORT
///////////////////////////////////////////////////////////////////////////////

module.exports = {
    jsonChallenge,
    jsonResponse
}