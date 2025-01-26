import puppeteer, { Browser, Page } from "puppeteer";
import { LLMService } from "./llm.js";

export class BrowserService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 800 },
    });
    this.page = await this.browser.newPage();
  }

  private generateUrl(id: string): string {
    return `https://job-draft.jp/users/${id}`;
  }

  async extractDataFromId(id: string): Promise<Record<string, string>> {
    if (!this.page) throw new Error("Browser not initialized");

    const url = this.generateUrl(id);
    await this.page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    try {
      // ログインページへのリダイレクトをチェック
      const loginForm = await this.page.$(".sign-in-form");
      if (loginForm) {
        throw new Error("ログインが必要なページです");
      }

      // DOMの読み込み完了を待つ
      await this.page.waitForFunction(() => document.readyState === "complete", { timeout: 60000 });

      // ページ内容のデバッグ出力
      const pageContent = await this.page.content();
      console.log("Page content length:", pageContent.length);
      console.log("Looking for .p-resume-header...");

      try {
        // レジュメヘッダーの存在を確認（タイムアウト時間を延長）
        await this.page.waitForSelector(".p-resume-header", {
          timeout: 120000, // 2分に延長
          visible: false,
        });
      } catch (error) {
        console.error("Failed to find .p-resume-header");
        console.error("Current URL:", await this.page.url());
        throw error;
      }

      console.log("Found .p-resume-header, looking for .ibox...");

      // iboxの存在を確認（タイムアウト時間を延長）
      try {
        await this.page.waitForSelector(".ibox", {
          timeout: 120000, // 2分に延長
          visible: true,
        });
      } catch (error) {
        console.error("Failed to find .ibox");
        console.error("Current URL:", await this.page.url());
        throw error;
      }

      console.log("Found .ibox, proceeding with data extraction...");
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes("ログイン")) {
        console.error(`ログインが必要です: ${url}`);
      } else if (error instanceof Error) {
        console.error(`データの取得に失敗しました: ${url}\nエラー: ${error.message}`);
      } else {
        console.error(`不明なエラーが発生しました: ${url}`);
      }
      throw error;
    }

    const data = await this.page.evaluate(() => {
      // 基本プロフィール情報の取得
      const iboxes = Array.from(document.querySelectorAll(".ibox"));
      const basicProfileBox = iboxes.find((box) => box.querySelector(".c-heading-text")?.textContent?.includes("基本プロフィール"));

      const basicInfo: Record<string, string> = {};
      if (basicProfileBox) {
        const rows = Array.from(basicProfileBox.querySelectorAll(".row.m-b"));
        rows.forEach((row) => {
          const label = row.querySelector(".font-bold")?.textContent?.trim();
          const value = row.querySelector(".col-lg-8")?.textContent?.trim();
          if (label && value && value !== "未入力です" && value !== "未入力") {
            basicInfo[label] = value;
          }
        });
      }

      // 野望の取得
      const ambitionBox = iboxes.find((box) => box.querySelector(".c-heading-text")?.textContent?.includes("3年後の目標や野望"));
      const ambition = ambitionBox?.querySelector(".ibox-content p")?.textContent?.trim() || "";

      // スキルの取得（全iboxから.c-tag--s-roundedを収集）
      const skillTags = Array.from(document.querySelectorAll(".c-tag--s-rounded")).map((tag) => tag.textContent?.trim() || "");
      const uniqueSkills = Array.from(new Set(skillTags)).filter(Boolean);

      // 希望勤務地と希望年収を取得
      const rows = Array.from(document.querySelectorAll(".ibox-content .row"));
      const preferredLocation =
        rows
          .find((row) => row.querySelector(".font-bold")?.textContent?.includes("希望勤務地"))
          ?.querySelector(".col-lg-8")
          ?.textContent?.trim() || "";

      const preferredSalary =
        rows
          .find((row) => row.querySelector(".font-bold")?.textContent?.includes("希望年収"))
          ?.querySelector(".col-lg-8")
          ?.textContent?.trim() || "";

      // 職務経歴の取得
      const careerBoxes = iboxes.filter((box) => box.querySelector(".c-heading-text")?.textContent?.includes("職務経歴"));

      // 全ての職務経歴テキストを結合
      const careerText = careerBoxes
        .map((box) => box.querySelector(".markdown-style")?.textContent?.trim() || "")
        .filter(Boolean)
        .join("\n\n");

      return {
        age: basicInfo["年齢"] || "",
        ambition: `${ambition}`,
        skills: uniqueSkills.join(", "),
        preferredLocation,
        preferredSalary,
        careerText,
      };
    });

    // LLMServiceを使用して職務経歴を分析
    const careerAnalysis = await this.llmService.extractCareerHighlights(data.careerText);

    return {
      age: data.age,
      ambition: data.ambition,
      skills: data.skills,
      preferredLocation: data.preferredLocation,
      preferredSalary: data.preferredSalary,
      careerSummary: careerAnalysis.summary,
      recommendPoint: String(careerAnalysis.point),
    };
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}
