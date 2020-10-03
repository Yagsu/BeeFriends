### Usage 
- Clone this repository
- Create a classic Slack app at https://api.slack.com/apps?new_classic_app=1
- Click *Bots*, then *Add Legacy Bot User*
- Go to *OAuth & Permissions* on the sidebar and click *Install App to Workspace*
- Copy the *Bot User OAuth Access Token* and paste it into *BOT_OAUTH_TOKEN* in src/values.js
- Open a terminal in the repository folder and run:
```
npm install
node src/index.js
```
- Connect the bot to the channel specified in src/values.js and you're good to go.

### Commands:
```!bf-list```
```!bf-init```
```!bf-help```
```!bf-pair```