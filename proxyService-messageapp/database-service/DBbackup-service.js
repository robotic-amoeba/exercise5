const DB = require("./DBservice");
const DBschema = DB.DBschema;

class DBbackup extends DBschema {
  constructor(DBurl, accountID) {
    this.conection = mongoose
      .connect(
        DBurl,
        { useNewUrlParser: true }
      )
      .then(x => {
        console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`);
      })
      .catch(err => {
        console.error("Error connecting to mongo", err);
      });
  }
}

myDBbackup = new DBbackup("mongodb://localhost:28018/messagingCabify");
module.exports = myDBbackup;
