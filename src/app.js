import { RTMClient } from '@slack/rtm-api'
import { BOT_CHANNEL, BOT_OAUTH_TOKEN, INTRO_MESSAGE, GROUP_SIZE } from './values'
import { WebClient } from '@slack/web-api'
import { DH_CHECK_P_NOT_PRIME } from 'constants';
const packageJson = require('../package.json');

const rtm = new RTMClient(BOT_OAUTH_TOKEN);
const web = new WebClient(BOT_OAUTH_TOKEN);
let userMap = new Map()
let beeFriends = {
	hasInitialized: false,
	currentChannel: BOT_CHANNEL, 
	userEntryMessage: undefined,
	lastBotMessage: undefined,
	openGroups: [],
	debug: {
		logEvents: false,
		logReactions: true,
		logMapActions: true,
		logGroupActions: true
	}
};

Array.prototype.except = function (value) {
	return (this.filter(function(x) { return (x !== value); }));
}

function getRandomItem(list) {
	let index = ~~(list.length * Math.random());
	let item = list[index];
	list.splice(index, 1);
	return (item);
}
rtm.start()
	.catch(console.error);

rtm.on('ready', async () => {
	console.log(`BeeFriends ${packageJson.version} running!`);
});

rtm.on('slack_event', async (eventType, event) => {
	if (beeFriends.debug.logEvents)
		console.log(event);
	if (event && (event.type == 'reaction_added' || event.type == 'reaction_removed'))
		onReaction(event);
	if (event && event.type == 'message')
		onMessage(event);
	checkDate();
});

async function checkDate() {
	let date = new Date();

	if (date.getDay() == 1 && date.getHours() == 8 && date.getMinutes() == 42)
		bfGetPairs();
}

async function bfInitialize(event) {
	if (beeFriends.hasInitialized == false)
	{
		beeFriends.currentChannel = event.channel;
		await sendMessage(beeFriends.currentChannel, `|| BeeFriends ${packageJson.version} ||`);
		await sendMessage(beeFriends.currentChannel, INTRO_MESSAGE);
		beeFriends.userEntryMessage = beeFriends.lastBotMessage.ts;
		beeFriends.hasInitialized = true;
		console.log(`Initalized succesfully! Monitoring messageID: ${beeFriends.userEntryMessage}`);
	}
	else
		sendMessage(beeFriends.currentChannel, "Already initialized!");
}

async function bfHelp(event)
{
	let message = `[!bf-init] --Initialize the bot on the current channel, bot has to be added to the channel before you can initialize it.\n[!bf-pair] --Force pair users manually\n[!bf-list] --Print the table of currently subscribed users.\nMore functionality might be added on request :)`;
	sendMessage(event.channel, message);
}

async function bfPrintList() {
	if (beeFriends.hasInitialized == false)
	{
		sendMessage(beeFriends.currentChannel, "BeeFriends needs to be initialized first! Use '!bf-init' inside the channel you want to initialize in.");
		return ;
	}	
	if (userMap.size == 0)
		sendMessage(beeFriends.currentChannel, 'No entries in user table!')
	else
	{
		let message = '';
		userMap.forEach((value, key) => {
			message = message + `UserID: ${key}, PairID: ${value}` + '\n';
		});
		sendMessage(beeFriends.currentChannel, message);
	}
}

async function bfGetPairs() {
	let userArray = Array.from(userMap.keys());

	if (userArray.length < GROUP_SIZE)
	{
		console.log('Group forming failed: Not enough participants.')
		return ;
	}
	await addPairs(userArray);
	for (let groups of beeFriends.openGroups)
		sendMessage(groups.channel.id, "Hello! Feel free to connect here with your fellow Hivers, and remember to BeeFriends!")
}

async function addPairs(userArray) {
	let item; 
	let group;

	if (userArray.length % GROUP_SIZE != 0)
	{
		group = [];
		for (let n = 0; n < GROUP_SIZE + 1; n++)
		{
			item = getRandomItem(userArray);
			group.push(item);
		}	
		if (beeFriends.debug.logGroupActions)
			console.log(`Got group: ${group}`)
		await pairUsers(group);
	}
	while (userArray.length) 
	{
		group = [];
		for (let n = 0; n < GROUP_SIZE; n++)
		{
			item = getRandomItem(userArray);
			group.push(item);
		}
		if (beeFriends.debug.logGroupActions)
			console.log(`Got group: ${group}`)
		await pairUsers(group);
	}
}

async function pairUsers(users) {
	for (let user of users)
		if (users.except(user).size)
			userSet(user, users.except(user));
	await createGroup(users);
}

async function onMessage(event) {
	if (event.text == '!bf-list')
		bfPrintList();
	else if (event.text == '!bf-init')
		bfInitialize(event);
	else if (event.text == '!bf-help')
		bfHelp(event);
	else if (event.text == '!bf-pair')
		bfGetPairs();
}

async function onReaction(event) {
	if (beeFriends.hasInitialized == false || event.item.ts != beeFriends.userEntryMessage)
		return ;
	if (event.type == 'reaction_added' && event.reaction == 'bee')
	{
		if (beeFriends.debug.logReactions)
			console.log(`Got reaction from '${event.user}'.`);	
		userAdd(event.user);
	}	
	else if (event.type == 'reaction_removed' && event.reaction == 'bee')
	{
		if (beeFriends.debug.logReactions)
			console.log(`Reaction removed by '${event.user}'.`);
		userRemove(event.user);
	}	
}

async function sendMessage(channel, message) {
	beeFriends.lastBotMessage = await web.chat.postMessage({
		channel: channel,
		text: message,
	});
}

async function userSet(userId, value) {
	if (userMap.get(userId) != undefined)
	{
		if (beeFriends.debug.logMapActions)
			console.log(`Value '${value}' added for '${userId}'.`)
		userMap.set(userId, value);
	}
}

async function userAdd(userId) {
	if (userMap.get(userId) == undefined)
	{
		if (beeFriends.debug.logMapActions)
			console.log(`User '${userId}' added.`)
		userMap.set(userId, "No pair defined");
	}
}

async function userRemove(userId) {
	if (userMap.get(userId) != undefined)
	{
		userMap.delete(userId);
		if (beeFriends.debug.logMapActions)
			console.log(`User '${userId}' removed.`)
	}
}

async function createGroup(users) {
	let userList = '';
	let group;

	for (let i = 0; i < users.length; i++)
	{
		userList += users[i];
		if (i < users.size - 1)
			userList += ',';
	}
	group = await web.conversations.open({
		users: userList
	});
	if (beeFriends.debug.logGroupActions)
	{
		console.log(`Group object for group: [${userList}]`)
		console.log(group)
	}
	beeFriends.openGroups.push(group);
}
