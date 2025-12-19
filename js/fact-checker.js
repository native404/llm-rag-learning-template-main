class FactChecker {
  constructor() {
    this.webSearch = new WebSearchClient();
    this.llm = new EducationLLMClient(API_CONFIG.studentId);
  }

  // 論文・学術情報で検証
  async verifyWithAcademic(query) {
    const academicQuery = `${query} 論文 研究 学術`;
    const results = await this.webSearch.search(academicQuery);
    return {
      type: "academic",
      query: academicQuery,
      results: results.results,
      retrievedAt: results.retrievedAt,
    };
  }

  // 書籍で検証
  async verifyWithBooks(query) {
    const bookQuery = `${query} 書籍 本 入門`;
    const results = await this.webSearch.search(bookQuery);
    return {
      type: "books",
      query: bookQuery,
      results: results.results,
      retrievedAt: results.retrievedAt,
    };
  }

  // 一般Webで検証
  async verifyWithWeb(query) {
    const results = await this.webSearch.search(query);
    return {
      type: "web",
      query: query,
      results: results.results,
      retrievedAt: results.retrievedAt,
    };
  }

  // 検証結果を踏まえて再評価
  async evaluateWithSources(originalQuestion, originalAnswer, searchResults) {
    const sourceSummary = searchResults.results
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`)
      .join("\n");

    const prompt = `
あなたは情報の正確性を評価する専門家です。

【元の質問】
${originalQuestion}

【AIの回答】
${originalAnswer}

【検索で見つかった情報】
${sourceSummary}

【タスク】
1. 元の回答が正確かどうか評価してください
2. 検索結果と矛盾する点があれば指摘してください
3. より正確な情報があれば補足してください

【回答形式】
・正確性: ○正確 / △一部不正確 / ×不正確
・評価コメント: （理由を簡潔に）
・補足情報: （あれば）
`;

    const response = await this.llm.chat(prompt);
    return {
      evaluation: response.response,
      sources: searchResults.results.slice(0, 3),
      retrievedAt: searchResults.retrievedAt,
    };
  }

  // 検証ボタンのUIを生成
  generateVerificationUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
            <div class="verification-section">
                <p class="verification-prompt">💡 この情報を検証したいですか？</p>
                <div class="verification-buttons">
                    <button class="verify-btn" onclick="verifyInfo('academic')">
                        📄 論文で検証
                    </button>
                    <button class="verify-btn" onclick="verifyInfo('books')">
                        📚 書籍で検証
                    </button>
                    <button class="verify-btn" onclick="verifyInfo('web')">
                        🌐 Webで検証
                    </button>
                </div>
                <div id="verification-results"></div>
            </div>
        `;
  }

  // 検証結果を表示
  displayVerificationResults(results, evaluation) {
    const container = document.getElementById("verification-results");
    if (!container) return;

    container.innerHTML = `
            <div class="verification-result">
                <h4>🔍 検証結果</h4>
                <p class="retrieved-at">取得日時: ${new Date(
                  results.retrievedAt
                ).toLocaleString("ja-JP")}</p>
                
                <div class="sources-list">
                    ${results.results
                      .slice(0, 3)
                      .map(
                        (r, i) => `
                        <div class="source-item">
                            <strong>${i + 1}. ${r.title}</strong>
                            <p>${r.snippet}</p>
                            <a href="${r.url}" target="_blank">🔗 詳細を見る</a>
                        </div>
                    `
                      )
                      .join("")}
                </div>

                ${
                  evaluation
                    ? `
                    <div class="evaluation">
                        <h4>📋 評価</h4>
                        <div class="evaluation-content">
                            ${evaluation.evaluation.replace(/\n/g, "<br>")}
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  }
}