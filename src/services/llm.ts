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
      model: "chatgpt-4o-latest",
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
      point: number;
    };
    motivationLevel: string;
    ambitionSummary: string;
  }> {
    // 経歴サマリーの詳細分析
    const careerHighlights = await this.extractCareerHighlights(profileData.careerSummary);

    const prompt = `
以下のプロフィール情報を分析し、以下の情報を抽出・評価してJSON形式で返してください：

- motivationLevel: 転職意欲の強さを5段階で評価（1: 非常に低い ～ 5: 非常に高い）
- ambitionSummary: 野望や目標の要約（100文字程度）

プロフィール情報：
年齢: ${profileData.age}
所属会社: ${profileData.currentCompany}
転職意欲: ${profileData.jobChangeMotivation}
野望: ${profileData.ambition}
最終学歴: ${profileData.education}
スキル: ${profileData.skills}
`;

    const response = await this.client.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: "あなたはエンジニアの転職意欲と将来性を評価する専門家です。",
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
          point: -1,
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
    point: number;
  }> {
    const prompt = `
以下の経歴サマリーを詳細に分析し、特に評価が高くなりそうな内容を抽出してJSON形式で返してください。

分析の観点：
1. インパクトのある成果
   - 事業への貢献度
   - 技術的な革新性
   - チームや組織への影響

2. 技術力の証明
   - 複雑な技術課題の解決
   - 新技術の導入や最適化
   - アーキテクチャ設計の妥当性

3. 成長性・ポテンシャル
   - 学習能力や適応力
   - 責任範囲の拡大
   - キャリアの一貫性

4. リーダーシップ・影響力
   - チームマネジメント
   - メンタリング
   - 組織改善への貢献

返却フォーマット：
{
  "highlights": [
    {
      "point": "抽出したアピールポイント（具体的な出来事や成果）",
      "reason": "なぜこれが評価されるのか、その理由と背景",
      "impact": "このポイントが示す応募者の能力や将来性"
    }
  ],
  "summary": "全体を通して見た応募者の強み（200文字程度）"
  "point": "summaryの内容から判断するエンジニアが20人未満の小規模な事業会社で活躍できそう度(10段階)"
}

経歴サマリー：
${careerSummary}
`;

    const response = await this.client.chat.completions.create({
      model: "chatgpt-4o-latest",
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
      const result = JSON.parse(response.choices[0].message.content || "{}");
      return {
        highlights: result.highlights || [],
        summary: result.summary || "",
        point: result.point || -1,
      };
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return {
        highlights: [],
        summary: "",
        point: -1,
      };
    }
  }
}
