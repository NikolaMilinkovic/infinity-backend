const express = require('express');
const { getSocketInstance } = require('../utils/socket');

let counter = 0;

exports.getCounter = (req, res) => {
  console.log('> GET request: Returning counter => ', counter);
  res.status(200).json(counter);
};

exports.updateCounter = (req, res) => {
  try{
    counter++;
    console.log('Counter incremented to: ', counter)

    const io = getSocketInstance();
    if(io){
      console.log('> Emiting an update to all devices for counter: ', counter);
      io.emit('counterUpdated', counter);
    }
    res.status(200).json(counter);
  } catch(err){
    console.error(err)
  }
};