import OpenAI from "openai";
import { config } from "../config/index.js";

export class LLMService {
  private client: OpenAI;

  constructor() {
    if (!config.openai.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async analyzeJobDescription(description: string): Promise<{
    requiredSkills: string[];
    benefits: string[];
    keyPoints: string[];
  }> {
    const prompt = `
以下の求人情報から、以下の情報を抽出してJSON形式で返してください：
- requiredSkills: 必要なスキルや経験のリスト
- benefits: 福利厚生や待遇のリスト
- keyPoints: その他の重要なポイントのリスト

求人情報：
${description}
`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたは求人情報を分析し、重要な情報を抽出する専門家です。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        requiredSkills: result.requiredSkills || [],
        benefits: result.benefits || [],
        keyPoints: result.keyPoints || [],
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return {
        requiredSkills: [],
        benefits: [],
        keyPoints: [],
      };
    }
  }

  async analyzeProfile(profileData: {
    age: string;
    currentCompany: string;
    jobChangeMotivation: string;
    ambition: string;
    education: string;
    careerSummary: string;
    skills: string;
  }): Promise<{
    careerHighlights: {
      highlights: {
        point: string;
        reason: string;
        impact: string;
      }[];
      summary: string;
    };
    motivationLevel: string;
    ambitionSummary: string;
  }> {
    // 経歴サマリーの詳細分析
    const careerHighlights = await this.extractCareerHighlights(profileData.careerSummary);

    console.log("Starting profile analysis with data:", {
      ...profileData,
      careerSummary: profileData.careerSummary.substring(0, 100) + "...", // 長すぎる場合のために省略
    });

    const prompt = `
以下が候補者のプロフィールです。以下の情報を分析し、JSON形式で返してください：

プロフィール情報：
年齢: ${profileData.age}
所属会社: ${profileData.currentCompany}
転職意欲: ${profileData.jobChangeMotivation}
野望: ${profileData.ambition}
最終学歴: ${profileData.education}
スキル: ${profileData.skills}
経歴サマリー: ${profileData.careerSummary}

返却フォーマット：
{
  "motivationLevel": "転職意欲レベル（1-5）",
  "ambitionSummary": "野望や目標から読み取れる将来性の分析"
}
`;

    console.log("Generated prompt for profile analysis:", prompt);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたはエンジニアの転職意欲と将来性を評価する専門家です。分析結果は必ずJSON形式で返してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        careerHighlights,
        motivationLevel: result.motivationLevel || "1",
        ambitionSummary: result.ambitionSummary || "",
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return {
        careerHighlights: {
          highlights: [],
          summary: "",
        },
        motivationLevel: "1",
        ambitionSummary: "",
      };
    }
  }

  async extractCareerHighlights(careerSummary: string): Promise<{
    highlights: {
      point: string;
      reason: string;
      impact: string;
    }[];
    summary: string;
  }> {
    console.log("Starting career highlights extraction");
    console.log("Career summary length:", careerSummary.length);
    console.log("Career summary preview:", careerSummary.substring(0, 100) + "...");

    if (!careerSummary.trim()) {
      console.warn("Career summary is empty or contains only whitespace");
      return {
        highlights: [],
        summary: "経歴サマリーが提供されていません。",
      };
    }

    const prompt = `
以下の経歴サマリーを読み、下記のポイントを着目しながら良いと思った内容を抽出して、JSON形式で返してください。
経歴の中で相対的で良いので、できるだけ空配列と空文字列は避けてください。
よく読んだ上で関連する内容がどうしても見つからない場合は、空配列のhighlightsと特筆すべきポイントはありませんでしたとsummaryに入れて返してください。
また、経歴の詳細が非公開の場合は空配列のhighlightsと詳細非公開とsummaryに入れて返してください。
・アーキテクチャなどプロダクトの初期設計に関わったことがある
・新規プロダクトの立ち上げをしている
・チームリード経験がある
・領域を絞らずフルスタック幅広く開発している
・フロントエンド、もしくはバックエンド、インフラのどこかにかなり集中して取り組んできている
・個人開発など、プロダクト開発をこれまでたくさんしている。

返却フォーマット：
{
  "highlights": [
    {
      "point": "抽出したポイント（具体的な出来事や成果）",
      "reason": "なぜ評価されるのか、その理由",
      "impact": "このポイントが示す応募者の能力や志向性"
    }
  ],
  "summary": "highlightsの内容から要約したポイント"
}

経歴サマリー：
${careerSummary}
`;

    const response = await this.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたは優秀なテクニカルリクルーターで、エンジニアの経歴を深く理解し、その価値を見出すことに長けています。

評価の際は以下の点を重視してください：
- 表面的なスキルや経験ではなく、その文脈や価値を理解する
- 技術的な深さと事業インパクトの両面から評価
- 経験から読み取れる成長性や可能性
- 組織やチームへの貢献度
- 技術選定や設計判断の妥当性

単なる事実の列挙ではなく、各経験の持つ意味や価値を解釈して提示してください。`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    try {
      console.log("Raw LLM response:", response.choices[0].message.content);

      const result = JSON.parse(response.choices[0].message.content || "{}");
      console.log("Parsed career highlights result:", result);

      if (!result.highlights && !result.summary) {
        console.warn("LLM response missing both highlights and summary");
      }

      const processedResult = {
        highlights: result.highlights || [],
        summary: result.summary || "",
      };

      console.log("Final processed career highlights:", processedResult);
      return processedResult;
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      console.error("Raw response content:", response.choices[0].message.content);
      return {
        highlights: [],
        summary: "経歴サマリーの解析中にエラーが発生しました。",
      };
    }
  }
}
