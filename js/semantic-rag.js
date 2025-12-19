// js/semantic-rag.js - 学習支援セマンティックRAGシステム

class SemanticRAGSystem {
  constructor() {
    this.searchEngine = new HybridSearchEngine();
    this.llm = new EducationLLMClient(API_CONFIG.studentId);
    this.ontology = new LearningOntology();
    this.conceptExtractor = new ConceptExtractor();
    this.learningSupport = null;
    this.initialized = false;
  }

  async initialize(documents, ontologyData) {
    console.log("🚀 学習支援セマンティックRAGシステム初期化中...");

    try {
      await this.ontology.loadOntology(ontologyData);
      this.conceptExtractor.updateFromOntology(this.ontology);
      this.learningSupport = new LearningSupport(this.ontology);

      console.log("📄 文書をインデックス化中...");
      for (const doc of documents) {
        await this.searchEngine.addDocument(doc.content, doc);
      }
      console.log(`✅ ${documents.length}件の文書を登録完了`);

      this.initialized = true;
      console.log("✅ 学習支援セマンティックRAGシステム準備完了！");
    } catch (error) {
      console.error("❌ 初期化エラー:", error);
      throw error;
    }
  }

  async expandQuery(query) {
    console.log("🔍 クエリを拡張中:", query);

    const concepts = this.conceptExtractor.extractConcepts(query);
    const intents = this.conceptExtractor.analyzeQuestionIntent(query);
    console.log("抽出された概念:", concepts);

    const expandedConcepts = new Set(concepts);
    const synonyms = [];

    for (const concept of concepts) {
      const relatedConcepts = this.ontology.findRelatedConcepts(concept, 1);
      relatedConcepts.forEach((c) => expandedConcepts.add(c));

      const prerequisites = this.ontology.getPrerequisiteChain(concept);
      prerequisites.forEach((p) => expandedConcepts.add(p.conceptId));

      synonyms.push(...this.ontology.getSynonyms(concept));
    }

    const expandedQuery = this.buildExpandedQuery(
      query,
      expandedConcepts,
      synonyms
    );

    return {
      original: query,
      concepts: Array.from(concepts),
      intents: intents,
      expandedConcepts: Array.from(expandedConcepts),
      synonyms: synonyms,
      expandedQuery: expandedQuery,
    };
  }

  buildExpandedQuery(originalQuery, concepts, synonyms) {
    const conceptLabels = Array.from(concepts)
      .map((c) => this.ontology.getConcept(c))
      .filter((c) => c !== undefined)
      .map((c) => c.label);

    const allTerms = [...new Set([...conceptLabels, ...synonyms])];
    return `${originalQuery} ${allTerms.join(" ")}`;
  }

  async semanticQuery(question, options = {}) {
    if (!this.initialized) {
      throw new Error("システムが初期化されていません");
    }

    console.log("\n=== 学習支援セマンティック検索開始 ===");
    console.log("質問:", question);

    try {
      const expandedQuery = await this.expandQuery(question);

      const relevantDocs = await this.searchEngine.search(
        expandedQuery.expandedQuery,
        options.retrieveCount || 5,
        { vectorWeight: 0.6, bm25Weight: 0.4 }
      );

      const rerankedDocs = this.rerankWithOntology(
        relevantDocs,
        expandedQuery.concepts
      );
      const learningInfo = this.collectLearningInfo(expandedQuery);

      const context = this.buildLearningContext(
        rerankedDocs.slice(0, 3),
        expandedQuery,
        learningInfo
      );
      const prompt = this.buildLearningPrompt(
        question,
        context,
        expandedQuery,
        learningInfo,
        options.learnerLevel || "beginner" // learnerLevelを渡す
      );

      console.log("🤖 LLMで回答生成中...");
      const response = await this.llm.chat(prompt, options);

      return {
        answer: response.response,
        originalQuery: question,
        expandedQuery: expandedQuery,
        sources: rerankedDocs.slice(0, 3),
        conceptsUsed: expandedQuery.expandedConcepts,
        learningInfo: learningInfo,
        usage: response.usage,
      };
    } catch (error) {
      console.error("❌ セマンティック検索エラー:", error);
      throw error;
    }
  }

