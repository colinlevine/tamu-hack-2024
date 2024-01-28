const express = require("express");
const app = express();
const server = require("http").Server(app);
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require("openai");
const session = require('express-session');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');

// const port = 3000;
const port = process.env.PORT || 3000;
//let userInput={};
//let messages = [];

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


// Replace 'your_mongodb_uri' with your actual MongoDB URI
const mongoDbUri = 'Mongo uri goes here';
mongoose.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(session({
    secret: 'Session key goes here',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: mongoDbUri })
}));

app.get("/", (req, res) => {
    req.session.userInput = {}; // Initialize userInput in the session
    req.session.messages = []; // Initialize messages in the session
    res.render('index', {});
});


app.get('/new-row', (req, res) => {
    res.send(`
        <div class="row mb-3">
            <div class="col">
                <input class="form-control" type="text" name="topic[]" placeholder="Topic">
            </div>
            <div class="col">
                <input class="form-control" type="text" name="description[]" placeholder="Description">
            </div>
        </div>
    `);
});




app.post("/submit-form", (req, res) => {

    console.log(req.body);

    if (!req.session.userInput) {
        req.session.userInput = {};
    }

    for (let i = 0; i < (req.body.topic).length; i++) {
        req.session.userInput[req.body.topic[i]] = req.body.description[i];
    }
//adds to user input
    
    console.log(req.session.userInput);

    let isEmptyInput = true;
    for (const key in req.session.userInput) {
        if (req.session.userInput[key].trim() !== "") {
            isEmptyInput = false;
            break;
        }
    }

    if (isEmptyInput) {
        res.send('<p id="save-first">You must input content first</p>');
    } else {

        const submissionID = uuidv4();
        const formatDataWithID = { id: submissionID, data: req.body };

    
        // append data to a file
        fs.appendFile('submissions.log', JSON.stringify(formatDataWithID) + '\n', err => {
            if (err) throw err;
            console.log('data saved with id:', submissionID);
        });

        res.send(`<p>Your UUID is <span style="font-weight:700">${submissionID}</span>. Use this to save your flashcards.</p>`)
    }
});

app.post("/retrieve-data", (req, res) => {

    console.log(req.body);
    const requestedUuid = req.body.uuid;

    // Read the file containing the submissions
    fs.readFile('submissions.log', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.send(`Could not find UUID`)
            return res.status(500).send('Error reading file');
        }

        // Parse each line as JSON and find the matching UUID
        let submissions = {};
        try {
            submissions = data.trim().split('\n').map(line => JSON.parse(line));
        } catch (error) {
            console.error(err);
            res.send(`Could not find UUID`)
            return res.status(500).send('Error reading file');

        }

        const matchingSubmission = submissions.find(sub => sub.id === requestedUuid);

        console.log(matchingSubmission);

        if (matchingSubmission) {
            // Send back the matching data
            let htmlContent = "";
            for (let i = 0; i < (matchingSubmission.data.topic).length; i++) {

                let topic = matchingSubmission.data.topic[i];
                let description = matchingSubmission.data.description[i];
                if (topic && description) {
                    htmlContent += `
                        <div class="row mb-3">
                            <div class="col">
                                <input class="form-control" type="text" name="topic[]" placeholder="Topic" value="${topic}">
                            </div>
                            <div class="col">
                                <input class="form-control" type="text" name="description[]" placeholder="Description" value ="${description}">
                            </div>
                        </div>`

                }
            }
            res.send(htmlContent);
        } else {
            res.send(`<p class="UUID-error">No data found for UUID: ${requestedUuid} </p>`);
        }
    });
});


app.post('/chat-message', (req, res) => {

    if (req.body.message != "") {
        async function main() {
            const openai = new OpenAI({
            apiKey: "API key goes here",
            });
            const message = req.body.message; // Get the message from the request
            // Add message to the messages array
            req.session.messages.push({ role: "user", content: message });

            const chatCompletion = await openai.chat.completions.create({
                messages: req.session.messages,
                model: "gpt-3.5-turbo-1106",
            });

            const generatedText = chatCompletion.choices[0].message.content;

            // Add the assistant's response to the messages array
            req.session.messages.push({ role: "assistant", content: generatedText });

            console.log(generatedText);
            let htmlOutput = `
                <div class="chat-mess">
                    <p class="role">User<p>
                    <p class="message">${req.body.message}</p>
                </div>
                <div class="chat-mess">
                    <p class="role">GPT<p>
                    <p class="message">${generatedText}</p>
                </div>`
            res.send(htmlOutput);
        }
        
        main().catch((error) => {
          console.error(error);
        });
    }
});

app.post('/gpt', (req, res) => {
    
    console.log(req.session.userInput);

    if (req.session.userInput == null || (Object.keys(req.session.userInput).length === 0 && req.session.userInput.constructor === Object)) {
        res.send('<p id="save-first">Save your work before chatting with GPT.</p>')
    }
    else {
        async function main() {
          const openai = new OpenAI({
            apiKey: "API key goes here",
          });
        
          // Add the assistant's instructions to the messages array
        const assistantInstructions = `Your name is Recall GPT, your goal is to assist the user in studying via active recall. Your job is to prompt the user to explain the topic and check to see if their input has the same meaning as the provided description. If the meaning is not the same, then guide the user in the right path and give them another chance to explain the topic. You will be given the input data in JSON format in the form "topic": "description". You should start with the first topic and work your way through the list, each time, prompting the user. When you have completed all tasks, thank the user.`;
        req.session.messages.push({ role: "assistant", content: assistantInstructions });

        // Add the user's input to the messages array
        req.session.messages.push({ role: "user", content: JSON.stringify(req.session.userInput) });

        const chatCompletion = await openai.chat.completions.create({
            messages: req.session.messages,
            model: "gpt-3.5-turbo-1106",
        });

        const generatedText = chatCompletion.choices[0].message.content;

        // Add the assistant's response to the messages array
        req.session.messages.push({ role: "assistant", content: generatedText });

        console.log(generatedText);
        res.send(`
            <div class="chat-mess">
                <p class="role">GPT<p>
                <p class="message">${generatedText}</p>
            </div>`);
        }
        
        main().catch((error) => {
          console.error(error);
        });



    }
});




server.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
