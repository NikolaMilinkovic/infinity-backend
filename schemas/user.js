const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, 'Please enter a valid username'],
      unique: [true, 'Username already registered'],
    },
    password: {
      type: String,
      required: [true, 'Please enter a valid password'],
    },
    role: {
      type: String,
      required: [true, 'Please enter a valid role'],
      default: 'admin',
    },
    pushToken: {
      type: String,
      required: false,
    },
    permissions: {},
    settings: {
      defaults: {
        courier: {
          type: String,
          required: false,
          default: '',
        },
        listProductsBy: {
          type: String,
          required: false,
          default: 'category',
        },
        theme: {
          type: String,
          required: false,
          default: 'light',
        },
      },
      language: {
        type: String,
        required: false,
        default: 'srb',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
