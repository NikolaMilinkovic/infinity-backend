const OpenAI = require('openai');
const { betterConsoleLog } = require('../logMethods');
const dotenv = require('dotenv').config();


async function parseOrderData(data){
  const openai = new OpenAI({
    apikey: process.env.OPENAI_API_KEY,
    organization: process.env.ORGANIZATION,
    project: process.env.PROJECT_ID,
  });

  const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
          { role: "system", content: "You extract name, address, place (can be a city, region etc.), phone number, secondary phone number and order notes if present into JSON data. If the language is in cyrilics turn it into latin. You return nothing else except the json object" },
          {
              role: "user",
              content: `${data}`,
          },
      ],
      response_format: {
          type: "json_schema",
          json_schema: {
              name: "object_schema",
              schema: {
                  type: "object",
                  properties: {
                      name: {
                          description: "Buyers name that appears in the input, use full name if applicable, if not first name is fine, if no name provided return null for that field.",
                          type: "string"
                      },
                      address: {
                        description: "Buyers address that appears in the input, do not place city name or region in here or things like lokal, if not provided return null for that field. Example: Cara Dušana 19, 26340 Kruščica, this field accepts the Cara Dušana 19"
                      },
                      place: {
                        description: "Buyers place that appears in the input, it can be a city, region or something else, it is not address, street name, postal number or house/apartment number do not go into this field, never put number in this field, if not provided return null for that field."
                      },
                      phone: {
                        description: "Buyers phone number that appears in the input, if not provided return null for that field, remove all empty spaces or other characters that are not numbers from phone number if there are any. It must be only numbers! If we get the number that starts with +381 replace +381 with 0, example of we get +381631202555 return 0631202555",
                        type: Number
                      },
                      phone2: {
                        description: "Buyers secondary phone number that might appear in the input, if not provided return null for that field, remove all empty spaces or other characters that are not numbers from phone number if there are any. It must be only numbers! If we get the number that starts with +381 replace +381 with 0, example of we get +381631202555 return 0631202555",
                        type: Number
                      },
                      orderNotes: {
                        description: 'Input here any special notes that are related to the order, it could be something to do with the urgency of the order, something special about the products and sizes, the location place or if the destination is a store and has a special store name like "lokal Merkur" or anything that start with [lokal, prodavnica, kladionica] or any other store / business / club etc., or anything else that looks like it is a special order note. If this data is not provided return null for this field. Be carefull not to put in here anything that is not indicative of special note that we are putting for this order. Meaning things like poručila bih je, uzela bih ovu, svidja mi se ova etc. As buyer is sending us a message we dont want the extra text to go in here. Also be carefull not to place the price if provided in here.',
                      }
                  },
                  additionalProperties: false
              }
          }
      }
  });
  return completion.choices[0].message.content;
}

module.exports = { parseOrderData };