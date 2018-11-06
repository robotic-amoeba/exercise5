const DBservice = require("./DBservice");

const config1 = {
  DBurl: "mongodb://localhost:27018/messagingCabify",
  accountID: "token1",
  messagePrice: 1,
  initialCredit: 5
};
const config2 = {
  DBurl: "mongodb://localhost:27019/messagingCabifyBackup",
  accountID: "token2",
  messagePrice: 1,
  initialCredit: 5
};
let DBmain;
let DBsecondary;

const initiateDBnodes = () => {
  DBmain = new DBservice(config1);
  DBsecondary = new DBservice(config2);
};

function handleDisconnection() {
  //is main DB
  changeMainDB();
  //is not main
  //return
}

function changeMainDB() {
  myDBservice = new DBservice(config2);
  myDBbackup = new DBservice(config1);
}

const myDBservice = () => DBmain;
const myDBbackup = () => DBsecondary;
const DB = { myDBservice, myDBbackup, initiateDBnodes };

module.exports = DB;
