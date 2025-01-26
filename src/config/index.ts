import dotenv from "dotenv";
dotenv.config();

export const config = {
  googleSheets: {
    privateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    spreadsheetId: process.env.SPREADSHEET_ID,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
};
