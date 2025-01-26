# JobDraft Property Extractor

JobDraftのスカウト情報を自動で取得し、Google Spreadsheetsに保存するツールです。

## 機能

- JobDraftへの自動アクセス
- スプレッドシートに記載されたIDからスカウト情報を取得
- OpenAI GPT-4 Optimized（gpt-4o）を使用したプロフィール情報の分析
- 取得した情報をスプレッドシートに保存
- 処理状態の管理と最終更新日時の記録

## セットアップ

1. 必要なパッケージのインストール:

主要な依存関係:
- TypeScript v5.3.3
- Puppeteer v24.1.1
- OpenAI API v4.80.1
- Google Spreadsheet v4.1.1
- Google Auth Library v9.6.3
- dotenv v16.4.1

```bash
npm install
```

2. 環境変数の設定:
`.env.example`をコピーして`.env`を作成し、必要な情報を設定してください。

```env
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email
SPREADSHEET_ID=your_spreadsheet_id
OPENAI_API_KEY=your_openai_api_key
```

3. Google Spreadsheetsの準備:
- Google Cloud Consoleでプロジェクトを作成
- Google Sheets APIを有効化
- サービスアカウントを作成し、キーを取得
- スプレッドシートを作成し、サービスアカウントと共有
- スプレッドシートの1行目に以下のヘッダーを設定

### スプレッドシートヘッダーテンプレート

以下をコピーして、スプレッドシートの1行目に貼り付けてください：

```
id,age,ambition,preferredLocation,preferredSalary,careerSummary,skills,status,lastUpdated
```

各カラムの説明：
1. 基本情報
- id: JobDraftのプロフィールID（数値）
- age: 年齢
- ambition: 野望
- preferredLocation: 希望勤務地
- preferredSalary: 希望年収

2. 経歴・スキル情報
- careerSummary: 主要な職務経歴の要約（担当プロジェクトや役割など）
- skills: 主なスキル

3. ステータス管理
- status: 処理状態（pending/processing/completed/error）
- lastUpdated: 最終更新日時

## 使用方法

1. スプレッドシートの準備:
- idカラムに取得したいプロフィールのIDを入力
- status列は空欄（pending）または「error」のデータが処理対象

2. 実行:
```bash
npm run dev
```

1. 結果の確認:
- status列で処理状態を確認（completed: 成功, error: 失敗）
- lastUpdated列で処理日時を確認
- 各カラムに取得したデータが格納されます

## 注意事項

- スプレッドシートのidカラムには数値のみを入力してください（例：12345）
- URLは自動的に `https://job-draft.jp/users/{id}` の形式で生成されます
- 処理の間隔は2秒に設定されています（サーバー負荷軽減のため）
- エラーが発生した場合でも、次のIDの処理は継続されます
- statusカラムで処理状態を確認できます（pending/processing/completed/error）
- lastUpdatedカラムで最終更新日時を確認できます
