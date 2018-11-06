const express = require("express");
const router = express.Router();
const DB = require("../database-service/DBmanager");

//add security meassures here!

router.post("/", (req, res, next) => {
  const deposit = req.body.amount;
  const oldAccount = DB.myDBservice()
    .incrementCredit(deposit)
    .then(() => {
      DB.myDBbackup()
        .incrementCredit(deposit)
        .then(() => {
          res.status(200).send("Balanced updated");
        })
        .catch(e => {
          DB.myDBservice().undoDeposit(deposit, oldAccount);
          res.status(500).send("Server error");
          console.log(e);
        });
    })
    .catch(e => {
      res.status(500).send("Server error");
      console.log(e);
    });
});

module.exports = router;
