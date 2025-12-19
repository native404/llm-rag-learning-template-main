let ragSystem;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    ragSystem = new RAGSystem();

    // 学生ID を表示
    document.getElementById('student-id').textContent = API_CONFIG.studentId;

    // 既存のサンプル文書を読み込み
    try {
        const response = await fetch('data/sample-documents.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ファイルが見つかりません`);
        }
        const data = await response.json();

        await ragSystem.initialize(data.documents);
        document.getElementById('doc-count').textContent = data.documents.length;

        console.log('✅ RAGシステム準備完了！');
    } catch (error) {
        console.error('❌ RAGシステム初期化エラー:', error);
        document.getElementById('rag-result').innerHTML = `
            <div class="system-message" style="color: red;">
                エラー: ${error.message}
            </div>
        `;
    }
});

// 質問処理
async function askRAG() {
    const question = document.getElementById('question').value.trim();

    if (!question) {
        alert('質問を入力してください');
        return;
    }

    const resultDiv = document.getElementById('rag-result');
    resultDiv.innerHTML = '<div class="rag-loading">検索中...</div>';

    try {
        const result = await ragSystem.query(question);

        // 結果を HTML で表示
        let html = `
            <div class="ai-message">
                <strong>回答:</strong><br>
                ${result.response || result}
            </div>
        `;

        // 参考文書を表示
        if (result.sources && result.sources.length > 0) {
            html += '<div style="margin-top: 15px;"><strong>参考文書:</strong></div>';
            result.sources.forEach((source, index) => {
                const text = source.document?.text || source.text || '(テキストなし)';
                const title = source.document?.metadata?.title || source.metadata?.title || `文書${index + 1}`;
                html += `
                    <div class="rag-source">
                        <strong>[${title}]</strong> (類似度: ${source.similarity?.toFixed(3) || 'N/A'})<br>
                        ${text.substring(0, 150)}...
                    </div>
                `;
            });
        }

        resultDiv.innerHTML = html;
        document.getElementById('question').value = '';

    } catch (error) {
        console.error('❌ RAG クエリエラー:', error);
        resultDiv.innerHTML = `
            <div class="system-message" style="color: red;">
                エラーが発生しました: ${error.message}
            </div>
        `;
    }
}

// Enter キーで送信
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        askRAG();
    }
}