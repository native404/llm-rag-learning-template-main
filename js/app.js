// メインアプリケーション
let llmClient;

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
    
    if (!message) {
        alert('メッセージを入力してください');
        return;
    }
    
    // ユーザーメッセージを表示
    addMessage(message, 'user');
    input.value = '';
    
    try {
        // API呼び出し
        const response = await llmClient.chat(message);
        
        // AI応答を表示
        addMessage(response.response, 'ai');
        
        // 統計更新
        updateStats();
        
    } catch (error) {
        addMessage('エラーが発生しました: ' + error.message, 'system');
    }
}

// メッセージをチャットに追加
function addMessage(text, type) {
    const messagesDiv = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = text;
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