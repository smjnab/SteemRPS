const { Client } = require("dsteem");
const $ = require("jquery");
const DOMPurify = require("dompurify");
const { MakeMD5 } = require("./encrypt");
const { jsonChallenge, jsonResponse } = require("./json_comments");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// CONFIGURE & INIT
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/// Create client for live network.
var client = new Client("https://api.steemit.com", { timeout: 2000 });
const secondServer = "https://api.steemitstage.com/"; // If api.steemit.com does not respond, try this server.
const thirdServer = "https://gtg.steem.house:8090"; // If api.steemit.com does not respond, try this server.
const fourthServer = "https://rpc.steemliberator.com/"; // If api.steemit.com does not respond, try this server.
var failCount = 0;  /// Switch to secondary and third server on fails.

NetWorkCheck();

/// Check if server is available, try backups if needed and start RPS when all set.
function NetWorkCheck() {
    client.database.getDiscussions("created", { limit: 1 }).then(function (result) {
        RPS();
    }, function (error) {
        if (error.message.toLowerCase().includes("network") && failCount < 3) {
            /// Try again with second server.
            if (failCount === 0) {
                client = new Client(secondServer, { timeout: 3000 });
            }

            /// Try again with third server.
            else if (failCount === 1) {
                client = new Client(thirdServer, { timeout: 4000 });
            }

            /// Try again with fourth server.
            else if (failCount === 2) {
                client = new Client(fourthServer, { timeout: 6000 });
            }

            NetWorkCheck();

            failCount++;
        }
    });
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// WEBSITE FUNCTIONALITY
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function RPS() {
    var userToChallenge;        /// Steemit.com user name 
    var reasonForChallenge;     /// Pick a reason and different type of messages will be posted.
    var blogs;                  /// Store blogs fetched.
    var comments;               /// Store comments fetched.
    var countPosts = 0;         /// Track how many posts userToChallenge has done within 7 days.
    var userName;               /// Steemit.com user name for the one sending the challenge.
    var rpsChoice;              /// The RPS choice a user makes.
    var permLink;               /// The perm_link to the post on steemit.com
    var permLinkParent;
    var challengeString = "";   /// The body of the post to be published on steemit.com
    var formInUse;              /// Holds the ID of the challenge or response form.
    var rpsChoiceMD5;           /// MD5 sum of rpsChoice.
    var readyToSubmit = false;
    var winner;
    var actualResponse = "";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// GENERAL HELPERS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Check URL for any get values. Code from http://www.jquerybyexample.net/2012/06/get-url-parameters-using-jquery.html
    function GetURLParameter(param) {
        var pageURL = decodeURIComponent(window.location.search.substring(1)),
            urlVariables = pageURL.split('&'),
            paramName,
            i;

        for (i = 0; i < urlVariables.length; i++) {
            paramName = urlVariables[i].split('=');

            if (paramName[0] === param) {
                return paramName[1] === undefined ? true : paramName[1];
            }
        }
    };

    ///Wrapper to shorten dompurify sanitize of strings.
    function Sanitize(stringToSanitize) {
        return DOMPurify.sanitize(stringToSanitize, { SAFE_FOR_JQUERY: true });
    }

    ///On start, make sure form is clean, visible and next buttons disabled
    $(document).ready(function () {

        // If returning from Steem Connect, show a message about submission and link to it.
        if (GetURLParameter("scredir")) {
            userName = Sanitize(GetURLParameter("account"));

            $("#rpsForm").remove();
            $("#question1").remove();
            $("#submit").remove();
            $("#rpsFormResponse").css("visibility", "visible");
            $("#rpsPreviewTitle").html(`<b>Post submitted! See it on <a href="https://steemit.com/@${userName}/comments">Steemit.com</a>.</b>`);
            return;
        }

        /// Check if to show challenge or response form.
        if (userToChallenge = GetURLParameter("challenger")) {

            formInUse = "#rpsFormResponse";

            /// Get URL params
            userToChallenge = Sanitize(userToChallenge); ///Challenger is userToChallenge in response!
            permLink = Sanitize(GetURLParameter("permlink"));

            GetBlogPosts().then(function (discussions) {
                discussions.forEach(element => {
                    if (element.permlink === permLink) {
                        PrepareResponseForm(
                            Sanitize(JSON.parse(element.json_metadata).challenged),
                            Sanitize(JSON.parse(element.json_metadata).challenge_type),
                            Sanitize(JSON.parse(element.json_metadata).challenger_rpschoicemd5)
                        );
                    }
                });

                GetComments().then(function (discussions) {
                    discussions.forEach(element => {
                        if (element.permlink === permLink) {
                            PrepareResponseForm(
                                Sanitize(JSON.parse(element.json_metadata).challenged),
                                Sanitize(JSON.parse(element.json_metadata).challenge_type),
                                Sanitize(JSON.parse(element.json_metadata).challenger_rpschoicemd5)
                            );
                        }
                    });

                    GetCommentsForUserName().then(function (discussions) {
                        discussions.forEach(element => {
                            if (element.parent_permlink === permLink) {
                                userName = "";
                                userToChallenge = "";
                                rpsChoiceMD5 = "";
                                rpsChoice = "";
                                reasonForChallenge = "";
                                permLink = "";

                                window.location.replace("https://spelmakare.se/steem/rps");
                            }
                        });

                    }, function (error) {
                        console.error("GetCommentsForUserName Failed: " + error);
                    });

                }, function (error) {
                    console.error("GetComments Failed: " + error);
                });

            }, function (error) {
                console.error("GetBlogPosts Failed: " + error);
            });
        }
        else {
            formInUse = "#rpsForm";
            $("#rpsFormResponse").remove();
            ReadyForm();
        }
    });

    function PrepareResponseForm(challenged, challenge_type, challenger_rpschoicemd5) {
        /// Get name of challenged and update first question.
        userName = challenged;  ///Challenged is userName in response!
        reasonForChallenge = challenge_type;
        rpsChoiceMD5 = challenger_rpschoicemd5;

        $("#rpsForm").remove();
        $("#injectChallenger").html(`${userName}!`);

        ReadyForm();
    }

    function ReadyForm() {
        $(formInUse)[0].reset();
        $(formInUse).css("visibility", "visible");
        $(".inputNext").prop("disabled", true);
        $("#rpsPreviewTitle").hide();
        $("#rpsPreview").hide();
        $("#submit").hide();
        $("input[name = rpsChallengeChoice]").attr('disabled', true);

        /// Hide all questions
        for (i = 2; i < 9; i++) {
            $("#question" + i).hide();
        }

        /// Add helper text to first page.
        if (formInUse === "#rpsForm") {
            $("#helperText").html(`How it works: You challenge a user and at the same time make your choice of Raid, Ponzi or Steemit. A preview is shown and you can publish the challenge to Steemit. If user responds, user picks his/her choice and the winner will be shown.`);
        }
        else {
            $("#helperText").html(`How it works: Challenger already made his/her choice. You make yours, a preview is shown and you can publish the response to Steemit.`);
        }
    }

    /// Set next button active after text input select.
    $(document).on("click", "#userToChallenge", function () {
        $("#inputNext1").prop("disabled", false);
    });
    $(document).on("click", "#userName", function () {
        $("#inputNext2").prop("disabled", false);
    });

    /// If user fills in something incorrect, step back the form for a refill.
    function StepBackForm(from, to) {
        $("#question" + from).hide();
        $("#question" + to).fadeIn(300);

        $(formInUse)[0].reset();
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// MODIFYING USER FORM
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Show next question when done with current.
    $(document).on("change", ".question", function (event) {

        /// This to remove the onscreen keyboard on mobile/pads when not needed.
        if (document.activeElement) {
            document.activeElement.blur();
        }

        /// Get current question from parent tag.
        var currentQuestion = $("#" + event.target.id).parent().prop("id");

        /// Check if current question is set, else look in parent of parent.
        if (!currentQuestion.includes("question")) currentQuestion = $("#" + event.target.id).parent().parent().prop("id");

        /// Get the current question nr and increase it with 1.
        var currentQuestionNr = currentQuestion.slice(-1);
        var nextQuestion = "#question" + ++currentQuestionNr;

        /// Fetch form values and update vars and pending json.
        GetFormValProcessAndUpdate(currentQuestionNr - 1);

        $("#" + currentQuestion).fadeOut(100);
        $(nextQuestion).delay(200).fadeIn(300);

        /// Always scroll window to top, when fecthing posts you can end up far down.
        window.scrollTo(0, 0);
    });

    /// For each step update the body string and get variables.
    function GetFormValProcessAndUpdate(currentQuestionNr) {

        /// Process challenge form.
        if (formInUse === "#rpsForm") {
            switch (currentQuestionNr) {
                case 1:
                    $("#helperText").hide();

                    userToChallenge = CreateUserName("#userToChallenge");

                    /// Check if account exists and start challenge with users name.
                    GetAccount(userToChallenge).then(function (accounts) {

                        /// Account incorrect (not following steemit guidlines), go back.
                        if (accounts.length <= 0) {
                            StepBackForm(2, 1);
                        }

                        else {
                            challengeString += `<a href="https://steemit.com/@${userToChallenge}">@${userToChallenge}</a>, `;
                            GetPosts(); /// Fecth posts from the user to challenge, have them ready for later.
                        }

                        /// Account not found, go back.  
                    }, function (error) {
                        StepBackForm(2, 1);
                    });

                    break;
                case 2:
                    reasonForChallenge = Sanitize($("input[name=rpsChallengeChoice]:checked", formInUse).val());
                    break;
                case 3:
                    /// Create the perm_link for this challenge. Appending in last question.
                    permLinkParent = Sanitize($("input[name=rpsCUTopic]:checked", formInUse).val());
                    permLink = "smjnrps-";
                    permLink += permLinkParent;
                    var linkDate = Date.now().toString();
                    permLink += "-" + linkDate.substr(linkDate.length - 3);
                    break;
                case 4:
                    rpsChoice = Sanitize($("input[name=rpsChoice]:checked", formInUse).val());
                    break;
                case 5:
                    userName = CreateUserName("#userName");

                    GetAccount(userName).then(function (accounts) {

                        /// Account incorrect (not following steemit guidlines), go back.
                        if (accounts.length <= 0) {
                            StepBackForm(5, 5);
                        }

                        /// Verfied account
                        else {
                            MakeMD5("create", userName, permLink, rpsChoice).then(function (result) {
                                rpsChoiceMD5 = Sanitize(JSON.parse(result).md5);
                                AllOKAllowSubmit();

                            }, function (error) {
                                ///TODO
                                console.log(error)
                            });
                        }

                        /// Account failed as no such user.
                    }, function (error) {
                        StepBackForm(5, 5);
                        console.log("User name not found.");
                    });
                    break;
            }
        }

        // Process response form
        else {
            switch (currentQuestionNr) {
                case 1:
                    $("#helperText").hide();

                    rpsChoice = Sanitize($("input[name=rpsChoice]:checked", formInUse).val());

                    MakeMD5("verify", userToChallenge, permLink, "", rpsChoiceMD5).then(function (result) {
                        var rpsChoiceChallenger = Sanitize(JSON.parse(result).rpschoice);

                        WinnerWinnerRaidPonziOrSteemitDinner(rpsChoiceChallenger, rpsChoice);

                        challengeString += `<a href="https://steemit.com/@${userToChallenge}">@${userToChallenge}</a>, I accept. Let's go! Winner Winner Raid Ponzi or Steemit Dinner! <b>${userToChallenge}</b> throws ...`;

                        if (winner != "draw") actualResponse = `<a href="https://steemit.com/@${userToChallenge}">@${userToChallenge}</a>, I accept. Let's go! Winner Winner Raid Ponzi or Steemit Dinner?! <b>${userToChallenge}</b> throws <b>${rpsChoiceChallenger}</b>, <b>${userName}</b> repels with <b>${rpsChoice}</b>. Winner is <b>${winner}</b>!`;
                        else actualResponse = `<a href="https://steemit.com/@${userToChallenge}">@${userToChallenge}</a>, I accept. Let's go! Winner Winner Raid Ponzi or Steemit Dinner?! <b>${userToChallenge}</b> throws <b>${rpsChoiceChallenger}</b>, ${userName}</b> repels with <b>${rpsChoice}</b>. It's a <b>${winner}</b>!`;

                        permLinkParent = permLink;
                        permLink = "re-";
                        permLink += permLinkParent;

                        AllOKAllowSubmit();
                    }, function (error) {
                        ///TODO
                        console.log(error)
                    });
                    break;
            }
        }
    }

    // Check who won the RPS round
    function WinnerWinnerRaidPonziOrSteemitDinner(rpsChoiceChallenger, rpsChoiceChallenged) {
        var challenger = userToChallenge;
        var challenged = userName;

        if ((rpsChoiceChallenger === "raid" && rpsChoiceChallenged === "raid") ||
            (rpsChoiceChallenger === "ponzi" && rpsChoiceChallenged === "ponzi") ||
            (rpsChoiceChallenger === "steemit" && rpsChoiceChallenged === "steemit")
        ) winner = "draw";

        else if ((rpsChoiceChallenger === "raid" && rpsChoiceChallenged === "steemit") ||
            (rpsChoiceChallenger === "ponzi" && rpsChoiceChallenged === "raid") ||
            (rpsChoiceChallenger === "steemit" && rpsChoiceChallenged === "ponzi")
        ) winner = challenger;

        else if ((rpsChoiceChallenger === "steemit" && rpsChoiceChallenged === "raid") ||
            (rpsChoiceChallenger === "raid" && rpsChoiceChallenged === "ponzi") ||
            (rpsChoiceChallenger === "ponzi" && rpsChoiceChallenged === "steemit")
        ) winner = challenged;
    }

    // Finalize the post body and values.
    function AllOKAllowSubmit() {
        if (formInUse === "#rpsForm") {
            AppendReasonToRequest(reasonForChallenge);

            challengeString += `Do you <a href="https://spelmakare.se/steem/rps?challenger=${userName}&permlink=${permLink}">accept?</a>`;

            jsonChallenge.author = userName;
            jsonChallenge.permlink = permLink;
            jsonChallenge.parent_author = userToChallenge;
            jsonChallenge.parent_permlink = permLinkParent;
            jsonChallenge.body = encodeURIComponent(challengeString);
            jsonChallenge.json_metadata.challenged = userToChallenge;
            jsonChallenge.json_metadata.challenge_type = reasonForChallenge;
            jsonChallenge.json_metadata.challenger_rpschoicemd5 = rpsChoiceMD5;
        }
        else {
            jsonResponse.author = userName;
            jsonResponse.permlink = permLink;
            jsonResponse.parent_author = userToChallenge;
            jsonResponse.parent_permlink = permLinkParent;
            jsonResponse.body = encodeURIComponent(actualResponse);
            jsonChallenge.json_metadata.challenger = userToChallenge;   ///Challenger is userToChallenge in response!
            jsonChallenge.json_metadata.result = winner;
        }

        $("#question6").delay(200).fadeIn(300);
        $("#rpsPreviewTitle").delay(200).fadeIn(300);
        $("#rpsPreview").delay(200).fadeIn(300);
        $("#submit").delay(200).fadeIn(300);
        $("#rpsPreview").html(challengeString);

        readyToSubmit = true;
    }

    /// Different body messages depending on reason for challenge.
    function AppendReasonToRequest(reasonForChallenge) {
        if (reasonForChallenge === "rpsChallenge1") {
            challengeString += `let's play a round of <a href="https://spelmakare.se/steem/rps?challenger=${userName}&permlink=${permLink}">Raid Ponzi Steemit</a>. `;
        }
        else if (reasonForChallenge === "rpsChallenge2") {
            challengeString += `I don't agree. I hereby challenge you to a round of <a href="https://spelmakare.se/steem/rps?challenger=${userName}&permlink=${permLink}">Raid Ponzi Steemit</a>. If I win you are wrong. `;
        }
        else if (reasonForChallenge === "rpsChallenge3") {
            challengeString += `that is interesting. Let's have a round of <a href="https://spelmakare.se/steem/rps?challenger=${userName}&permlink=${permLink}">Raid Ponzi Steemit</a> before discussing further. `;
        }
    }

    /// Get blog and comments made by user to challenge.
    function GetPosts() {

        /// Fetch any blog posts.
        GetBlogPosts().then(function (discussions) {
            blogs = discussions;

            $("input[name = rpsChallengeChoice]").attr('disabled', false);

        }, function (error) {
            console.error("Get Blog Failed: " + error);
        });

        /// Fetch any comments.
        GetComments().then(function (discussions) {
            comments = discussions;

            $("input[name = rpsChallengeChoice]").attr('disabled', false);

        }, function (error) {
            console.error("Get Comments Failed: " + error);
        });
    }

    /// Create radio buttons with topics from user to be challenged.
    $(document).on("click", "#rpsChallengeChoice", function (event) {

        /// Update text with user name of challenged.
        $("#userInject").html(`Please select the post made by ${userToChallenge} that made you want this.`);

        /// Add blog posts. User and date verified in MakeRadioButton.
        if (blogs != undefined) blogs.forEach(element => {
            MakeRadioButton(element, "Blog");
        });

        /// Add comments. User and date verified in MakeRadioButton.
        if (comments != undefined) comments.forEach(element => {
            MakeRadioButton(element, "Comment");
        });

        /// No posts found newer than 7 days, go back to start.
        if (countPosts === 0) {
            StepBackForm(3, 1);
        }

    });

    /// Create radio buttons.
    function MakeRadioButton(element, postType) {

        /// Calculate how long since post was made.
        var daysSincePost = parseFloat((Date.now() - Date.parse(element.last_update)) / 1000 / 60 / 60 / 24);

        /// If author correct and post younger than 7 days add it to list.
        if (element.author === userToChallenge && daysSincePost < 7) {
            var date = element.last_update.substring(0, 10);
            var title;

            /// For blog use title, for comment use part of body.
            if (postType === "Blog") title = element.title.substring(0, 64);
            else title = element.body.substring(0, 64);

            /// Create a choice for each topic.
            $("#rpsCUTopicChoice").append(`<input type="radio" id="rpsCUTopic" name="rpsCUTopic" 
                value="${element.permlink}"><span class="radioText"> ${date}, ${postType}: ${title}</span><br />`);

            console.log(element);

            countPosts++;
        }
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// FORM SUBMISSION
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Check steem and update website on form submission.
    $(document).on("submit", formInUse, function (event) {
        event.preventDefault();

        if (!readyToSubmit) return;

        var url = "https://steemconnect.com/sign/comment?";

        if (formInUse === "#rpsForm") {
            var metaAsString = encodeURIComponent(JSON.stringify(jsonChallenge.json_metadata));
            jsonChallenge.json_metadata = metaAsString;

            var redirURL = encodeURIComponent("?scredir=true&account=" + jsonChallenge.author);

            url += `parent_author=${jsonChallenge.parent_author}&parent_permlink=${jsonChallenge.parent_permlink}&author=${jsonChallenge.author}&permlink=${jsonChallenge.permlink}&body=${jsonChallenge.body}&json_metadata=${jsonChallenge.json_metadata}&redirect_uri=${encodeURIComponent(window.location.href)}${redirURL}`;
        }
        else {
            var metaAsString = encodeURIComponent(JSON.stringify(jsonResponse.json_metadata));
            jsonResponse.json_metadata = metaAsString;

            var redirURL = encodeURIComponent("?scredir=true&account=" + jsonResponse.author);

            url += `parent_author=${jsonResponse.parent_author}&parent_permlink=${jsonResponse.parent_permlink}&author=${jsonResponse.author}&permlink=${jsonResponse.permlink}&body=${jsonResponse.body}&json_metadata=${jsonResponse.json_metadata}&redirect_uri=${encodeURIComponent(window.location.href)}${redirURL}`;
        }

        // Redirect to Steem Connect for safe posting.
        window.location.replace(url);

        readyToSubmit = false;
        $("#submit").prop("disabled", true);
    });


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// USER NAME FUNCTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Get input from a user name field and make sure it is only the name, not @ or URL
    function CreateUserName(divID) {
        var name = Sanitize($(`${divID}`).val());
        name = name.toLowerCase();

        if (name.match(/^(https?:\/\/)?[a-z0-9]+\./ig) || name.match(/^@/ig)) {
            name = name.match(/@[a-z0-9-]{3,16}[^\/]/ig)[0].substring(1);
        }

        return name;
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// ACCOUNT FUNCTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Try to get account.
    function GetAccount(name) {
        return client.database.getAccounts([name]);
    }


    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    /// GETTING POSTS FROM STEEMIT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /// Blog posts
    function GetBlogPosts() {
        return client.database.getDiscussions("blog", { tag: userToChallenge, limit: 100 });
    }

    /// Comments
    function GetComments() {
        return client.database.getDiscussions("comments", { start_author: userToChallenge, limit: 100 });
    }

    function GetCommentsForUserName() {
        return client.database.getDiscussions("comments", { start_author: userName, limit: 100 });
    }
}
