class MyLearningApp {
  constructor() {
    this.rag = null;
    this.ontology = null;
    this.factChecker = null;
    this.currentAnswer = null;
    this.currentQuestion = null;
  }

  async initialize() {
    console.log("🚀 システム初期化中...");

    // データ読み込み
    const [docsRes, ontoRes] = await Promise.all([
      fetch("data/my-documents.json"),
      fetch("data/my-ontology.json"),
    ]);

    const docs = await docsRes.json();
    const onto = await ontoRes.json();

    // 各コンポーネント初期化
    this.rag = new SemanticRAGSystem();
    await this.rag.initialize(docs.documents, onto);

    this.ontology = new LearningOntology();
    await this.ontology.loadOntology(onto);

    this.factChecker = new FactChecker();

    console.log("✅ 準備完了！");
  }

  // 質問処理
  async handleQuestion(question, learnerLevel) { // learnerLevel を受け取る
    this.currentQuestion = question;

    // RAGで回答生成
    const result = await this.rag.semanticQuery(question, { learnerLevel }); // learnerLevel を渡す
    this.currentAnswer = result.answer;

    // 適応的支援を追加（ここをカスタマイズ）
    const adaptiveSupport = await this.generateAdaptiveSupport(
      question,
      result
    );

    return {
      answer: result.answer,
      sources: result.sources,
      adaptiveSupport: adaptiveSupport,
    };
  }

  // 適応的支援の生成（カスタマイズポイント）
  async generateAdaptiveSupport(question, ragResult) {
    const support = {};
    const concepts = ragResult.expandedQuery?.concepts || [];

    // 1. 前提知識チェック
    if (concepts.length > 0) {
      const prerequisites = [];
      for (const concept of concepts) {
        const prereqs = this.ontology.getPrerequisiteChain(concept);
        prerequisites.push(...prereqs);
      }
      if (prerequisites.length > 0) {
        support.prerequisites = {
          message:
            "💡 この内容を理解するには、以下の前提知識があると良いです：",
          items: [...new Set(prerequisites.map(p => this.ontology.getConcept(p.conceptId)?.label).filter(Boolean))],
        };
      }
    }

    // 2. 関連概念の提示
    if (concepts.length > 0) {
      const related = [];
      for (const concept of concepts) {
        const relatedConcepts = this.ontology.findRelatedConcepts(concept, 1);
        related.push(...relatedConcepts);
      }
      if (related.length > 0) {
        support.relatedConcepts = {
          message: "🔗 関連するトピック：",
          items: [...new Set(related.map(c => this.ontology.getConcept(c)?.label).filter(Boolean))],
        };
      }
    }

    // 3. 次のステップ
    if (concepts.length > 0) {
      const nextSteps = [];
      for (const concept of concepts) {
        const conceptData = this.ontology.getConcept(concept);
        if (conceptData?.nextSteps) {
          nextSteps.push(...conceptData.nextSteps);
        }
      }
      if (nextSteps.length > 0) {
        support.nextSteps = {
          message: "📈 次に学ぶと良いこと：",
          items: [...new Set(nextSteps)],
        };
      }
    }
    
    // 4. 確認問題とヒント
    if (ragResult.learningInfo && ragResult.learningInfo.exercises.length > 0) {
        support.exercises = {
            message: "📝 確認問題で理解を深めよう：",
            items: ragResult.learningInfo.exercises,
        };
    }

    return support;
  }

