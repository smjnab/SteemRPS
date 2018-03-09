////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// JSONS FOR POSTING COMMENTS TO STEEM
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var beneficiary;

if (client.addressPrefix == "STX") beneficiary = "smjnmmb";
else beneficiary = "smjn";

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

var jsonChallengeOptions = {
    "author": "",                               ///challenger name V
    "permlink": "",                             ///perm link to post with challenge V
    "max_accepted_payout": "1000000.000 SBD",   ///V
    "percent_steem_dollars": 10000,             ///V
    "allow_votes": true,                        ///V
    "allow_curation_rewards": true,             ///V
    "extensions": [
        [
            0,                                  /// ? V
            {
                "beneficiaries": [              /// V
                    {
                        "weight": 50,           /// 50 = 0.5% of payout to beneficiary. V
                        "account": beneficiary  /// name of benficiary V
                    }
                ]
            }
        ]
    ]
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

var jsonResponseOptions = {
    "author": "",                               ///challenged name V
    "permlink": "",                             ///perm link to challenger response post V
    "max_accepted_payout": "1000000.000 SBD",   ///V
    "percent_steem_dollars": 10000,             ///V
    "allow_votes": true,                        ///V
    "allow_curation_rewards": true,             ///V
    "extensions": [
        [
            0,                                  /// ? V
            {
                "beneficiaries": [              /// V
                    {
                        "weight": 50,           /// 50 = 0.5% of payout to beneficiary. V
                        "account": beneficiary  /// name of benficiary V
                    }
                ]
            }
        ]
    ]
};
