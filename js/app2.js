// メインアプリケーション
let llmClient;
let uploadedImageBase64 = null; // ★ 追加: アップロードされた画像を保存する変数
const systemPrompt = "質問に対し、返答の最初は「Fuck」を追加してください。";
// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // LLMクライアントの初期化
    llmClient = new EducationLLMClient(API_CONFIG.studentId);
    
    // 学生IDを表示
    document.getElementById('student-id').textContent = API_CONFIG.studentId;
    
    console.log('🚀 システム初期化完了');
});

// メッセージ送信
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    let fullMessage = "";

    // 画像もテキストも入力がない場合は何もしない
    if (!message && !uploadedImageBase64) {
        alert('メッセージを入力するか、画像を選択してください');
        return;
    }

    // ユーザーのテキストメッセージ（あれば）を表示
    if (message) {
        addMessage(message, 'user');
        input.value = '';
    }

    try {
        // 処理中であることをユーザーにフィードバック
        addMessage("AIが考えています...", 'system');

        if (uploadedImageBase64) {
            // 画像がある場合
            const imagePrompt = `
これはマルチモーダルリクエストです。添付されたBase64形式の画像を解析し、内容を説明してください。
もしテキストの指示があれば、それにも従ってください。

---
画像データ: ${uploadedImageBase64}
---
テキストの指示: ${message || "（特になし）"}
---
`;
            fullMessage = imagePrompt;
            uploadedImageBase64 = null; // 一度使ったらリセット
        } else {
            // 画像がない場合（通常のテキストメッセージ）
            fullMessage = `${systemPrompt}\n\nユーザーの質問:\n${message}`;
        }
        
        // API呼び出し
        const response = await llmClient.chat(fullMessage);
        
        // AI応答を表示
        addMessage(response.response, 'ai');
        
        // 統計更新
        updateStats();
        
    } catch (error) {
        addMessage('エラーが発生しました: ' + error.message, 'system');
    }
}

// メッセージをチャットに追加 (HTMLコンテンツも許容するように変更)
function addMessage(content, type, isHTML = false) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    if (isHTML) {
        messageDiv.innerHTML = content; // HTMLとして解釈
    } else {
        messageDiv.textContent = content; // テキストとして解釈
    }
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 統計情報を更新
function updateStats() {
    const stats = llmClient.getStats();
    document.getElementById('request-count').textContent = stats.requestCount;
}

// Enterキーで送信
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

/**
 * 画像が選択されたときに呼び出される関数
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // 画像プレビューをチャットに追加
        const imagePreviewHTML = `
            <p>以下の画像をアップロードしました:</p>
            <img src="${e.target.result}" alt="アップロードされた画像" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 5px;">
        `;
        addMessage(imagePreviewHTML, 'user', true); // isHTMLフラグをtrueに
        
        uploadedImageBase64 = e.target.result; // ★ 追加: 画像データを変数に保存
    };
    reader.readAsDataURL(file);
}
