const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { GoogleSpreadsheet } = require("google-spreadsheet");
require('dotenv').config();

const app = express().use(bodyParser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN;
const spreadsheetId = process.env.SPREADSHEET_ID;
const credentials = require("./credentials.json"); // Path to your Google Sheets API credentials file

app.listen(process.env.PORT, () => {
  console.log("Webhook is listening");
});

async function getColumnValues(columnNumber) {
  try {
    const doc = new GoogleSpreadsheet(spreadsheetId);
    await doc.useServiceAccountAuth(credentials);
    await doc.loadInfo();

    const sheet = doc.sheetsByIndex[0]; // Assuming the data is in the first sheet
    const rows = await sheet.getRows();
    const columnValues = rows.map((row) => row._rawData[columnNumber - 1]);

    return columnValues;
  } catch (error) {
    console.error("Error retrieving column values:", error);
    return null;
  }
}


const getRowByNumber = async (rowNumber) => {
  const doc = new GoogleSpreadsheet(spreadsheetId);
  await doc.useServiceAccountAuth(credentials);
  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0]; // Assuming the data is in the first sheet
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
      const phoneNumberId = 116001314843954
      const from = bodyParam.entry[0].changes[0].value.messages[0].from;
      const msgBody = bodyParam.entry[0].changes[0].value.messages[0].text.body;

      console.log("Phone number: " + phoneNumberId);
      console.log("From: " + from);
      console.log("Message body: " + msgBody);

      if (msgBody.toLowerCase() === "hi") {
        try {
          const columnNumber = 2; // Set the default column number here

          const columnValues = await getColumnValues(columnNumber);

          if (columnValues) {
            let reply = "Default Column:\n";
            columnValues.forEach((value, index) => {
              reply += `${index + 1}. ${value}\n`;
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
            const selectedRow = await getRowByNumber(selectedRowNumber);

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
      res.sendStatus(404);
    }
  }
});

app.get("/", (req, res) => {
  res.status(200).send("Hello, this is webhook setup");
});
