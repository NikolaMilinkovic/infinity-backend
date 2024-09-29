const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type:String, required: [true, 'Please enter a valid username'], unique: [true, 'Username already registered'] },
  password: { type:String, required: [true, 'Please enter a valid password'] },
  role: { type:String, requred: [true, 'Please enter a valid role'], default: 'admin' },
  token: { type:String, required: [true, 'Please provide a valid token'] }
});

module.exports = mongoose.model("User", UserSchema);