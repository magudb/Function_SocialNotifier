// Please visit http://go.microsoft.com/fwlink/?LinkID=761099&clcid=0x409 for more information on settting up Github Webhooks
var Bitly = require('bitly');
var bitly = new Bitly(process.env.bitly_token);
var Twitter = require('twitter');
var client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

module.exports = function (context, data) {
    context.log('GitHub Webhook triggered!');
    var notifications = data.commits.map(commit => {
        if (!commit.message.startsWith("New post:")) {
            return;
        }
        return new Promise((resolved, rejected) => {
            let file = commit.added.filter(file => file.endsWith(".md"))[0];
            let filearray = file.match(/(\d{4})-(\d{2})-(\d{2})-(.*).md/i);
            let year = filearray[1];
            let month = filearray[2];
            let day = filearray[3]
            let title = filearray[4];
            var urlpath = title.replace(/\s/g, "-");
            urlpath = urlpath.replace(/\W/g, "");
            let message = commit.message.match(/New post: (.*)/i)[1]

            var model = {
                url: `https://udbjorg.net/${year}/${urlpath}`,
                message: message
            };

            bitly.shorten('https://github.com/tanepiper/node-bitly')
                .then(function (response) {
                    model.shortUrl = response.data.url;
                    context.log(model);
                    resolved(model)
                }, function (error) {
                    rejected(error);
                });
        });
    });

    Promise.all(notifications).then(values => {
        context.log(values);
        context.res = { body: 'New GitHub comment: ' };
        context.done();
    });


};