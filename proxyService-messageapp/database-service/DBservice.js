const mongoose = require("mongoose");
const debug = require("debug")("debug:DBservice");
const DB = require("./DBmanager");
let retryCount = 5;

class DBservice {
  constructor(config) {
    this.Message;
    this.Account;
    this.messagePrice = config.messagePrice;
    this.creditBalance = config.initialCredit;
    this.accountID = config.accountID;
    this.isMainDB = config.isMainDB;
    this.connection = mongoose
      .createConnection(config.DBurl, { useNewUrlParser: true })
      .then(connection => {
        console.log("Connected to :", connection.name);
        this.Message = require("./models/Message")(connection);
        this.Account = require("./models/Account")(connection);
        connection.on("disconnected", () => {
          debugger;
          DB.handleDisconnection(this.isMainDB, this.accountID);
        });
        this.setInitialBalance(this.accountID);
        return connection;
      })
      .catch(err => {
        console.error("Error connecting to mongo", err);
      });
  }

  createMessageAttempt(message) {
    const { destination, body, messageID, status } = message;
    return this.Message.create({
      destination,
      body,
      messageID,
      status
    })
      .then(data => {
        return true;
      })
      .catch(error => {
        if (retryCount > 0) {
          retryCount -= 1;
          debug(retryCount);
          this.createMessageAttempt(message);
        } else {
          console.log("MONGO Error: ", error);
          retryCount = 5;
          return false;
        }
      });
  }

  updateMessageStatus(messageID, messageStatus) {
    return this.Message.findOneAndUpdate({ messageID }, { status: messageStatus }, { new: true })
      .then(data => {
        debug("updated entry: ", data);
      })
      .catch(e => console.log(e));
  }

  getMessages() {
    return this.Message.find().catch(e => console.log(e));
  }

  setInitialBalance(accountID) {
    return this.Account.findOne({ accountID }).then(wallet => {
      if (wallet) {
        debug("Wallet found in DB: ", wallet);
        return;
      } else {
        return this.Account.create({
          accountID: this.accountID,
          credit: this.creditBalance,
          locked: false
        })
          .then(data => {
            debug("Opened new wallet: ", data);
          })
          .catch(e => console.log(e));
      }
    });
  }

  checkIfEnoughCredit() {
    const accountID = this.accountID;
    return this.Account.findOne({ accountID }).then(wallet => {
      if (wallet.credit >= this.messagePrice) {
        this.creditBalance = wallet.credit;
        debug("Enough credit found: ", wallet.credit);
        return true;
      } else {
        debug("Not enough credit");
        return false;
      }
    });
  }

  chargeMessageInAccount() {
    const accountID = this.accountID;
    const price = this.messagePrice;
    const finalBalance = this.creditBalance - price;
    return this.Account.findOneAndUpdate({ accountID }, { credit: finalBalance })
      .then()
      .catch(e => console.log(e));
  }

  incrementCredit(deposit) {
    const accountID = this.accountID;
    return this.Account.findOneAndUpdate({ accountID }, { locked: true }, { new: true })
      .then(wallet => {
        const oldBalance = wallet.credit;
        const newBalance = oldBalance + deposit;
        this.Account.findOneAndUpdate(
          { accountID },
          { credit: newBalance, locked: false },
          { new: true }
        ).then(newWallet => debug("New balance in account: ", newWallet.credit));
      })
      .catch(e => console.log(e));
  }

  checkAccountLock() {
    const accountID = this.accountID;
    return this.Account.findOneAndUpdate({ accountID }, { locked: true })
      .then(oldAccount => {
        debug("Check if lock: ", oldAccount.locked);
        return oldAccount;
      })
      .catch(e => console.log(e));
  }

  unlockAccount() {
    const accountID = this.accountID;
    return this.Account.findOneAndUpdate({ accountID }, { locked: false })
      .then(() => debug("Unlocked"))
      .catch(e => console.log(e));
  }

  undoCharge(chargeMessage) {
    //chargeMessage contains the old DB object
    accountID = this.accountID;
    this.Account.findOneAndUpdate({ accountID }, chargeMessage);
  }

  undoDeposit(deposit, oldAccount) {
    accountID = this.accountID;
    this.Account.findOneAndUpdate({ accountID }, oldAccount);
  }
}

module.exports = DBservice;
