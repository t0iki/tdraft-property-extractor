# JobDraft Property Extractor プロジェクト概要

## プロジェクトの目的
JobDraftのスカウト情報を自動で取得し、Google Spreadsheetsに保存するツール。スカウト情報はOpenAI GPT-4によって分析され、構造化されたデータとして保存されます。

## システム構成

### 技術スタック
- 言語: TypeScript (v5.3.3)
- 主要ライブラリ:
  - puppeteer (v24.1.1): Webスクレイピング
  - google-spreadsheet (v4.1.1): Google Sheets操作
  - openai (v4.80.1): GPT-4 API利用
  - dotenv (v16.4.1): 環境変数管理
  - google-auth-library (v9.6.3): Google認証

### ディレクトリ構造
```
src/
├── config/
│   └── index.ts      # 環境変数と設定の管理
├── services/
│   ├── browser.ts    # Puppeteerによるスクレイピング
│   ├── llm.ts        # OpenAI GPT-4による分析
│   └── spreadsheet.ts # Google Sheets操作
└── index.ts          # メインアプリケーション
```

## 主要コンポーネント

### 1. BrowserService (browser.ts)
- Puppeteerを使用したWebスクレイピング
- 主な機能:
  - IDからURLを生成（https://job-draft.jp/users/{id}）
  - プロフィールページからのデータ抽出
  - 取得データ:
    - 基本情報（年齢）
    - 野望と目標
    - 希望勤務地
    - 希望年収
    - 職務経歴（主要な担当プロジェクトや役割）
    - スキル

### 2. LLMService (llm.ts)
- OpenAI GPT-4 Optimizedを使用したプロフィール情報の分析（gpt-4o）
- 分析内容:
  - キャリアレベルの評価
  - 強みの分析

### 3. SpreadsheetService (spreadsheet.ts)
- Google Sheetsとの連携
- 主な機能:
  - スプレッドシートからIDリストの取得
  - プロフィール情報と分析結果の保存
  - 行単位でのデータ管理
  - ステータス管理（pending/processing/completed/error）
  - 最終更新日時の記録

## データフロー
1. スプレッドシートからプロフィールIDを取得
2. IDからURLを生成し（https://job-draft.jp/users/{id}）、Puppeteerでアクセスしプロフィール情報を抽出
3. GPT-4でプロフィール情報を分析・構造化
4. 分析結果をスプレッドシートに保存
5. 処理状態と最終更新日時を更新

## 環境設定
必要な環境変数:
- GOOGLE_SHEETS_PRIVATE_KEY: Google Sheets API用の秘密鍵
- GOOGLE_SHEETS_CLIENT_EMAIL: サービスアカウントのメールアドレス
- SPREADSHEET_ID: 対象のスプレッドシートID
- OPENAI_API_KEY: OpenAI APIキー

## スプレッドシート構造
必要なカラム:
1. 基本情報
- id: JobDraftのプロフィールID
- age: 年齢
- ambition: 野望
- preferredLocation: 希望勤務地
- preferredSalary: 希望年収

2. 経歴・スキル情報
- careerSummary: 主要な職務経歴の要約（担当プロジェクトや役割など）
- skills: 主なスキル

3. LLM分析結果
- careerLevel: キャリアレベル評価
- strengthPoints: 強みとなるポイント

4. ステータス管理
- status: 処理状態（pending/processing/completed/error）
- lastUpdated: 最終更新日時

## エラーハンドリング
- 各IDの処理は独立して実行
- エラーが発生しても次のIDの処理を継続
- エラー発生時はステータスを'error'に更新
- エラーログの出力と適切なエラーメッセージの提供

## パフォーマンス考慮事項
- スクレイピング間隔: 2秒（サーバー負荷軽減）
- ブラウザの自動クリーンアップ
- 非同期処理の適切な管理
- 処理状態の追跡による重複処理の防止

## 実行方法
開発モード:
```bash
npm run dev
```

本番実行:
```bash
npm run build
npm start