  rerankWithOntology(documents, queryConcepts) {
    return documents
      .map((doc) => {
        const docConcepts = this.conceptExtractor.extractConcepts(
          doc.document.text
        );
        const semanticScore = this.calculateSemanticRelevance(
          queryConcepts,
          docConcepts
        );

        return {
          ...doc,
          semanticScore: semanticScore,
          combinedScore:
            (doc.hybridScore || doc.similarity) * 0.7 + semanticScore * 0.3,
          docConcepts: docConcepts,
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);
  }

  calculateSemanticRelevance(queryConcepts, docConcepts) {
    let relevanceScore = 0;

    for (const queryConcept of queryConcepts) {
      for (const docConcept of docConcepts) {
        if (queryConcept === docConcept) {
          relevanceScore += 1.0;
        } else {
          const relatedConcepts = this.ontology.findRelatedConcepts(
            queryConcept,
            1
          );
          if (relatedConcepts.includes(docConcept)) {
            relevanceScore += 0.5;
          }
        }
      }
    }

    return Math.min(1.0, relevanceScore / Math.max(queryConcepts.length, 1));
  }

  collectLearningInfo(expandedQuery) {
    const info = {
      misconceptions: [],
      exercises: [],
      prerequisites: [],
      nextTopics: [],
      explanations: {},
    };

    for (const conceptId of expandedQuery.concepts) {
      const misconceptions = this.ontology.getMisconceptions(conceptId);
      info.misconceptions.push(...misconceptions.slice(0, 1));

      const exercises = this.ontology.getExercises(conceptId);
      info.exercises.push(...exercises.slice(0, 1));

      const prereqs = this.ontology.getPrerequisiteChain(conceptId);
      info.prerequisites.push(...prereqs);

      const nextTopics = this.learningSupport.getNextTopics(conceptId);
      info.nextTopics.push(...nextTopics);

      info.explanations[conceptId] = {
        beginner: this.ontology.getExplanation(conceptId, "beginner"),
        intermediate: this.ontology.getExplanation(conceptId, "intermediate"),
        advanced: this.ontology.getExplanation(conceptId, "advanced"),
      };
    }

    return info;
  }

  buildLearningContext(rerankedDocs, expandedQuery, learningInfo) {
    let context = "【参考文書】\n\n";

    rerankedDocs.forEach((doc, index) => {
      context += `[文書${index + 1}]\n${doc.document.text}\n\n`;
    });

    if (learningInfo.misconceptions.length > 0) {
      context += "\n【よくある誤解に注意】\n";
      learningInfo.misconceptions.forEach((m) => {
        context += `• ${m.wrong} → ${m.correct}\n`;
      });
    }

    context += `\n検索で使用された概念: ${expandedQuery.expandedConcepts.join(
      ", "
    )}`;

    return context;
  }

  buildLearningPrompt(
    question,
    context,
    expandedQuery,
    learningInfo,
    learnerLevel = "beginner"
  ) {
    const intentDescription = {
      definition: "定義や意味の説明",
      example: "具体例",
      howto: "方法や手順",
      why: "理由の説明",
      difference: "違いや比較",
      error: "エラーの解決",
      general: "一般的な情報",
    };

    const intents = expandedQuery.intents
      .map((i) => intentDescription[i] || i)
      .join("、");

    const levelGuide = {
      beginner:
        "初心者向けに、具体例や比喩を使って分かりやすく説明してください。専門用語は避けるか、使う場合は説明を添えてください。",
      intermediate:
        "基礎は理解している学習者向けに、技術的な詳細も含めて説明してください。",
      advanced:
        "深い理解を持つ学習者向けに、理論的背景や応用例も含めて説明してください。",
    };

    return `あなたは親切な学習支援AIです。学習者の理解を深めるために回答してください。

${context}

【学習者のレベル】
${learnerLevel}: ${levelGuide[learnerLevel] || levelGuide.beginner}

【学習者の質問意図】
${intents}

【質問】
${question}

【回答の指針】
1. 学習者のレベルと質問意図に合わせて回答してください
2. 必要に応じて具体例を含めてください
3. よくある誤解があれば注意を促してください
4. 理解を確認する簡単な問いかけで締めくくってください

回答:`;
  }

  displayRAGResult(result) {
    const container = document.getElementById("semantic-result");
    if (!container) return;

    let html = `
            <div class="learning-answer">
                <h3>🤖 AI回答:</h3>
                <div class="answer-text">${this.formatAnswer(
                  result.answer
                )}</div>

                <div class="search-info">
                    <h4>🔍 検索情報:</h4>
                    <ul>
                        <li><strong>元の質問:</strong> ${
                          result.originalQuery
                        }</li>
                        <li><strong>抽出された概念:</strong> ${
                          result.expandedQuery.concepts.join(", ") || "なし"
                        }</li>
                        <li><strong>質問の意図:</strong> ${result.expandedQuery.intents.join(
                          ", "
                        )}</li>
                    </ul>
                </div>

                <div class="sources">
                    <h4>📚 参考文書:</h4>
        `;

    result.sources.forEach((source, index) => {
      const hybridPercent = (
        (source.hybridScore || source.similarity) * 100
      ).toFixed(1);
      const vectorPercent = ((source.vectorScore || 0) * 100).toFixed(1);
      const bm25Percent = ((source.bm25ScoreNormalized || 0) * 100).toFixed(1);

      html += `
                <div class="source-doc">
                    <strong>文書${index + 1}</strong>
                    <span class="scores">
                        (総合: ${hybridPercent}%, ベクトル: ${vectorPercent}%, BM25: ${bm25Percent}%)
                    </span>
                    <p>${source.document.text.substring(0, 150)}...</p>
                </div>
            `;
    });

    html += "</div>";

    if (result.learningInfo) {
      if (result.learningInfo.misconceptions.length > 0) {
        html += `<div class="misconceptions"><h4>⚠️ よくある誤解:</h4>`;
        result.learningInfo.misconceptions.forEach((m) => {
          html += `
                        <div class="misconception-item">
                            <p><strong>❌ 誤解:</strong> ${m.wrong}</p>
                            <p><strong>✅ 正解:</strong> ${m.correct}</p>
                            <p><strong>💡 ヒント:</strong> ${m.hint}</p>
                        </div>
                    `;
        });
        html += "</div>";
      }

      if (result.learningInfo.exercises.length > 0) {
        html += `<div class="exercises"><h4>📝 確認問題:</h4>`;
        result.learningInfo.exercises.forEach((ex) => {
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

      if (result.learningInfo.nextTopics.length > 0) {
        html += `<div class="next-topics"><h4>📈 次に学ぶといい概念:</h4><ul>`;
        result.learningInfo.nextTopics.slice(0, 3).forEach((topic) => {
          html += `<li>${topic.label} - ${topic.reason}</li>`;
        });
        html += "</ul></div>";
      }
    }

    html += `
            <div class="usage">
                <small>使用トークン: ${
                  result.usage?.total_tokens || "-"
                }</small>
            </div>
        </div>`;

    container.innerHTML = html;
  }

  formatAnswer(text) {
    return text.replace(/\n/g, "<br>");
  }
}