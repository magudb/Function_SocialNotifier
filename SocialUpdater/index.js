// Please visit http://go.microsoft.com/fwlink/?LinkID=761099&clcid=0x409 for more information on settting up Github Webhooks
var Bitly = require('bitly');
var bitly = new Bitly(process.env.bitly_token);
var request = require('superagent-bluebird-promise');
const key = process.env.iftt_key;
let postToIFTT = (eventName, value1, value2, value3) => {
    const url = `https://maker.ifttt.com/trigger/${eventName}/with/key/${key}`
    return request
        .post(url)
        .send({ "value1": value1, "value2": value2, "value3": value3 });
}


let facebookUpdate = (message, blogurl) => {
    const eventName = "new link post facebook"
    return postToIFTT(eventName, message, blogurl, "");

};

let tweet = (message, blogurl) => {
    const eventName = "new link post twitter"
    return postToIFTT(eventName, message, blogurl, "");

};

let lindkedined = (message, blogurl) => {
    const eventName = "new link post linkedin"
    return postToIFTT(eventName, message, blogurl, "");

};
let buildMessage = (commit) => {
    if (!commit) {
        return;
    }
    return new Promise((resolved, rejected) => {
        let file = commit.added.filter(file => file.endsWith(".md"))[0];

        if (!file) {
            resolved({
                errors: "No file - " + JSON.stringify(commit.added)
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
        context.log(commit);
        if (!commit.message.startsWith("New post:")) {
            return;
        }
        return buildMessage(commit);
    });

    Promise.all(notifications).then(values => {
        values.forEach((model) => {
            if (!model.shortUrl || model.errors) {
                context.log("model is no valid", model);
                return;
            }
            var message = `${model.message} ${model.shortUrl}`;
            context.log("tweeting", message);
            var tweeted = tweet(model.message, model.shortUrl);
            context.log("facebooking", message);
            var facebooked = facebookUpdate(model.message, model.shortUrl);
             context.log("linkedined", message);
            var linked = lindkedined(model.message, model.shortUrl);

            Promise.all([tweeted, facebooked, linked])
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