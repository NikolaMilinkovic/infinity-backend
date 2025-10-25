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
    name: {
      type: String,
      required: false,
      default: '',
    },
    pushToken: {
      type: String,
      required: false,
    },
    permissions: {
      navigation: {
        lista_artikla: { type: Boolean, required: false, default: true },
        porudzbine_rezervacije: { type: Boolean, required: false, default: true },
        boje_kategorije_dobavljaci: { type: Boolean, required: false, default: true },
        kuriri: { type: Boolean, required: false, default: true },
        dodaj_artikal: { type: Boolean, required: false, default: true },
        upravljanje_korisnicima: { type: Boolean, required: false, default: true },
        podesavanja: { type: Boolean, required: false, default: true },
        zavrsi_dan: { type: Boolean, required: false, default: true },
        admin_dashboard: { type: Boolean, required: false, default: false },
        global_dashboard: { type: Boolean, required: false, default: false },
      },
      products: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
      orders: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
      packaging: {
        check: { type: Boolean, required: false, default: true },
        finish_packaging: { type: Boolean, required: false, default: true },
      },
      colors: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
      categories: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
      suppliers: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
      couriers: {
        create: { type: Boolean, required: false, default: true },
        update: { type: Boolean, required: false, default: true },
        delete: { type: Boolean, required: false, default: true },
      },
    },
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
