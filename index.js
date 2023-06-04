const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require('dotenv').config();

const app = express().use(bodyParser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const spreadsheetId = process.env.SPREADSHEET_ID; // Spreadsheet ID
const credentials = require("./credentials.json"); // Path to your Google Sheets API credentials file

app.listen(process.env.PORT, () => {
  console.log("Webhook is listening");
});

async function getColumnValues(sheetIndex, columnNumbers) {
  try {
    const doc = new GoogleSpreadsheet(spreadsheet);
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[sheetIndex];
    const rows = await sheet.getRows();
    const columnValues = rows.map((row) => columnNumbers.map((columnNumber) => row._rawData[columnNumber - 1]));

    return columnValues;
  } catch (error) {
    console.error("Error retrieving column values:", error);
    return null;
  }
}

const getRowByNumber = async (sheetIndex, rowNumber) => {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[sheetIndex];
  const rows = await sheet.getRows();

  if (rowNumber <= rows.length) {
    return rows[rowNumber - 1];
  } else {
    return null;
  }
};

app.get("/webhook", (req, res) => {
  // Verify the callback URL from the dashboard side - cloud API side
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode && token) {
    if (mode === "subscribe" && token === mytoken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Forbidden");
    }
  }
});

app.post("/webhook", async (req, res) => {
  const bodyParam = req.body;

  console.log(JSON.stringify(bodyParam, null, 2));

  if (bodyParam.object) {
    console.log("Inside body param");
    if (
      bodyParam.entry &&
      bodyParam.entry[0].changes &&
      bodyParam.entry[0].changes[0].value.messages &&
      bodyParam.entry[0].changes[0].value.messages[0]
    ) {
      const phoneNumberId = 114243355021165
      const from = bodyParam.entry[0].changes[0].value.messages[0].from;
      const msgBody = bodyParam.entry[0].changes[0].value.messages[0].text.body;

      console.log("Phone number: " + phoneNumberId);
      console.log("From: " + from);
      console.log("Message body: " + msgBody);

      // Whitelisted numbers
      const whitelistNumbers = ["918980802011", "919824288704", "919824499717", "919898214442", "919574999915", "917227922622", "919898638571", "919898243200"]; // Add the whitelisted phone numbers here

      if (whitelistNumbers.includes(from)) {
        if (msgBody.toLowerCase() === "hi") {
          const options = "1. DELL LAPTOPS\n2. DELL AIO + INSPIRON DESKTOP";
          axios({
            method: "POST",
            url: `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
            data: {
              messaging_product: "whatsapp",
              to: from,
              text: {
                body: options,
              },
            },
            headers: {
              "Content-Type": "application/json",
            },
          });

          res.sendStatus(200);
        } else if (msgBody === "1") {
          try {
            const sheetIndex = 0; // Index of the first sheet
            const columnNumbers = [2, 3, 4]; // Set the column numbers you want to fetch here

            const columnValues = await getColumnValues(sheetIndex, columnNumbers);

            if (columnValues) {
              let reply = "List\n";
              columnValues.forEach((row, rowIndex) => {
                reply += `${rowIndex + 1}:\t \t`;
                row.forEach((column) => {
                  reply += `${column}\t \t`;
                });
                reply += "\n";
              });

              axios({
                method: "POST",
                url: `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
                data: {
                  messaging_product: "whatsapp",
                  to: from,
                  text: {
                    body: reply,
                  },
                },
                headers: {
                  "Content-Type": "application/json",
                },
              });

              res.sendStatus(200);
            } else {
              res.sendStatus(500);
            }
          } catch (error) {
            console.error("Error:", error);
            res.sendStatus(500);
          }
        } else if (msgBody === "2") {
          try {
            const sheetIndex = 1; // Index of the second sheet
            const columnNumbers = [1, 4, 8]; // Set the column numbers you want to fetch here

            const columnValues = await getColumnValues(sheetIndex, columnNumbers);

            if (columnValues) {
              let reply = "List\n";
              columnValues.forEach((row, rowIndex) => {
                reply += `${rowIndex + 1}:\t \t`;
                row.forEach((column) => {
                  reply += `${column}\t \t`;
                });
                reply += "\n";
              });

              axios({
                method: "POST",
                url: `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
                data: {
                  messaging_product: "whatsapp",
                  to: from,
                  text: {
                    body: reply,
                  },
                },
                headers: {
                  "Content-Type": "application/json",
                },
              });

              res.sendStatus(200);
            } else {
              res.sendStatus(500);
            }
          } catch (error) {
            console.error("Error:", error);
            res.sendStatus(500);
          }
        } else {
          const selectedRowNumber = parseInt(msgBody);
          if (!isNaN(selectedRowNumber)) {
            try {
              const sheetIndex = 1; // Index of the first sheet

              const selectedRow = await getRowByNumber(sheetIndex, selectedRowNumber);

              if (selectedRow) {
                let reply = "\n";
                Object.keys(selectedRow).forEach((key) => {
                  if (key !== "_sheet" && key !== "_rowNumber" && key !== "_rawData") {
                    reply += `${key}: ${selectedRow[key]}\n`;
                  }
                });

                axios({
                  method: "POST",
                  url: `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
                  data: {
                    messaging_product: "whatsapp",
                    to: from,
                    text: {
                      body: reply,
                    },
                  },
                  headers: {
                    "Content-Type": "application/json",
                  },
                });

                res.sendStatus(200);
              } else {
                res.sendStatus(404);
              }
            } catch (error) {
              console.error("Error:", error);
              res.sendStatus(500);
            }
          } else {
            res.sendStatus(200);
          }
        }
      } else {
        // Reply with error message for non-whitelisted numbers
        axios({
          method: "POST",
          url: `https://graph.facebook.com/v13.0/${phoneNumberId}/messages?access_token=${token}`,
          data: {
            messaging_product: "whatsapp",
            to: from,
            text: {
              body: "Sorry, you are not authorized to access this service. Contact 9824288704 to get added to the whitelist.",
            },
          },
          headers: {
            "Content-Type": "application/json",
          },
        });

        res.sendStatus(200);
      }
    } else {
      res.sendStatus(404);
    }
  }
});

