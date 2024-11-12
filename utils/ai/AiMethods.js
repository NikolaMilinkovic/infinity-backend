const OpenAI = require('openai');
const { betterConsoleLog } = require('../logMethods');
const dotenv = require('dotenv').config();


async function parseOrderData(data){
  const openai = new OpenAI({
    apikey: process.env.OPENAI_API_KEY,
    organization: process.env.ORGANIZATION,
    project: process.env.PROJECT_ID,
  });
  // Authorization: Bearer OPENAI_API_KEY

  const completion = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
          { role: "system", content: "You extract name, address, place (can be a city, region etc.), phone number and secondary phone number if present into JSON data. You return nothing else except the json object" },
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
                        description: "Buyers address that appears in the input, do not place city name or region in here, if not provided return null for that field. Example: Cara Dušana 19, 26340 Kruščica, this field accepts the Cara Dušana 19"
                      },
                      place: {
                        description: "Buyers place that appears in the input, it can be a city, region or something else, it is not address, street name, postal number or house/apartment number do not go into this field, never put number in this field, if not provided return null for that field."
                      },
                      phone: {
                        description: "Buyers phone number that appears in the input, if not provided return null for that field, remove all empty spaces from phone number if there are any.",
                        type: Number
                      },
                      phone2: {
                        description: "Buyers secondary phone number that might appear in the input, if not provided return null for that field, remove all empty spaces from phone number if there are any.",
                        type: Number
                      }
                  },
                  additionalProperties: false
              }
          }
      }
  });

  console.log('> Returning GPT data')
  console.log(completion.choices[0].message.content);
  return completion.choices[0].message.content
}

module.exports = { parseOrderData };