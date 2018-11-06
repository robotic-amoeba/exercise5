const express = require("express");
const router = express.Router();
const debug = require("debug")("debug:messaging");

const DB = require("../database-service/DBmanager");
const uuidv1 = require("uuid/v1");

const axios = require("axios");
const messageAPP = axios.create({
  //baseURL: "http://messageapp:3000",
  baseURL: "http://localhost:3000",
  timeout: 3000
});

router.post("/", (req, res) => {
  const { destination, body } = req.body;

  if (!validateRequestParams(destination, body)) {
    res.status(400).send("Bad format: destination and message should be strings");
    return;
  }

  //DB.myDBservice().unlockAccount();
  debugger;
  DB.myDBservice()
    .checkAccountLock()
    .then(account => {
      if (account.locked) {
        handleRetriesOnMessaging(5, req, res);
      } else {
        handleMessagingOperation(req, res);
      }
    })
    .catch(e => console.log(e));
});

router.get("/", (req, res, next) => {
  DB.myDBservice()
    .getMessages()
    .then(messages => {
      res.status(200).send(messages);
    })
    .catch(next);
});

function handleMessagingOperation(req, res) {
  const { destination, body } = req.body;
  const messageID = uuidv1();
  const message = conformInitialMessage(destination, body, messageID);

  const storeInDB = DB.myDBservice().createMessageAttempt(message);
  const creditEnough = DB.myDBservice().checkIfEnoughCredit();

  Promise.all([storeInDB, creditEnough])
    .then(results => {
      if (results[0] && results[1]) {
        return reqToMessageAPP(destination, body).then(messageStatus => {
          debug(messageStatus);
          if ((messageStatus.code = "OK")) {
            const updateStatus = DB.myDBservice().updateMessageStatus(
              messageID,
              messageStatus.status
            );
            const chargeMessage = DB.myDBservice().chargeMessageInAccount();

            Promise.all([updateStatus, chargeMessage]).then(() => {
              DB.myDBservice().unlockAccount();
              res.status(200).send(messageStatus.status);
            });
          } else {
            DB.myDBservice()
              .updateMessageStatus(messageID, messageStatus.status)
              .then(() => {
                DB.myDBservice().unlockAccount();
                res.status(500).send(messageStatus.status);
              });
          }
        });
      } else {
        res.status(500).send("Unavailable. Check your credit and try again later");
      }
    })
    .catch(e => {
      console.log(e);
      res.status(500).send("Server error");
    });
}

function handleRetriesOnMessaging(retries, req, res) {
  DB.myDBservice()
    .checkAccountLock()
    .then(account => {
      if (account.locked && retries !== 0) {
        retries--;
        debug("retrying in handle");
        setTimeout(() => {
          handleRetriesOnMessaging(retries, req, res);
        }, 1000);
      } else if (!account.locked) {
        handleMessagingOperation(req, res);
      } else {
        res.status(500).send("Server error");
      }
    })
    .catch(e => console.log(e));
}

function validateRequestParams(destination, body) {
  if (!destination || !body) {
    return false;
  } else if (typeof destination !== "string" || typeof body !== "string") {
    return false;
  }
  return true;
}

function conformInitialMessage(destination, body, messageID) {
  const message = {
    destination,
    body,
    messageID,
    status: "Created from request"
  };
  return message;
}

function reqToMessageAPP(destination, body) {
  return messageAPP
    .post("/message", {
      destination,
      body
    })
    .then(response => {
      return (messageStatus = {
        code: "OK",
        status: `Deliver confirmed. Response: ${response.data}`
      });
    })
    .catch(error => {
      let customError;
      if (error.response || error.request) {
        customError = "Error in messageapp";
        messageStatus = { code: "KO", status: "Not sent" };
        if (error.code && error.code === "ECONNABORTED") {
          customError = "Error in messageapp. Timeout";
          messageStatus = { code: "OK", status: "Sent. Not confirmed." };
        }
      } else {
        customError = "Server error";
        messageStatus = { code: "KO", status: "Not sent" };
      }
      debug(customError);
      return messageStatus;
    });
}

module.exports = router;
