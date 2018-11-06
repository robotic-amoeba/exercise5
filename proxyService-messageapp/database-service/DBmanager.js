const DBservice = require("./DBservice");

const config1 = {
  DBurl: "mongodb://localhost:27018/messagingCabify",
  accountID: "token1",
  messagePrice: 1,
  initialCredit: 5,
  isMainDB: true
};
const config2 = {
  DBurl: "mongodb://localhost:27019/messagingCabifyBackup",
  accountID: "token2",
  messagePrice: 1,
  initialCredit: 5,
  isMainDB: false
};
let DBmain;
let DBsecondary;

const initiateDBnodes = () => {
  DBmain = new DBservice(config1);
  DBsecondary = new DBservice(config2);
};

const handleDisconnection = (isMainDB, DB_id) => {
  if (isMainDB) {
    changeMainDB(DB_id);
  }
};

const changeMainDB = DB_id => {
  if (DB_id === "token1") {
    myDBservice = new DBservice(config2);
    myDBbackup = new DBservice(config1);
  } else {
    myDBbackup = new DBservice(config2);
    myDBservice = new DBservice(config1);
  }
};

const myDBservice = () => DBmain;
const myDBbackup = () => DBsecondary;
const DB = { myDBservice, myDBbackup, initiateDBnodes, handleDisconnection };

module.exports = DB;