  // 結果表示
  displayResult(result, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
            <div class="result-section">
                <div class="answer-box">
                    <h3>🤖 回答</h3>
                    <p>${result.answer.replace(/\n/g, "<br>")}</p>
                </div>
        `;

    // 適応的支援の表示
    if (result.adaptiveSupport) {
      const support = result.adaptiveSupport;

      if (support.prerequisites && support.prerequisites.items.length > 0) {
        html += `
                    <div class="support-box prerequisites">
                        <p>${support.prerequisites.message}</p>
                        <ul>
                            ${support.prerequisites.items
                              .map((item) => `<li>${item}</li>`)
                              .join("")}
                        </ul>
                    </div>
                `;
      }

      if (support.relatedConcepts && support.relatedConcepts.items.length > 0) {
        html += `
                    <div class="support-box related">
                        <p>${support.relatedConcepts.message}</p>
                        <div class="concept-tags">
                            ${support.relatedConcepts.items
                              .map((item) => `<span class="tag">${item}</span>`)
                              .join("")}
                        </div>
                    </div>
                `;
      }
      
      if (support.exercises && support.exercises.items.length > 0) {
          html += `<div class="support-box exercises"><h4>${support.exercises.message}</h4>`;
          support.exercises.items.forEach((ex) => {
            html += `
                  <div class="exercise-item" data-exercise-id="${ex.id}">
                      <p><strong>Q:</strong> ${ex.question}</p>
                      <button class="hint-btn" onclick="showHint('${ex.id}')">💡 ヒントを見る</button>
                      <div class="hint-area" id="hint-${ex.id}"></div>
                  </div>
              `;
          });
          html += "</div>";
      }

      if (support.nextSteps && support.nextSteps.items.length > 0) {
        html += `
                    <div class="support-box next-steps">
                        <p>${support.nextSteps.message}</p>
                        <ul>
                            ${support.nextSteps.items
                              .map((item) => `<li>${item}</li>`)
                              .join("")}
                        </ul>
                    </div>
                `;
      }
    }

    // 検証ボタン
    html += `
                <div id="verification-area"></div>
            </div>
        `;

    container.innerHTML = html;

    // 検証UIを追加
    this.factChecker.generateVerificationUI("verification-area");
  }
}

// グローバル変数
let app;
let currentQuestion;
let currentAnswer;
const hintLevels = {}; // ヒントレベルを管理

// 初期化
document.addEventListener("DOMContentLoaded", async () => {
  app = new MyLearningApp();
  await app.initialize();
  
  const askBtn = document.getElementById("ask-btn");
  const questionInput = document.getElementById("question-input");

  askBtn.disabled = false;
  questionInput.disabled = false;

  questionInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      askQuestion();
    }
  });
});

// 質問送信
async function askQuestion() {
  const input = document.getElementById("question-input");
  const question = input.value.trim();
  if (!question) return;

  const learnerLevel = document.getElementById("learner-level").value; // 学習レベルを取得

  currentQuestion = question;
  document.getElementById("ask-btn").disabled = true;

  try {
    const result = await app.handleQuestion(question, learnerLevel); // learnerLevelを渡す
    currentAnswer = result.answer;
    app.displayResult(result, "result-container");
  } catch (error) {
    console.error("エラー:", error);
    alert("エラーが発生しました: " + error.message);
  } finally {
    document.getElementById("ask-btn").disabled = false;
  }
}

// 検証実行
async function verifyInfo(type) {
  if (!currentQuestion || !currentAnswer) return;

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "検証中...";

  try {
    let results;
    switch (type) {
      case "academic":
        results = await app.factChecker.verifyWithAcademic(currentQuestion);
        break;
      case "books":
        results = await app.factChecker.verifyWithBooks(currentQuestion);
        break;
      case "web":
        results = await app.factChecker.verifyWithWeb(currentQuestion);
        break;
    }

    const evaluation = await app.factChecker.evaluateWithSources(
      currentQuestion,
      currentAnswer,
      results
    );

    app.factChecker.displayVerificationResults(results, evaluation);
  } catch (error) {
    console.error("検証エラー:", error);
    alert("検証に失敗しました: " + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = btn.textContent.replace("検証中...", "");
  }
}

// ヒント表示
function showHint(exerciseId) {
  if (!app || !app.ontology) return;

  const currentLevel = hintLevels[exerciseId] || 0;
  const hintData = app.ontology.getHint(exerciseId, currentLevel);

  if (hintData) {
    const hintArea = document.getElementById(`hint-${exerciseId}`);
    if (hintArea) {
      const hintElement = document.createElement('p');
      hintElement.textContent = `💡 ヒント ${currentLevel + 1}: ${hintData.hint}`;
      hintArea.appendChild(hintElement);
      hintLevels[exerciseId] = currentLevel + 1;
    }

    if (!hintData.hasMoreHints) {
      const hintButton = document.querySelector(`button[onclick="showHint('${exerciseId}')"]`);
      if (hintButton) {
        hintButton.style.display = 'none';
      }
    }
  }
}