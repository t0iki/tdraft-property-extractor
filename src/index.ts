import { BrowserService } from "./services/browser.js";
import { SpreadsheetService } from "./services/spreadsheet.js";
import { LLMService } from "./services/llm.js";

async function main() {
  const browser = new BrowserService();

  try {
    // サービスの初期化
    const spreadsheet = new SpreadsheetService();
    const llm = new LLMService();

    console.log("Initializing services...");
    await browser.init();
    await spreadsheet.init();

    // IDリストの取得
    console.log("Fetching IDs from spreadsheet...");
    const ids = await spreadsheet.getIds();

    // 各IDの処理
    for (const [index, id] of ids.entries()) {
      try {
        console.log(`Processing ID ${index + 1}/${ids.length}: ${id}`);

        // 行の検索
        const row = await spreadsheet.findRowById(id);
        if (!row) {
          console.error(`Row not found for ID: ${id}`);
          continue;
        }

        // ステータスを処理中に更新
        await spreadsheet.updateStatus(row.index, "processing");

        // プロフィール情報の取得
        console.log("Extracting profile data...");
        const profileData = await browser.extractDataFromId(id);

        // プロフィール情報の分析
        console.log("Analyzing profile with LLM...");
        const profileAnalysis = await llm.analyzeProfile({
          age: profileData.age || "",
          currentCompany: profileData.currentCompany || "",
          jobChangeMotivation: profileData.jobChangeMotivation || "",
          ambition: profileData.ambition || "",
          education: profileData.education || "",
          careerSummary: profileData.careerSummary || "",
          skills: profileData.skills || "",
        });

        // スプレッドシートの更新
        console.log("Updating spreadsheet...");
        await spreadsheet.updateRow(row.index, {
          id,
          ...profileData,
          careerSummaryHighlights: JSON.stringify(profileAnalysis.careerHighlights.highlights),
          careerSummaryAnalysis: profileAnalysis.careerHighlights.summary,
          motivationLevel: profileAnalysis.motivationLevel,
          ambitionSummary: profileAnalysis.ambitionSummary,
          recommendPoint: profileAnalysis.careerHighlights.point.toString(),
          status: "completed",
        });

        console.log("Profile processed successfully");

        // 処理間隔を設ける（サーバー負荷軽減のため）
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing ID ${id}:`, error);
        // エラー時はステータスを更新
        const row = await spreadsheet.findRowById(id);
        if (row) {
          await spreadsheet.updateStatus(row.index, "error");
        }
        continue; // エラーが発生しても次のIDの処理を続行
      }
    }

    console.log("All IDs processed successfully");
  } catch (error) {
    console.error("Application error:", error);
    throw error;
  } finally {
    // ブラウザのクリーンアップ
    await browser.close();
  }
}

// アプリケーションの実行
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
