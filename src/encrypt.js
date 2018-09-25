const $ = require("jquery");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// ENCRYPT AND VERIFY MD5 FOR RPS CHOICES
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function MakeMD5(type, user, permlink, rpschoice, rpschoicemd5 = "") {
    if (window.location.href.includes("localhost")) return Promise.resolve(1);

    /// Enable caching.
    $.ajaxSetup({
        cache: true
    });

    /// Send request to backend lambda function. 
    var lambdaURL = "";

    /// Pick API endpoint for live or dev site.
    if (window.location.href.includes("dev.spelmakare.se")) lambdaURL = "https://fjlhwlra2d.execute-api.eu-west-1.amazonaws.com/dev/md5";
    else lambdaURL = "https://8gd2qvvsn7.execute-api.eu-west-1.amazonaws.com/live/md5";

    return $.ajax({
        url: lambdaURL,
        method: "post",
        dataType: "json",
        data: JSON.stringify({
            type: type, ///create or verify.
            user: user, ///name of user making post.
            permlink: permlink, ///permlink to post.
            rpschoice: rpschoice, ///choice made for RPS.
            rpschoicemd5: rpschoicemd5 ///optional md5, used if type is verify.
        })
    });
}

///////////////////////////////////////////////////////////////////////////////
// MODULE EXPORT
///////////////////////////////////////////////////////////////////////////////

module.exports = {
    MakeMD5
}