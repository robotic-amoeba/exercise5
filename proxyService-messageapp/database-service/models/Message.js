const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
  {
    destination: String,
    body: String,
    messageID: String,
    status: String
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

module.exports = connection => {
  return connection.model("Message", messageSchema);
};
