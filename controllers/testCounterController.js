const express = require('express');
const { getSocketInstance } = require('../utils/socket');
const dotenv = require('dotenv').config();

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
  } catch(error){
    console.error(error)
  }
};


exports.addImageTocontainer = (req, res) => {
  try{

    // Establishes a connection with Azure Blob Storage
    const blobServiceClient = new BlobServiceClient(`https://${process.env.ACCOUNT_NAME}.blob.core.windows.net/?${process.env.SAS_TOKEN}`);
    const containerClient = blobServiceClient.getContainerClient(process.env.general-images);

  } catch(error){
    console.error(error)
  }
}