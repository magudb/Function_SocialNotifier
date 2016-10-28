// Please visit http://go.microsoft.com/fwlink/?LinkID=761099&clcid=0x409 for more information on settting up Github Webhooks
var Bitly = require('bitly');
var bitly = new Bitly(process.env.bitly_token);
var Twitter = require('twitter');
var facebook = require('fb');
var twitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var facebookUpdate = (message) => {
    return new Promise((resolved, rejected) => {
        facebook.api('oauth/access_token', {
            client_id: 'app_id',
            client_secret: process.env.FACEBOOK_SECRET,
            grant_type: process.env.FACEBOOK_APPID
        }, function (res) {
            if (!res || res.error) {
                return rejected(res.error);

            }
            facebook.setAccessToken(res.access_token);

            facebook.api('me/feed', 'post', { message: message }, function (res) {
                if (!res || res.error) {
                    return rejected(res.error);
                }
                return resolved(res.id);
            });

        });
    })
};

var tweet = (message) => {
    return new Promise((resolved, rejected) => {
        twitter.post('statuses/update', { status: message }, function (error, tweet, response) {
            if (error) {
                rejected(rejected)
            }
            resolved(message);
        });

    })

};

var buildMessage = (commit) => {
    if (!commit) {
        return;
    }
    return new Promise((resolved, rejected) => {
        let file = commit.added.filter(file => file.endsWith(".md"))[0];
        
        if (!file) {
            resolved({
                errors : "No file - " + JSON.stringify(commit.added)
            });
        }
        let filearray = file.match(/(\d{4})-(\d{2})-(\d{2})-(.*).md/i);
        let year = filearray[1];
        let title = filearray[4];
        let urlpath = title.replace(/\s/g, "-");
        let message = commit.message.match(/New post: (.*)/i)[1]

        bitly.shorten(`https://udbjorg.net/${year}/${urlpath}`)
            .then(function (response) {
                var model = {
                    shortUrl: response.data.url,
                    message: message
                };
                return resolved(model)
            }, function (error) {
                return rejected(error);
            });
    });
};

module.exports = (context, data) => {
    context.log('GitHub Webhook triggered!');
    var notifications = data.commits.map(commit => {
        context.log(commit.message);
        if (!commit.message.startsWith("New post:")) {
            return;
        }
        return buildMessage(commit);
    });

    Promise.all(notifications).then(values => {
        context.log(values);
        values.forEach((model) => {
            if (!model.shortUrl || model.errors) {
                context.log("model is no valid", model);
                return;
            }
            var message = `${model.message} ${model.shortUrl}`;
            context.log("tweeting", message);
            var tweeted = tweet(message);
            context.log("facebooking", message);
            var facebooked = facebookUpdate(message);

            Promise.all([tweeted, facebooked])
                .then(values => {
                    context.res = { body: 'Updated' };
                    context.done();
                }).catch(values => {
                    context.log(values);
                    context.res = { body: values };
                    context.done();
                });
        })
    })
        .catch(values => {
            context.log(values);
            context.res = { body: values };
            context.done();
        });;
};