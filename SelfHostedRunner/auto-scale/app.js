// These are the dependencies for this file.
//
// You installed the `dotenv` and `octokit` modules earlier. The `@octokit/webhooks` is a dependency of the `octokit` module, so you don't need to install it separately. The `fs` and `http` dependencies are built-in Node.js modules.
import dotenv from "dotenv";
import {App} from "octokit";
import {createNodeMiddleware} from "@octokit/webhooks";
import fs from "fs";
import http from "http";
import { exec } from 'child_process';

// This reads your `.env` file and adds the variables from that file to the `process.env` object in Node.js.
dotenv.config();

// This assigns the values of your environment variables to local variables.
const appId = process.env.APP_ID;
const webhookSecret = process.env.WEBHOOK_SECRET;
const privateKeyPath = process.env.PRIVATE_KEY_PATH;

// This reads the contents of your private key file.
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// This creates a new instance of the Octokit App class.
const app = new App({
  appId: appId,
  privateKey: privateKey,
  webhooks: {
    secret: webhookSecret
  },
});

// This adds an event handler that your code will call later. 
// When this event handler is called, it will log the event to the console. 
// Then, it will use GitHub's REST API to get a new action runner token.
async function handleNewQueuedJobsRequestOpened({octokit, payload}) {
  console.log(`Received a job ${payload.action} event for #${payload.workflow_job.id} on ${payload.repository.full_name}`);

  try {
    if (payload.action === 'queued') {
      const response = await octokit.request('POST /repos/{owner}/{repo}/actions/runners/registration-token', {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      // Access the token from the response
      const token = response.data.token;
      const runner_name = `Runner_${payload.workflow_job.id}`;

      // run a docker container as a deamon in the background
      exec(`docker run -d --rm -e RUNNER_NAME=${runner_name} -e TOKEN=${token}  simple-ubuntu-runner`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });

    }
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
};

// This sets up a webhook event listener. 
// When your app receives a webhook event from GitHub with a `X-GitHub-Event` header value of `workflow_job` 
// and an `action` payload value of `queued`, it calls the `handleNewQueuedJobsRequestOpened` event handler that is defined above.
app.webhooks.on("workflow_job.queued", handleNewQueuedJobsRequestOpened);

// This logs any errors that occur.
app.webhooks.onError((error) => {
  if (error.name === "AggregateError") {
    console.error(`Error processing request: ${error.event}`);
  } else {
    console.error(error);
  }
});

// This determines where your server will listen.
//
// For local development, your server will listen to port 3000 on `localhost`. When you deploy your app, you will change these values. For more information, see "[Deploy your app](#deploy-your-app)."
const port = 3000;
const host = 'localhost';
const path = "/api/webhook";
const localWebhookUrl = `http://${host}:${port}${path}`;

// This sets up a middleware function to handle incoming webhook events.
//
// Octokit's `createNodeMiddleware` function takes care of generating this middleware function for you. The resulting middleware function will:
//
//    - Check the signature of the incoming webhook event to make sure that it matches your webhook secret. This verifies that the incoming webhook event is a valid GitHub event.
//    - Parse the webhook event payload and identify the type of event.
//    - Trigger the corresponding webhook event handler.
const middleware = createNodeMiddleware(app.webhooks, {path});

// This creates a Node.js server that listens for incoming HTTP requests (including webhook payloads from GitHub) on the specified port. When the server receives a request, it executes the `middleware` function that you defined earlier. Once the server is running, it logs messages to the console to indicate that it is listening.
http.createServer(middleware).listen(port, () => {
  console.log(`Server is listening for events at: ${localWebhookUrl}`);
  console.log('Press Ctrl + C to quit.')
});
