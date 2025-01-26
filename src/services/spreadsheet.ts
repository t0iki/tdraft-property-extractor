import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { config } from "../config/index.js";

type RowData = {
  id: string;
  age?: string;
  currentCompany?: string;
  jobChangeMotivation?: string;
  ambition?: string;
  education?: string;
  careerSummary?: string;
  skills?: string;
  // 分析結果
  careerSummaryHighlights?: string; // JSON文字列として保存
  careerSummaryAnalysis?: string; // 全体の要約
  motivationLevel?: string;
  ambitionSummary?: string;
  recommendPoint?: string; // 推薦度（数値を文字列として保存）
  // ステータス管理
  status?: string;
  lastUpdated?: string;
  [key: string]: string | undefined;
};

export class SpreadsheetService {
  private doc: GoogleSpreadsheet;

  constructor() {
    if (!config.googleSheets.spreadsheetId) {
      throw new Error("Spreadsheet ID is required");
    }
    this.doc = new GoogleSpreadsheet(
      config.googleSheets.spreadsheetId,
      new JWT({
        email: config.googleSheets.clientEmail,
        key: config.googleSheets.privateKey,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      })
    );
  }

  async init(): Promise<void> {
    try {
      await this.doc.loadInfo();
    } catch (error) {
      console.error("Failed to initialize spreadsheet:", error);
      if (error instanceof Error) {
        throw new Error(`Spreadsheet initialization failed: ${error.message}`);
      }
      throw error;
    }
  }

  async getIds(): Promise<string[]> {
    const sheet = this.doc.sheetsByIndex[0];
    const rows = await sheet.getRows();
    const ids: string[] = [];

    for (const row of rows) {
      const id = row.toObject()["id"];
      const status = row.toObject()["status"];
      // statusがない場合やpendingの場合のみ処理対象とする
      if (id && (!status || status === "pending")) {
        ids.push(id);
      }
    }

    return ids;
  }

  async updateRow(index: number, data: RowData): Promise<void> {
    const sheet = this.doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    if (index >= rows.length) {
      throw new Error("Row index out of bounds");
    }

    const row = rows[index];
    // 最終更新日時を追加
    data.lastUpdated = new Date().toISOString();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        row.set(key, value);
      }
    });

    await row.save();
  }

  async findRowById(id: string): Promise<{ index: number; data: RowData } | null> {
    const sheet = this.doc.sheetsByIndex[0];
    const rows = await sheet.getRows();

    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i].toObject() as RowData;
      if (rowData.id === id) {
        return {
          index: i,
          data: rowData,
        };
      }
    }

    return null;
  }

  async updateStatus(index: number, status: string): Promise<void> {
    await this.updateRow(index, {
      id: "", // この値は上書きされない
      status,
      lastUpdated: new Date().toISOString(),
    });
  }
}
